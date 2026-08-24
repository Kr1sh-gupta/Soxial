# Plan 3: Onboarding UX, copy, optional fields, and disclosure

## Objective

Keep automatic account discovery unchanged while making the current step intent accurate and allowing users to skip uncertain strategic inputs.

## Reading list

- `src/features/onboarding/OnboardingPage.tsx`: `StepIdentity`, `StepPlatforms`, `StepApiKey`, and parent step routing
- `src/features/onboarding/use-onboarding-form.ts`
- `src/components/Onboarding.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/autocomplete.tsx`
- `src/components/ui/dropdown-menu.tsx`
- `src/lib/utils.ts`
- `src/App.tsx`
- `src/index.css`
- `tailwind.config.js`

## Implementation

### Identity stages

In `src/features/onboarding/OnboardingPage.tsx`:

- Keep `name`, `timezone`, and `primary_goal` required.
- Make `niche` and `superpower` optional.
- Use `Skip` when an optional field is blank.
- Use `Continue` when an optional field contains non-whitespace content.
- Make Enter follow the same rule as the button.
- Trim values before storing them.

### Account-analysis step

Rename `StepPlatforms` to an intent-revealing name such as `StepAccountAnalysisInfo`.

Recommended title:

> Before we analyze your accounts

Recommended copy:

> Soxial uses the X and Reddit accounts currently signed in to your browser. You’ll be asked to sign in if either account cannot be detected.

Keep `target_audience` optional with the same dynamic `Skip`/`Continue` label.

### Disclosure

At the bottom of this step, add:

> Soxial sends a compacted selection of account activity to your chosen AI provider to build your strategy. API keys and browser credentials are never included.

Do not add granular data controls in this plan.

## Tests

Extract pure helpers where useful:

- `isRequiredIdentityStage()`
- `getOptionalStepActionLabel()`

Test:

- Required fields block progression when blank.
- Optional fields advance when blank.
- Labels change from `Skip` to `Continue`.
- Whitespace-only values remain skippable.
- Disclosure text is rendered.

## Acceptance criteria

- Automatic platform discovery and auth behavior remain unchanged.
- No manual platform selector is introduced.
- Optional fields never block onboarding.
- Disclosure is visible before account gathering begins.

## Non-goals

- No platform-selection model.
- No granular privacy controls.
- No changes to CLI installation or authentication.
