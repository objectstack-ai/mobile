# ObjectStack Mobile

Native shell for the ObjectStack Console — iOS and Android, built with Expo.

> **2.x is a hybrid shell.** Business UI is the web Console served by your
> ObjectStack server; this app hosts it and adds what the web cannot do well:
> server selection, push notifications, OS integration and native fallback
> pages. The 1.x native metadata renderer lives on the
> [`legacy/native-renderer`](https://github.com/objectstack-ai/mobile/tree/legacy/native-renderer)
> branch.

## How it works

```
┌──────────── native shell (Expo / React Native) ────────────┐
│ server picker · loading / offline pages · push · app links │
│                  ▲ bridge: window.ObjectStackNative         │
│  ┌──────────────── WebView ─────────────────────────────┐  │
│  │  https://<server>/_console/   ← all business UI       │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

- The Console is same-origin with the API and signs in with its session cookie,
  so the shell holds no API credential and never calls the API itself.
- Every Console route is web by default. Route ownership
  (`lib/shell/route-owner.ts`) lets individual high-traffic routes move to
  native screens later without a rewrite.
- A platform release needs no mobile release — the Console updates with the
  server.

Read **[docs/HYBRID-SHELL.md](./docs/HYBRID-SHELL.md)** for the architecture,
navigation policy and the bridge contract.

## Getting started

```bash
pnpm install
cp .env.example .env.local
eas build --profile development --platform ios   # once: dev client with native modules
pnpm start
```

On first launch, enter your server address (for a local server from a phone,
use your computer's LAN IP, e.g. `http://192.168.1.42:3000`).

## Scripts

| Command | Description |
|---|---|
| `pnpm start` | Expo dev server |
| `pnpm test` | Jest |
| `pnpm run lint` | TypeScript + ESLint |
| `pnpm run format` | Prettier |

## Documentation

| Document | |
|---|---|
| [HYBRID-SHELL.md](./docs/HYBRID-SHELL.md) | architecture, navigation policy, route ownership, bridge |
| [PUSH-NOTIFICATIONS.md](./docs/PUSH-NOTIFICATIONS.md) | token flow, payloads, prerequisites |
| [DEVICE-TESTING.md](./docs/DEVICE-TESTING.md) | running on devices, manual checklist |
| [DEPLOYMENT.md](./docs/DEPLOYMENT.md) | configuration, EAS builds, CI, app review |
| [CONTRIBUTING.md](./docs/CONTRIBUTING.md) | where changes belong, conventions |
| [ROADMAP.md](./ROADMAP.md) | phases and what is next |
