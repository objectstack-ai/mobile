# Upgrade Roadmap

Forward-looking assessment of two upgrade tracks deferred during the
ObjectStack 8.0 dependency sweep (June 2026). Neither is a quick dependency
bump — both are captured here so they can be scheduled deliberately.

---

## 1. better-auth 1.6 — adopted; verify login + one feature opportunity

`better-auth` + `@better-auth/expo` are now on **1.6.15** (was 1.4.18). Typecheck
and the full jest suite pass, but the auth tests **mock** the client, so the real
sign-in / session-cookie flow was never exercised by CI.

### Why the bump was worth it (security + bug fixes we directly touch)
The 1.5→1.6 line is mostly hardening, and several fixes land squarely on the
APIs this app uses (`createAuthClient`, `expoClient`, `twoFactorClient`, the
native `Cookie`/`Origin` forwarding in `lib/objectstack.ts` and `lib/auth-client.ts`):

- **2FA cookie-cache bypass** fixed — a session-cookie leak that allowed token
  capture / 2FA bypass when caching is enabled. We ship `twoFactorClient()`.
- **2FA session-cookie cache clearance** on response hardened.
- **Expo oversized account cookies** are now split across multiple SecureStore
  keys. We use `expoClient({ storage: SecureStore })` and read the session via
  `authClient.getCookie()` to forward it to the data API — this is the change
  most worth confirming in a real login (the reassembly is internal, but verify
  `getCookie()` still returns a complete cookie).
- **Relaxed cookie-separator parsing** for proxies; `getSessionCookie` prefers
  secure-prefixed cookies.

No breaking changes to our usage surface (confirmed: typecheck passes unchanged).

### Required before relying on it
- [ ] Web: sign in → session persists across reload → sign out.
- [ ] Native (iOS + Android): sign in → `authClient.getCookie()` carries the
      session to ObjectStack data calls (`authAwareFetch`) → 2FA enroll/verify →
      sign out.

### Adoptable feature (own ticket)
- **`hydrateSession`** (new on `createAuthClient`) seeds the client with a
  server-fetched session for immediate data on first render. Today
  `app/_layout.tsx` waits on `authClient.useSession()` after hydrate; adopting
  `hydrateSession` could remove the cold-start auth flash. Requires a boot-time
  session fetch — do it alongside the login verification above.

Sources: better-auth GitHub releases (1.5.x–1.6.x).

---

## 2. Expo SDK 55 / 56 — tractable, because we're already on New Architecture

Current: **Expo 54**, React Native 0.81, React 19.1, `newArchEnabled: true`.

| SDK | React Native | React | Notes |
|-----|--------------|-------|-------|
| 55  | 0.83 | 19.2 | **Last-legacy boundary: SDK 54 is the final Legacy-Arch release; 55+ is New-Arch only** (`newArchEnabled` removed from config). |
| 56  | 0.85 | 19.2 | Hermes v1 default, Swift/C++ interop (perf), new RN animation backend. UI Compose/SwiftUI APIs stable. |

### Risk is **medium, not high** — the big blocker is already cleared
SDK 55+ dropping Legacy Architecture is normally the dominant migration risk.
**This app already runs New Architecture** (`newArchEnabled: true` in `app.json`
+ `app.config.ts`), and its native deps are already modern New-Arch builds
(reanimated 4, react-native-mmkv 4, @shopify/flash-list 2, react-native-screens 4,
gesture-handler 2.30, react-native-worklets). So this is a careful SDK bump, not
a rewrite.

### What it unblocks (the motivation — these are pinned by Expo 54 today)
- `jest` 30 + `@types/jest` 30 (via `jest-expo` 56).
- `babel-preset-expo` 56.
- `@sentry/react-native` 8 (New-Arch native).
- `@types/react` 19.2 (React 19.1 → 19.2); possibly `@testing-library/react-native`
  14, which needs React 19's concurrent renderer (it failed on the current 19.1
  setup — see PR #84 notes).
- **Not** automatically unblocked: `eslint` 9/10 — that's gated by
  `eslint-plugin-react-hooks@4` (peer caps at eslint ^8) and needs a flat-config
  migration, independent of Expo. (Expo 55+'s `eslint-config-expo` may move to
  flat config + hooks-plugin 5, which would help — confirm at upgrade time.)

### Suggested sequence (own effort, needs native builds + device testing)
1. Branch; `npx expo install expo@^55` then `npx expo install --fix` to pull
   SDK-compatible versions of every `expo-*` + RN + react/react-dom.
2. Re-pin the deliberately-newer deps (sentry, flash-list, reanimated) to the
   SDK-compatible-or-newer version; re-run `expo install --check`.
3. Bump `jest-expo` + `babel-preset-expo` to the SDK line; then attempt the
   now-unblocked `jest` 30 / `@types/*` bumps.
4. `tsc` + `jest` green, then **build and smoke-test on real iOS + Android**
   (native rebuild — cannot be verified from unit tests alone). See
   `docs/DEVICE-TESTING.md`.
5. Consider SDK 56 in a follow-up once 55 is stable (Hermes v1 + animation
   backend are perf wins but add their own validation surface).

Sources: Expo changelog SDK 55 / SDK 56; RN New Architecture guide.
