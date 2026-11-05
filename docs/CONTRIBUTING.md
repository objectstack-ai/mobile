# Contributing

## Setup

```bash
pnpm install
pnpm start          # Expo dev server (use a development build, see DEVICE-TESTING.md)
pnpm test           # Jest
pnpm run lint       # tsc + ESLint
```

## Where things go

- **Business UI belongs in the Console**, in the framework repository
  (`objectstack-ai/objectstack`, `ui/`). If a screen problem shows up on mobile,
  fix the Console's responsive layout; do not build it natively here.
- **Native capability** (OS integration the web cannot do) belongs here, usually
  as a bridge method — see [HYBRID-SHELL.md](./HYBRID-SHELL.md#native-bridge).
- **A native screen** only under the route-ownership rules in
  [HYBRID-SHELL.md](./HYBRID-SHELL.md#route-ownership--growing-native-screens).

## Conventions

- TypeScript strict; keep policy in pure modules under `lib/` with unit tests,
  and keep components thin.
- Every user-visible string in every bundle under `locales/` (the 11 languages in
  `lib/i18n.ts`); regenerate `zh-Hant.json` from `zh-Hans.json` when that changes.
- Add a changeset (`pnpm changeset`) for user-facing changes.
- Branch from `main`, open a PR, keep CI green.
