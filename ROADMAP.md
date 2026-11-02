# ObjectStack Mobile — Roadmap

> 2.x: hybrid shell around the web Console. Decision record: the native
> metadata renderer (1.x) could not keep pace with the platform — it ended on
> `@objectstack/*` 9.0.1 while the platform shipped 18.x, its push registration
> called a client method the platform had removed, and page kinds such as
> `kind:'react'` cannot be rendered natively at all. 1.x is preserved on
> `legacy/native-renderer`.

## Phase 1 — Shell skeleton ✅

- Server picker (bare host / URL / pasted Console link, https enforced for public hosts)
- Long-lived Console WebView with cookie session, loading cover, offline and
  server-error pages, auto-retry on reconnect, content-process recovery
- Navigation policy (in-app browser for other sites, OS for `mailto:`/`tel:`,
  dangerous schemes blocked, trusted IdP hosts)
- Android back / iOS swipe-back through Console history
- Route ownership seam (every route web today) and native-screen registry
- Bridge v1: `getPushToken`, `haptic`, `openExternal`, `navigate`, `resetServer`,
  `ready` / `routeChanged` events, safe-area CSS variables
- Native device push token + tap routing to Console routes; app links
  (`objectstack://open?route=…`, `objectstack://console/…`)
- Sentry, i18n (en / zh / ar)

## Phase 2 — Console integration (framework repository)

- `@object-ui/mobile`: `useNativeHost()`; shell mode hides desktop chrome, uses
  safe-area variables, calls `ready()` / `routeChanged()`
- Mobile-width audit of the Console's key flows (approvals inbox, list, record,
  form, dashboard, notifications, search) at 375px, fixes included

## Phase 3 — Push end to end

- Server: device registry (`/notifications/devices`) + APNs/FCM channel (ADR-0012)
- Console: register the bridge token after sign-in, unregister on sign-out
- Notification payloads carry `route`
- Later: China-market vendor push (HMS / Xiaomi / OPPO / vivo)

## Phase 4 — Native capabilities

- Biometric app lock (reuses `lib/biometric-auth.ts`, `lib/app-lock.ts`)
- Bridge: `scan` (barcode / QR), `pickImage`, `openFile` / file download, `share`
- External IdP sign-in through `ASWebAuthenticationSession` / Custom Tabs

## Phase 5 — Release

- On-device verification of DEVICE-TESTING.md, App Store review build with
  demo server, store listings

## Later — native screens, earned by data

Telemetry per Console route (usage share, load time, jank). A route becomes a
native screen only when it carries heavy mobile traffic and still misses its
target on the web — following the rules in docs/HYBRID-SHELL.md.
