# Plan 13: Fast setup and background enrichment

## Objective

Let the user reach first value quickly. Move nonessential strategy expansion into a durable, resumable, non-blocking background job while the main chat is fully usable.

## Dependency

Plan 12. The basic strategy must be already **committed** through review before any enrichment runs. This plan must not bypass review.

## Reading list

- `electron/main/index.ts` (onboarding lifecycle, active run map at ~line 909, chat typed-transporter pattern at `chat:send` / `chat:stop`)
- `electron/main/agent.ts` (streaming loop, `abortController`, `abortableSleep`, transient retry — enrichment reuses this shape)
- `electron/main/onboarding-run.ts` / `onboarding-checkpoint-store.ts` (revision-guarded persistence pattern)
- `electron/main/onboarding-repair.ts` (bounded scoped tool selection + step budget)
- `electron/main/onboarding-readiness.ts` (validator; basic vs full readiness)
- `electron/main/tools.ts` (capability metadata; enrichment must stay within `strategy-write` and reads only)
- `electron/main/db.ts` / `db-migrations.ts` (next migration is **version 8**; gap rule enforced)
- `electron/main/backup.ts` / `docs/DATABASE_BACKUP_AND_EXPORT.md` (job table must NOT appear in portable export)
- `electron/preload/index.ts` / `src/types/window.d.ts` (new IPC channels)
- `electron/main/api-tier.ts` / `electron/main/credentials.ts` (enrichment must NOT call these autonomously)

## Readiness tiers

```ts
type StrategyReadiness =
  | 'not_started'
  | 'basic_ready'       // review-commit succeeded; user in main chat; enrichment either absent, pending, or failed — none of which revokes this
  | 'enriching'         // a live job is running
  | 'fully_ready'       // the single enrichment job for this commit has completed
  | 'enrichment_failed' // terminal failure after retries exhausted (still basic_ready for UX; tier is diagnostic)
```

In practice `basic_ready` is authoritative for the product gate: enrichment success/failure is additive. Do not expose a write-gate that re-blocks the user after they've entered chat.

### Basic-ready contract (same list the plan states, tightened)

After an approved commit, the app may call strategy "basic-ready" iff the merged draft at commit contained, pre-transaction:

- Positioning (growth_strategy non-empty)
- Voice summary (voice_description non-empty + ≥3 voice_rules — verified via readiness validator)
- 3 content pillars
- 1 starter draft
- 1 recommended next action **when evidence supports one** (when evidence is thin, the validator must not require an invented action; follow `record_onboarding_gap` precedent)
- Minimum memory row required by the main agent (at least 1 audience/memory entry)

If this contract is not met, the app must not auto-enter chat; the review surface must show what's missing. Enrichment does not fill this gap — that remains the repair pass.

## Job persistence (migration 008: `add-onboarding-enrichment-jobs`)

```sql
CREATE TABLE IF NOT EXISTS onboarding_enrichment_jobs (
  id TEXT PRIMARY KEY,                   -- cryptoRandom "enj_<suffix>"
  run_id TEXT NOT NULL REFERENCES onboarding_runs(run_id) ON DELETE CASCADE,
  status TEXT NOT NULL
    CHECK (status IN ('pending','running','succeeded','failed','cancelled')),
  attempt INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  stage TEXT NOT NULL DEFAULT 'queued',  -- queued | hooks | targets | cadence | experiments | drafts | memory | done
  last_error_code TEXT,
  last_error_message TEXT,               -- redacted; no secrets, bounded length
  started_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  UNIQUE(run_id, status)                 -- at most one pending|running per run; enforced additionally in code
);
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_status_updated
  ON onboarding_enrichment_jobs(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_run
  ON onboarding_enrichment_jobs(run_id);
```

Ownership: one enrichment job per committed run (`UNIQUE(run_id)` when filtering to `pending|running`). A re-onboarding run gets its own job; prior run jobs are inert and not re-run.

## Background enrichment runner (new `electron/main/onboarding-enrichment.ts`)

### Capability and budget

- Tools: run `createTools()` through the standard capability filter and pass only `read` + `strategy-write` tools — the Plan 1 enforcement boundary. **No** `public-action` / `account-action` / `local-draft` beyond strategy writes; no credential or connector tools. Chat's approval tools are out of scope entirely.
- Step budget: ≤8 agent steps per job (mirror the repair pass). No `ask_user_questions`, no social gathering, no re-auth. Single bounded pass; transient errors use the existing backoff/retry loop, not extra steps.
- Artifacts produced (append-only, never destructive to already-committed core):
  - Expanded hook library entries
  - Target-account map additions
  - Deeper platform adaptations
  - Experiment backlog (dedicated memory type)
  - 1–2 additional starter drafts (count-limited, size-bounded)
  - Algorithm notes
  - Competitor/audience memory refinements

Each write method must be idempotent (same dedup/upsert keys as Plan 11). Re-running the same job never duplicates rows.

### Lifecycle (mirrors `ActiveOnboardingRun` per Plan 7, but chat must not be blocked)

```ts
type ActiveEnrichmentJob = {
  id: string
  runId: string
  abortController: AbortController
  stage: string
}
const activeEnrichmentJobs = new Map<string, ActiveEnrichmentJob>()
```

- **Creation**: on commit success, main inserts a `pending` job, then schedules the runner on the next idle tick (`setTimeout(…, 500)`). Insertion is idempotent — if a pending/running row already exists for the run, skip.
- **Run**: mark `running`, set `started_at`/`attempt`, create an `AbortController`, bump `attempt`, drive `runAgent` with the scoped tools + budget. Persist `stage` on checkpoint-like updates (but lightweight: touches only the jobs table, no checkpoint JSON rewrites for streaming tokens).
- **Event surface**: emit job-scoped events `onboarding:enrichment:stage` and `onboarding:enrichment:complete|failed`; renderer may show a quiet "Refining your strategy" chip in chat and update readiness. Chat's existing typed transporter (`transporter`) remains the chat event channel — do not mix concerns.
- **Concurrency**: the job map holds at most one entry. Any trigger that finds a `running` entry is a no-op. Two triggers cannot race past the `UNIQUE` index because insertion is inside a transaction.
- **Abort semantics**: `chat:send` and enrichment run on independent abort domains. Aborting/cancelling chat never cancels enrichment, and cancelling enrichment never touches chat controllers.
- **Backoff/retry**: transient 500/502/503/network errors retry with exponential backoff capped to `max_attempts` (default 3). Each retry re-validates readiness on the active tables (not draft) so the job never re-invents core strategy. `last_error_*` is kept redacted.
- **Resume after restart**: on app start (`index.ts` startup path next to the onboarding resumption check), query for jobs in `pending` or `running`; mark `running` → `pending` with bumped `attempt` if `max_attempts` not exceeded, otherwise `failed`; then schedule each survivor. Resume does not re-gather and does not re-interview.

### Commit semantics for enrichment output

- Enrichment writes **directly to active tables** (post-review, unlike Plan 11 drafts). This is intentional: these are append-only additive refinements to already-approved core strategy.
- Every write is individually idempotent; partial failure leaves a partially enriched but still valid state (no rollback of prior additive writes — they are useful). The job row records `stage` so resume knows what to skip.
- Double completion is a no-op: `completed_at` guards it.

## IPC

Add to preload + `window.api`:

- `onboarding:getEnrichmentStatus(runId)` — job row + derived `StrategyReadiness`.
- `onboarding:retryEnrichment(runId)` — only when status is `failed`; respects `max_attempts` unless the user explicitly resets the attempt counter (cap it; do not allow unbounded retries).
- `onboarding:cancelEnrichment(runId)` — only cancels the background job; never revokes basic readiness.

Stale/unknown `runId` → typed rejection.

## Main-agent behavior while enriching

- Normal chat remains fully available.
- The chat agent must not assume enrichment artifacts exist: guard hooks/targets reads with length checks rather than assuming counts (add defensive reads in `agent-system-prompt.ts` context builder if it currently asserts fixed counts).
- Enrichment failure does not revoke `basic_ready`; the app stays usable. The status surfaces as `enrichment_failed` with a user-initiated retry affordance.

## Backup / export

- The `onboarding_enrichment_jobs` table is **excluded from portable export** (same rule as `onboarding_strategy_drafts`). It is job plumbing, not user-owned content. Document the exclusion.
- SQLite backup includes it automatically; nothing to do.

## Tests

- Basic readiness completes without ever creating an enrichment job; enriching is requestable only after commit.
- Enrichment resumes after restart (fake timers + DB round-trip); `stage` advances monotonically and re-running a succeeded stage is idempotent.
- Duplicate jobs prevented per run (index + transactional guard).
- Chat `chat:send`/`chat:stop` work concurrently with an active enrichment job; neither aborts the other.
- Enrichment failure is retryable up to `max_attempts`, then `enrichment_failed`; completed enrichment bumps `fully_ready` exactly once.
- Enrichment cannot publish, vote, or mutate accounts (capability filter suite extended from Plan 1).
- App shutdown aborts the enrichment controller and persists the last known stage without marking it succeeded.

## Acceptance criteria

- Initial setup time is reduced: the user cannot be gated on enrichment.
- User-in-chat before enrichment completes is the expected path, not an edge case.
- Background work is durable, bounded, single-flight, and never takes a public/account action.

## Non-goals

- No onboarding question redesign, no provider verification change, no bypass of strategy review.
- No multi-tenant or multi-user concerns.

## Rollback

Feature-flag the scheduler (e.g. `enrichmentEnabled`) so the job table can stay inert. No draft or active strategy data depends on enrichment except additive rows that are individually safe to keep.
