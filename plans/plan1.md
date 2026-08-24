# Plan 1: Restrict onboarding capabilities

## Objective

Make it technically impossible for onboarding to publish, schedule, delete, vote, like, follow, subscribe, or otherwise mutate social accounts.

## Reading list

- `electron/main/agent.ts`: `createOnboardingTools`, `createChatTools`, `toAITools`, and `runAgent`
- `electron/main/tools.ts`: `createTools`, shared tools, X/Twitter tools, Reddit tools, and scheduling tools
- `electron/main/agent-system-prompt.ts`
- `electron/main/onboarding-system-prompt.ts`
- `tests/platform-auto-discovery-and-scoping.test.ts`
- `docs/TOOLS_DOCUMENTATION.md`

## Current risk

`createOnboardingTools()` spreads all tools from `createTools()`. Several tools only say `REQUIRES user approval` in their descriptions, but their `execute` functions directly invoke platform CLIs. Prompt compliance is not an enforcement boundary.

Relevant files:

- `electron/main/agent.ts`
- `electron/main/tools.ts`
- `tests/platform-auto-discovery-and-scoping.test.ts`

## Implementation

1. Add capability metadata to tools:

```ts
type ToolCapability =
  | 'read'
  | 'strategy-write'
  | 'local-draft'
  | 'public-action'
  | 'account-action'
```

2. Mark every existing tool with one or more capabilities.
3. Add an onboarding capability policy allowing only:
   - Profile strategy reads/writes
   - Hooks, voice rules, pillars, targets, and algorithm rules
   - Memory and milestone tools
   - Social read tools
   - Image inspection
   - `ask_user_questions`
4. Filter the tool map inside `createOnboardingTools()`.
5. Explicitly exclude all public/account actions, scheduling, deletion, bookmark mutation, voting, and connector mutation.
6. Keep normal chat tool behavior unchanged.

## Tests

Create `tests/onboarding-tool-safety.test.ts`:

- All expected read and strategy tools are present.
- `ask_user_questions` is present.
- X/Twitter and Reddit action tools are absent.
- Schedule, delete, vote, follow, subscribe, like, and reply tools are absent.
- Test X-only, Reddit-only, and dual-platform scopes.
- Add a regression assertion that a future action-capability tool cannot appear in onboarding.

## Acceptance criteria

- Onboarding has no executable path to a public/account-changing CLI operation.
- The guarantee remains true even if onboarding prompt restrictions are removed.
- Normal chat retains its current tool set.
- `npm test`, `npm run typecheck`, and `npm run build` pass.

## Non-goals

- This does not implement approval tokens for normal chat.
- This does not change automatic platform discovery.
- This does not change onboarding UI.

## Rollback

Revert the capability metadata and onboarding filter. No database migration is required.
