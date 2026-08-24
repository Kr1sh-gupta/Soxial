# Plan 10: Bounded strategy repair pass

## Objective

Repair missing strategy artifacts without repeating social gathering or the interview.

## Reading list

- `electron/main/index.ts`: agent invocation, result/error handling, fallback, and continuation branches
- `electron/main/agent.ts`: `runAgent`, fallback chains, `maxSteps`, tool overrides, and abort support
- `electron/main/tools.ts`
- `electron/main/onboarding-system-prompt.ts`
- `electron/main/onboarding-run.ts`
- `electron/main/errors.ts`
- Readiness validator and tests from `plans/plan9.md`

## Dependency

Plan 9.

## Flow

1. Run readiness validation.
2. Complete immediately if ready.
3. If incomplete, start one repair pass.
4. Give the model:
   - Missing artifact list.
   - Existing strategy state.
   - Relevant evidence.
5. Provide only tools needed for missing artifacts.
6. Use a maximum of approximately 8–10 steps.
7. Exclude:
   - `ask_user_questions`.
   - Public/account actions.
   - Connector installation.
   - Authentication tools.
8. Validate again.
9. If still incomplete, mark the run resumable/failed with explicit missing items.

## Idempotency

Repair must use existing upsert and deduplication behavior. Every repair tool call is recorded in the run ledger.

## Tests

- Missing hooks produce hook-only repair tools.
- Missing strategy does not rerun gathering.
- Repair cannot ask another interview.
- Repair is attempted at most once.
- Successful repair completes onboarding.
- Failed repair preserves useful work and leaves `onboarding_complete = 0`.

## Acceptance criteria

- Partial model compliance is recoverable.
- Repair is bounded and observable.
- No infinite repair loop is possible.
