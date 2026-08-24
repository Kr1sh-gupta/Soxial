# Plan 7: Cancellation and five-minute inactivity pause

## Objective

Give every onboarding run cancellation ownership and safely pause pending user interactions after five minutes of inactivity.

## Reading list

- `electron/main/agent.ts`: `runAgent`, `abortController`, `abortableSleep`, and transient retry handling
- `electron/main/index.ts`: active onboarding runs, app lifecycle hooks, shutdown behavior, auth cancellation, and chat cancellation
- `electron/main/onboarding-recovery.ts`
- `electron/main/onboarding-run.ts`
- `src/features/onboarding/OnboardingPage.tsx`
- `electron/preload/index.ts`
- `src/types/window.d.ts`
- `tests/onboarding-recovery.test.ts`
- `tests/app-errors-and-onboarding.test.ts`

## Dependency

Plan 6.

## Runtime model

Replace the aggregate onboarding counter with run-owned state:

```ts
type ActiveOnboardingRun = {
  runId: string
  abortController: AbortController
  pendingInteraction?: PendingInteraction
  startedAt: number
}
```

Use a `Map<string, ActiveOnboardingRun>`.

## IPC

Add:

- `onboarding:cancel(runId)`
- `onboarding:pause(runId)`
- `onboarding:resume(runId)`

## Five-minute behavior

The timeout applies only while waiting for:

- Questionnaire answers.
- Authentication retry decisions.

It does not limit gathering, model generation, tool execution, or total onboarding time.

On expiry:

1. Persist `paused`.
2. Persist the full pending interaction.
3. Abort the active model stream.
4. Settle pending promises with a typed pause reason.
5. Emit `paused`.
6. Show `Resume setup`.

An answer near the timeout must be resolved atomically using checkpoint revision checks.

## Shutdown behavior

- App shutdown aborts all onboarding controllers.
- Renderer/window loss pauses active onboarding.
- Starting another run rejects or cancels the previous run.
- Clearing pending questions settles promises instead of deleting resolver entries.

## Tests

Use fake timers:

- Pause after five minutes.
- Answer immediately before timeout succeeds.
- Timeout/answer race resolves exactly once.
- Cancellation aborts `runAgent`.
- App shutdown settles pending promises.
- Resume restores exact questions.
- Cancelled runs are not resumable.

## Acceptance criteria

- No onboarding promise can remain orphaned.
- User cancellation stops provider work.
- Timeout preserves progress.
- Cancellation never marks onboarding complete.

## Non-goals

- No hard five-minute limit on onboarding.
- No automatic retry after user cancellation.
