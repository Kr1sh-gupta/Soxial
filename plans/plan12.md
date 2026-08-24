# Plan 12: Strategy review and transactional commit

## Objective

Let the user review and edit core assumptions of the generated strategy, then activate it through one atomic, idempotent, version-checked SQLite transaction. Unreviewed AI strategy never becomes authoritative.

## Dependency

Plan 11 (draft repository must exist; this plan only reads/commits drafts).

## Reading list

> Corrections vs. the original draft: `src/components/Message.tsx` and several listed `ui/` components do not exist. The real surfaces are `src/components/ai-elements/message.tsx`, `rich-content.tsx`, and the existing `ui/` set (`collapsible.tsx` exists; `dialog.tsx`, `textarea.tsx`, `accordion.tsx` do not and would be added under this plan).

- Backend: `electron/main/db.ts`, `db-migrations.ts` (migration 008 if schema changes), `strategy-draft.ts` (from Plan 11), `onboarding-run.ts`, `onboarding-checkpoint-store.ts`, `index.ts` (run completion path, readiness + repair flow at ~lines 712–736), `errors.ts`
- Renderer: `src/features/onboarding/OnboardingPage.tsx`, `src/components/ai-elements/*`, `src/components/ui/question-input.tsx` (pattern for multi-step interactive UI), `src/types/window.d.ts`
- Lifecycle/docs: `electron/main/backup.ts`, `docs/DATABASE_BACKUP_AND_EXPORT.md`

## Run-phase extension

Add a review phase instead of overloading pending interactions:

- Extend `OnboardingPhase` with `'review'` and add a `PendingInteraction` kind `'review'` carrying `{ draftRunId, expectedVersion }` — reusing the existing pause/resume/5-minute machinery from Plan 7 for free.
- When generation finishes and readiness passes (`validateOnboardingReadiness` on merged state), main:
  1. Marks the draft `review`.
  2. Checkpoints phase `'review'` with the pending interaction.
  3. Emits a run-scoped event (`type: 'phase'`) so the renderer opens the review surface.
- Closing the app mid-review resumes at review via normal checkpoint resume — no new persistence mechanism.
- The agent cannot write to the draft during review: the run's tool loop has ended; enforce additionally by rejecting draft mutations when status is `'review'`.

## IPC contract (all run-scoped per Plan 5)

| Channel | Direction | Purpose |
|---|---|---|
| `onboarding:getDraft(runId)` | R→M | Full draft document + merged read view + validation result |
| `onboarding:updateDraftSection(runId, section, items, expectedVersion)` | R→M | User edit; bumps draft version |
| `onboarding:regenerateSection(runId, section, expectedVersion)` | R→M | Section-scoped model regeneration |
| `onboarding:commitStrategy(runId, expectedVersion)` | R→M | The atomic commit below |
| `onboarding:saveForLater(runId)` | R→M | Keep draft in `review`; user can leave |

All responses include `runId`. Stale `expectedVersion` returns typed `DRAFT_VERSION_CONFLICT` (extend `errors.ts`). Unknown run ID / non-`review` draft → typed rejection.

## Review sections (renderer)

Primary editable sections:

1. Positioning (profile strategy fields)
2. Target audience
3. Voice (voice_description + voice rules)
4. Content pillars
5. Platform priorities and targets
6. Weekly operating cadence

Hooks, algorithm rules, memories, milestones, starter drafts go under an expandable advanced section (use `collapsible.tsx` or add `accordion.tsx`).

Actions:

- **Approve and continue** → `commitStrategy`.
- **Edit** → inline textarea per item; saves via `updateDraftSection`.
- **Regenerate this section** → see below.
- **Save and finish later** → draft stays in `review`; resumable.

### Regeneration rules

- One bounded pass per request: reuse the repair-pass pattern (`selectRepairTools` scoped to the section's artifact tools, ≤8 steps, no `ask_user_questions`, no public/account tools).
- Only the targeted section's draft collection may change; other sections are frozen by passing the model a prompt that includes accepted sections as fixed context and by diffing results — any mutation outside the requested section is discarded before persisting.
- Regeneration bumps draft `version`; concurrent edits from the UI surface the version conflict instead of silently overwriting.
- Rate-limit/transient failures reuse the existing transient-retry IPC; repeated failure leaves the section untouched and reviewable.

## Commit transaction (`commitOnboardingStrategy(runId, expectedVersion)`)

Single better-sqlite3 transaction (`db.transaction(() => {...})()` — synchronous, all-or-nothing):

1. Load draft; reject unless status is `review` **and** `version === expectedVersion` (double-approval idempotency: if already `committed`, return success-no-op).
2. Re-run `validateOnboardingReadiness` on merged state; abort with missing list if not ready.
3. Snapshot safety check: for each recorded deletion, verify the row still matches its snapshot key; skip (with warning) rows created after the base snapshot — never delete user-created strategy.
4. Apply profile strategy fields (identity fields stripped defensively again).
5. Apply strategy upserts/deletions to active tables using the production save/delete functions (same dedup keys as the adapter).
6. Insert memories/milestones/replies idempotently (natural keys; re-running inserts nothing twice).
7. Save growth strategy last.
8. Mark draft `committed` with `committed_at`.
9. Mark onboarding run complete; set `onboarding_complete = 1` only after the transaction commits successfully.
10. Emit final run-scoped completion event; renderer transitions to chat.

Failure semantics: any throw rolls back everything (transaction), draft stays in `review` untouched, typed error returned, nothing partial visible. Take a verified pre-restore backup via the existing `backup.ts` path before first commit attempt of a given draft (defense in depth, mirrors restore procedure).

Identity fields (`name`, `timezone`, `twitter_handle`, `reddit_username`) are not present in review sections, not editable through any channel here, and stripped server-side regardless of payload content.

## Tests (`tests/strategy-commit.test.ts` + renderer tests)

Backend:

- Active tables unchanged before approval (parity with Plan 11 tests).
- Approval applies every artifact atomically; kill-switch test simulating a throw mid-transaction leaves zero changes and draft still `review`.
- Double approval is a success no-op; second call does not duplicate rows.
- Stale `expectedVersion` rejected with typed error.
- Identity overwrite attempts ignored (including direct IPC payload forgery).
- Post-snapshot user-created rows are skipped by deletions.
- Readiness re-validation failure blocks commit with specific missing artifacts.
- Resume-at-review: checkpoint round-trip restores the review interaction exactly.

Renderer/logic:

- Section regeneration preserves untouched sections byte-for-byte.
- Out-of-section model mutations are discarded.
- Closing and reopening review shows identical state.

## Acceptance criteria

- Unreviewed AI strategy never becomes authoritative.
- Approval is atomic, idempotent, and version-checked.
- Review survives close/resume; regeneration is bounded and section-scoped.

## Non-goals

- No background enrichment (Plan 13).
- No diff/history UI beyond the current draft version.
- No collaborative editing concerns (single-user desktop app).

## Rollback

Commit path is additive; drafts that were never committed remain discardable. A new numbered migration can drop the table without touching active data.
