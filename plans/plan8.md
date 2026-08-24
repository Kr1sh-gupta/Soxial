# Plan 8: Adaptive, at-most-once interview

## Objective

Ask only questions that address meaningful evidence gaps and enforce one interview batch at runtime.

## Reading list

- `electron/main/agent.ts`: `createOnboardingTools`, pending question state, and the onboarding answer listener
- `electron/main/onboarding-system-prompt.ts`
- `electron/main/onboarding-run.ts`
- `electron/main/index.ts`: `sendQuestions` and checkpoint behavior
- `src/features/onboarding/OnboardingPage.tsx`: pending questions, batch IDs, answer handling, and `QuestionInput`
- `src/components/ui/question-input.tsx`
- `src/types/window.d.ts`
- `tests/onboarding-recovery.test.ts`
- `tests/app-errors-and-onboarding.test.ts`

## Dependency

Plans 6 and 7.

## Interview semantics

Change the rule from “exactly once” to:

> The onboarding agent may call `ask_user_questions` at most once. It may skip the interview when the required strategic categories have sufficient evidence.

Expected ranges:

- Strong evidence: 2–4 questions.
- Thin evidence: 5–8 questions.
- No evidence: a structured manual interview.

## Evidence assessment

Persist confidence for:

- Positioning.
- Audience.
- Voice.
- Business outcome.
- Time capacity.
- Risk tolerance.

Each assessment includes confidence, supporting evidence, and contradictions.

Guidance:

- `0.8–1.0`: do not ask unless contradictory.
- `0.5–0.79`: ask only if confirmation changes strategy.
- Below `0.5`: ask.

## Runtime guard

Persist `interviewRequestedAt` in checkpoint V2.

If the tool is called a second time, return a typed `INTERVIEW_ALREADY_REQUESTED` error and do not create another pending request.

Validate:

- Unique question IDs.
- Non-empty text.
- Options for single/multi questions.
- No more than eight questions.
- No credential or identity questions already answered by the form.

## Tests

- High-confidence evidence asks fewer questions.
- Thin evidence asks more questions.
- A second call is rejected.
- Duplicate IDs are rejected.
- Invalid choice questions are rejected.
- Resume cannot create a second interview.
- A no-interview run can complete.

## Acceptance criteria

- Question count adapts to evidence.
- Interview occurs at most once.
- Validation is independent of prompt obedience.
