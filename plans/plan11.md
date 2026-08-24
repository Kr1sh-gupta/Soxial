# Plan 11: Draft strategy repository

## Objective

Prevent unreviewed AI strategy from becoming active operating context. All strategy artifacts produced during an onboarding run land in an isolated, versioned draft; active tables remain untouched until the Plan 12 commit transaction.

## Dependency

Plan 10. Implemented on top of the existing `OnboardingCheckpointStore` revision discipline and the repair pass in `electron/main/onboarding-repair.ts`.

## Reading list

- `electron/main/db.ts` (strategy CRUD, checkpoint persistence)
- `electron/main/db-migrations.ts` (next migration is **version 7**; the runner rejects gaps, so do not skip numbers)
- `electron/main/onboarding-run.ts` (checkpoint types, `redactForCheckpoint`)
- `electron/main/onboarding-checkpoint-store.ts` (single-writer mutation pattern to imitate)
- `electron/main/tools.ts` (`createTools` shared tools, save/read/delete tools)
- `electron/main/agent.ts` (`createOnboardingTools`, capability filter at ~line 280)
- `electron/main/onboarding-repair.ts` (`REPAIR_TOOLS_BY_ARTIFACT` — repair must retarget to the draft adapter)
- `electron/main/onboarding-readiness.ts` (`validateOnboardingReadiness` must validate *merged* state)
- `electron/main/backup.ts` (`exportUserData` table list at line ~298)
- `tests/platform-auto-discovery-and-scoping.test.ts`, `tests/profile-identity-protection.test.ts`

## Database (migration 007: `add-onboarding-strategy-drafts`)

```sql
CREATE TABLE IF NOT EXISTS onboarding_strategy_drafts (
  run_id TEXT PRIMARY KEY,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'committed', 'discarded')),
  base_snapshot_json TEXT NOT NULL,
  draft_json TEXT NOT NULL,
  validation_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT,
  committed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_strategy_drafts_status_updated
  ON onboarding_strategy_drafts(status, updated_at DESC);
```

Status transitions (enforced in code, single direction): `draft → review → committed`, or `draft|review → discarded`. Committed and discarded drafts are immutable.

### Draft document schema (`StrategyDraftDocument` in a new `electron/main/strategy-draft.ts`)

Versioned (`version: 1`) and parser-validated like checkpoints:

```ts
interface StrategyDraftDocument {
  version: 1
  profileStrategyFields: Partial<Record<StrategyField, string>> // growth_strategy, branding_strategy, voice_description, tone_balance, ... — NEVER identity fields
  pillars: UpsertItem[]      // keyed by name
  hooks: UpsertItem[]        // keyed by name
  voiceRules: DedupItem[]    // deduplicated on (type, content)
  targets: DedupItem[]       // deduplicated on (platform, handle)
  algorithmRules: UpsertItem[] // keyed by (platform, signal)
  memories: InsertItem[]     // append-only
  milestones: InsertItem[]   // append-only
  replies: InsertItem[]      // append-only
  deletions: { table: 'hooks' | 'pillars' | 'voice_rules' | 'targets' | 'algorithm_rules'; key: string }[]
  starterDrafts: unknown[]
  proposedNextAction?: { text: string; rationale?: string }
}
```

Serialization rules:

- Persist through `redactForCheckpoint()` — the same secret-pattern scrub used for checkpoints. Draft JSON sits on disk next to checkpoints and must meet the same bar.
- Size-bound each collection (mirror the checkpoint depth/count caps).
- Identity fields (`name`, `timezone`, `twitter_handle`, `reddit_username`, plus every credential column) are stripped defensively at serialization even if a caller misbehaves — reuse the protection logic exercised by `tests/profile-identity-protection.test.ts`.

## Draft repository API (`strategy-draft.ts`)

Single-writer, revision-guarded like `OnboardingCheckpointStore`:

- `createDraftFromBaseSnapshot(runId)` — snapshots current active rows for the affected tables into `base_snapshot_json` **before** any agent write, then creates the row. Called once per run at gather start (or lazily before first strategy write).
- `updateDraft(runId, mutate)` — bumps `version`, persists with `WHERE version < ?` optimistic check (same late-writer rejection as checkpoints). Returns boolean.
- `getDraft(runId)`, `getMergedState(runId)` — merge rules below.
- `markReview(runId)`, `discardDraft(runId)`.
- Stale-draft hygiene: when a new run is prepared (`onboarding:prepare`), any prior draft left in `draft`/`review` by another run stays untouched (it may be under review); only `discarded`/`committed` terminal states are final. The review UI resolves which draft it shows by explicit `runId`, never "latest".

## Tool adapter

Build `createDraftScopedTools(baseTools, runId)` wrapping the existing Zod schemas:

| Base tool | Draft behavior |
|---|---|
| `read_hooks`, `read_pillars`, `read_voice_rules`, `read_targets`, `read_algorithm`, `read_memory`, `read_replies`, `read_profile` | Return base ⊕ draft merged view |
| `save_hook`, `save_pillar`, `save_voice_rule`, `save_target`, `save_algorithm_rule`, `save_reply` | Write into draft collections using the same dedup/upsert keys as the active-table implementations |
| `delete_hooks`, `delete_pillars`, `delete_voice_rules`, `delete_targets`, `delete_algorithm_rules` | Record a deletion entry; never touch active rows |
| `save_memory`, `save_milestone` | Append into draft |
| `update_soxial_profile` | Write strategy fields into draft; identity-field stripping identical to production tool |
| `schedule_post`, all X/Reddit/image-publication tools | Excluded exactly as in Plan 1's capability filter |

Merge semantics (deterministic, unit-tested):

1. Start from base snapshot rows.
2. Apply draft upserts by key (draft wins).
3. Apply recorded deletions last.
4. Appends (memories/milestones) are draft-only until commit — base has no meaningful snapshot role for them beyond idempotency keys.

Reads must be idempotent and stable within a run so readiness validation is deterministic (Plan 9 requirement).

Wiring:

- `createOnboardingTools` uses the draft adapter for every strategy read/write.
- The repair pass (`selectRepairTools` / `buildRepairPrompt`) operates unchanged — its tool names resolve to draft-backed implementations inside onboarding context.
- `validateOnboardingReadiness` gains a merged-state input path; current-run attribution comes from the tool ledger as today, with ledger entries recording draft contributions.
- Normal chat (`createChatTools`) keeps using active tables — asserted by test.

## Backup / export interaction

- Portable export (`exportUserData`): **do not** add `onboarding_strategy_drafts` to the table list this plan. Unreviewed drafts are run-local working state, not user-owned content. Document the exclusion in `docs/DATABASE_BACKUP_AND_EXPORT.md`.
- SQLite backups: drafts are part of the DB file and are covered automatically; nothing to change.

## Re-onboarding safety

The base snapshot exists precisely so re-onboarding never truncates. Deletion entries recorded during a run are applied only at Plan 12 commit, and the commit (Plan 12) must diff deletions against the *current* active rows, not the snapshot, refusing to delete rows created after the snapshot (user-created strategy made outside the run).

## Tests (`tests/strategy-draft.test.ts`, extend existing suites)

- Draft saves leave active tables byte-identical (snapshot before/after comparison).
- Merged reads include base and draft items; upsert precedence and deletion ordering correct.
- Draft deletes do not delete active rows.
- Identity/credential fields cannot enter `draft_json` (injection attempt via `update_soxial_profile` args).
- Repeated identical writes keep `version` bumping but produce idempotent content; late-writer version conflict returns false.
- Existing user strategy preserved verbatim in `base_snapshot_json`.
- Readiness validator passes/fails identically on merged state vs. equivalent live tables (parity test).
- Repair pass writes land in the draft, not active tables.
- Redaction: seeded secret-like strings never appear in `draft_json`.
- Migration 007 applies cleanly after 006 and passes the gap check.

## Acceptance criteria

- Agent generation leaves active strategy tables unchanged until an explicit commit.
- Entire proposed strategy reviewable as one versioned object with optimistic-concurrency updates.
- Normal chat behavior unchanged.
- `npm run typecheck`, `npm test`, `npm run build` pass.

## Non-goals

- No review UI (Plan 12), no background enrichment (Plan 13).
- No multi-draft merging across runs.

## Rollback

Drop the table via a new numbered migration if ever needed; the adapter is additive and chat paths are untouched.
