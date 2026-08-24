# Plan 5: Run-scoped onboarding events and immediate run identity

## Objective

Give the renderer the run ID before long-running work starts and prevent stale runs from updating the active UI.

## Reading list

- `electron/main/index.ts`: `setupIpc`, `onboarding:run`, onboarding event emitters, and active-run tracking
- `electron/preload/index.ts`: onboarding methods and subscriptions
- `src/types/window.d.ts`
- `src/features/onboarding/OnboardingPage.tsx`: onboarding subscriptions, `startOnboarding`, and cleanup
- `electron/main/onboarding-run.ts`
- `electron/main/ipc/register.ts`
- `electron/main/index.ts`: `chat:send`, `chat:stop`, and session-scoped chat events for comparison

## Dependency

Plan 1.

## Implementation

Create shared onboarding contract types:

```ts
type OnboardingEventEnvelope<T> = {
  version: 1
  runId: string
  sequence: number
  emittedAt: string
  type:
    | 'phase'
    | 'text'
    | 'reasoning'
    | 'tool-call'
    | 'tool-result'
    | 'question'
    | 'auth-required'
    | 'transient-retry'
    | 'paused'
    | 'cancelled'
    | 'complete'
    | 'failed'
  payload: T
}
```

Add `onboarding:prepare`:

1. Main creates and persists the run.
2. Main returns the run ID immediately.
3. Renderer invokes execution with that run ID.

Every event and response must include `runId`.

The renderer must:

- Ignore events from other runs.
- Ignore duplicate or old sequence numbers.
- Reset run UI only when a new run is prepared.
- Avoid `removeAllListeners` for onboarding cleanup.

Reject:

- Unknown run IDs.
- Duplicate execution for a running run.
- Malformed event payloads.

## Tests

- Run ID is returned before execution.
- Events contain run ID and monotonic sequence.
- Stale events are ignored.
- Duplicate events are ignored.
- Duplicate execution is rejected.
- Unknown run ID is rejected.

## Acceptance criteria

- A fresh run has a usable run ID before the first question.
- Renderer-side answer checkpoints can reference the correct run.
- Two runs cannot mix UI state.

## Non-goals

- No checkpoint V2 yet.
- No cancellation yet.
- No strategy review.
