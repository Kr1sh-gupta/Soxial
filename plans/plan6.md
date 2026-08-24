# Plan 6: Durable onboarding checkpoint V2

## Objective

Persist enough state to resume gathering, questions, model continuation, and strategy work without losing user answers or repeating completed external work.

## Reading list

- `electron/main/onboarding-run.ts`
- `electron/main/onboarding-recovery.ts`
- `electron/main/db.ts`: checkpoint persistence, resume lookup, quarantine, and clearing
- `electron/main/db-migrations.ts`
- `electron/main/index.ts`: onboarding initialization, checkpoint writes, resume handler, and continuation branch
- `electron/main/agent.ts`: `runAgent`, `toModelMessages`, `toModelMessagesSync`, response-message handling, and retry progress preservation
- `src/features/onboarding/OnboardingPage.tsx`: checkpoint parsing, answer handling, and resume startup
- `src/types/window.d.ts`
- `docs/DATABASE_BACKUP_AND_EXPORT.md`
- `tests/onboarding-recovery.test.ts`
- `tests/app-errors-and-onboarding.test.ts`
- `tests/db-indexes.test.ts`

## Dependency

Plan 5.

## Checkpoint model

Add `OnboardingCheckpointV2` while retaining V1 parsing and migration:

```ts
type OnboardingCheckpointV2 = {
  version: 2
  runId: string
  revision: number
  phase: OnboardingPhase
  status: OnboardingRunStatus
  displayMessages: DisplayMessage[]
  modelMessages: SerializedModelMessage[]
  pendingInteraction: null | {
    kind: 'questions' | 'auth'
    requestId: string
    toolCallId?: string
    questions?: OnboardingQuestion[]
    answers?: OnboardingAnswer[]
    expiresAt: string
  }
  toolLedger: ToolLedgerEntry[]
  evidenceAssessment?: EvidenceAssessment
  readiness?: OnboardingReadinessResult
  connectedPlatforms: { twitter: boolean; reddit: boolean }
  completionCommitted: boolean
  cancellationReason?: string
  updatedAt: string
}
```

Tool ledger entries must include:

- Stable call ID.
- Tool name.
- Status.
- Safe argument summary or hash.
- Safe result summary.
- Timestamps.
- Artifact contribution.
- Error code where applicable.

Never persist raw credentials, cookies, or secret-bearing results.

## Persistence rules

Main is the authoritative checkpoint writer. Renderer submits answers and checkpoint intents, not arbitrary complete replacement state.

Checkpoint after:

- Phase transitions.
- Completed gather tools.
- Question creation.
- Answer submission.
- Strategy writes.
- Validation.
- Pause, cancellation, failure, and completion.

Throttle streaming text checkpoints to avoid SQLite writes per token.

Use revision checks to reject stale writes.

## Resume rules

- Migrate valid V1 state conservatively.
- Reopen persisted questions exactly.
- Resume after gathering without gathering again.
- Continue model work with persisted model messages and tool results.
- Quarantine corrupt checkpoints using existing quarantine behavior.

## Database work

Add a numbered migration only if new columns or tables are required. Keep checkpoint serialization versioned and parser-validated.

## Tests

- V1 migration.
- V2 serialization and parsing.
- Pending questions survive restart.
- Answers survive restart.
- Tool ledger deduplicates repeated completion events.
- Revision conflicts are rejected.
- Secret redaction.
- Resume skips completed gathering.
- Corrupt state is quarantined.

## Acceptance criteria

- User answers are not lost after app restart.
- Completed gathering tools are not blindly repeated.
- No secrets enter checkpoint JSON.
- Resume behavior is phase-aware.
