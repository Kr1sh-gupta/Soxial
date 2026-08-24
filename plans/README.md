# Soxial Onboarding Implementation Plans

These plans split the onboarding and agent-interaction improvements into independently implementable increments.

## Dependency order

```text
plan1  Onboarding tool safety
  └─ plan2  Untrusted social evidence
       └─ plan3  Onboarding UX, copy, and disclosure
            └─ plan4  AI provider verification

plan1
  └─ plan5  Run-scoped onboarding events
       └─ plan6  Durable checkpoint V2
            ├─ plan7  Cancellation and five-minute inactivity pause
            ├─ plan8  Adaptive, at-most-once interview
            └─ plan9  Deterministic readiness validation
                  └─ plan10 Bounded repair pass
                        └─ plan11 Strategy draft repository
                              └─ plan12 Strategy review and commit
                                    └─ plan13 Fast setup and background enrichment
```

## Plans

| File | Scope | Dependency | Status |
|---|---|---|---|
| [plan1.md](./plan1.md) | Remove public/account actions from onboarding | None | Done |
| [plan2.md](./plan2.md) | Treat gathered social content as untrusted evidence | Plan 1 | Done |
| [plan3.md](./plan3.md) | Rename account-analysis step, optional fields, disclosure | None | Done |
| [plan4.md](./plan4.md) | Verify provider credentials before continuing | Plan 3 | Done |
| [plan5.md](./plan5.md) | Run-scoped events and immediate run identity | Plan 1 | Done |
| [plan6.md](./plan6.md) | Versioned durable onboarding checkpoints | Plan 5 | Done |
| [plan7.md](./plan7.md) | Cancellation and five-minute interaction pause | Plan 6 | Done |
| [plan8.md](./plan8.md) | Adaptive interview and runtime one-shot guard | Plans 6, 7 | Done |
| [plan9.md](./plan9.md) | Deterministic onboarding artifact validation | Plan 6 | Done |
| [plan10.md](./plan10.md) | One bounded strategy repair pass | Plan 9 | Done |
| [plan11.md](./plan11.md) | Draft strategy persistence before activation | Plan 10 | Done |
| [plan12.md](./plan12.md) | User review and transactional strategy commit | Plan 11 | Done |
| [plan13.md](./plan13.md) | Fast setup and background enrichment | Plan 12 | Done |

Plans 1-13 are implemented and covered by tests (migrations 007-008 add the
draft repository and enrichment job store).

## Quality gates for every plan

```bash
npm run typecheck
npm test
npm run build
```

Every plan must preserve:

- No raw API keys in logs, IPC payloads, checkpoints, or user-facing errors.
- Numbered SQLite migrations for schema changes.
- Versioned and validated serialized state.
- A settlement path for every pending promise.
- Cancellation ownership for every long-running run.
- Idempotent retry and commit behavior.
- Tests for the changed behavior and its failure paths.
