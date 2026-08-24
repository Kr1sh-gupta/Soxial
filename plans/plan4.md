# Plan 4: Verify AI providers before continuing

## Objective

Verify credentials after the provider step’s Continue action and before saving them or advancing to account analysis.

## Reading list

- `src/features/onboarding/OnboardingPage.tsx`: `StepApiKey` and `handleContinue`
- `electron/main/api-tier.ts`
- `electron/main/credentials.ts`
- `electron/main/db.ts`: API-key CRUD and profile credential synchronization
- `electron/main/ipc/api.ts`
- `electron/main/ipc/profile.ts`
- `electron/preload/index.ts`
- `src/types/window.d.ts`
- `electron/main/errors.ts`
- `electron/main/log.ts`
- `package.json`
- `package-lock.json`

## Dependency

Plan 3.

## Current issue

`detectApiTier()` is not a credential verifier. It classifies many authentication and provider errors as `free`, so invalid credentials can appear usable.

## Implementation

Create a dedicated main-process verifier with this result shape:

```ts
type ProviderVerificationResult = {
  provider: 'google' | 'zhipu'
  valid: boolean
  tier: 'free' | 'pro' | 'unknown'
  code:
    | 'VALID'
    | 'INVALID_CREDENTIALS'
    | 'RATE_LIMITED'
    | 'NETWORK_ERROR'
    | 'MODEL_UNAVAILABLE'
    | 'UNKNOWN_ERROR'
  message: string
}
```

Add `api:verifyCredentials` to the preload bridge and window typings.

The request must support:

- Draft primary credentials.
- New backup credentials.
- Retained stored-key IDs.
- Z.AI coding-plan selection.

Rules:

- Never return or log raw credentials.
- Validate every newly entered credential independently.
- Continue only if at least one usable credential exists.
- Do not persist invalid newly entered credentials.
- Distinguish invalid credentials, rate limits, network errors, and unavailable models.
- Run tier detection only after validity has been established.

## Renderer flow

When Continue is pressed:

1. Disable the provider form.
2. Open a verification status surface.
3. Show provider-specific progress and results.
4. On success, save valid credentials and advance.
5. On failure, close the status surface, keep the user on the provider step, show an inline error, and focus the relevant field.
6. Prevent double submission.

## Tests

- Valid and invalid Google credentials.
- Valid and invalid Z.AI credentials.
- Coding-plan endpoint selection.
- Rate-limited but authenticated credential.
- Network failure.
- Mixed valid and invalid credentials.
- No secret leakage in logs, errors, or IPC responses.
- Credentials save only after successful verification.

## Acceptance criteria

- The user cannot enter gathering without a usable provider.
- `detectApiTier()` is not used as the validity check.
- Existing retained credentials can be verified without exposing their secret values to the renderer.

## Non-goals

- No provider-management redesign.
- No new AI provider.
- No granular platform-data controls.
