# Plan 9: Deterministic onboarding readiness validation

## Objective

Set `onboarding_complete` only when the current run has produced a minimally usable strategy.

## Reading list

- `electron/main/tools.ts`: `save_memory`, `save_pillar`, `save_target`, `save_voice_rule`, `save_hook`, `save_algorithm_rule`, `save_milestone`, and `update_soxial_profile`
- `electron/main/index.ts`: post-agent completion logic and `onboarding_complete`
- `electron/main/db.ts`: strategy tables, profile updates, milestone queries, and memory queries
- `electron/main/seed.ts`
- `electron/main/onboarding-run.ts`
- `electron/main/onboarding-system-prompt.ts`
- `docs/DATABASE_SCHEMA.md`
- `tests/profile-identity-protection.test.ts`
- `tests/app-errors-and-onboarding.test.ts`
- `tests/db-indexes.test.ts`

## Dependency

Plan 6.

## Current-run validation

Do not use global table counts because seeded defaults can satisfy them before personalization.

Create a pure `validateOnboardingReadiness()` function using:

- Current-run tool ledger.
- Profile strategy fields.
- Connected platforms.
- Explicit unavailable-data markers.
- Final response presence.

Minimum requirements:

| Artifact | Requirement |
|---|---|
| Growth strategy | Non-empty and written by the current run |
| Content pillars | 3 current-run items |
| Voice rules | 3 current-run items |
| Hooks | 5 current-run items |
| Audience/positioning memory | 1 current-run item |
| Baseline metrics | 1, or an explicit unavailable reason |
| Platform strategy | Present for each connected platform |
| Final summary | Non-empty |

Updated seeded records count as current-run work when the current run’s save tool reports the update.

Add an allowed `record_onboarding_gap` tool for legitimate unavailable data. A gap must never permit invented metrics.

Persist:

```ts
type OnboardingReadinessResult = {
  ready: boolean
  checks: ReadinessCheck[]
  missing: ArtifactRequirement[]
  warnings: ArtifactWarning[]
}
```

## Tests

- Seeded defaults do not pass by themselves.
- Updated seeded records count.
- Missing growth strategy blocks completion.
- Metrics-unavailable is handled conditionally.
- Missing platform data does not produce invented metrics.
- X-only and Reddit-only requirements work correctly.
- Empty final text blocks completion.

## Acceptance criteria

- `onboarding_complete` is set only when readiness is true.
- The renderer receives specific missing-artifact information.
- The validator uses no model calls.
- Repeated validation is deterministic.
