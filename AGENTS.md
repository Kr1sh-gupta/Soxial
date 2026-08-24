# AGENTS.md

## Git workflow

1. `main` is production. It only ever receives merges from `develop`; never
   commit to it directly.
2. All development happens on `develop`.
3. For every task, create a branch from `develop`:
   `feature/develop-<feature-name>` or `fix/develop-<fix-name>`.
4. When the work is done and tests pass, raise a PR into `develop`. Another
   collaborator reviews and approves before it merges.
5. A release merges `develop` into `main`; `.github/workflows/build-release.yml`
   takes care of the automated release from there.

## Agent skills

### Issue tracker

GitHub Issues on github.com/rabden/Soxial, accessed via the `gh` CLI.
See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`,
`ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: `CONTEXT.md` + `docs/adr/` at the repo root.
See `docs/agents/domain.md`.
