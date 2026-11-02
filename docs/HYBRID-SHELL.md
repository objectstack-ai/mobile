# Hybrid Shell — Architecture

ObjectStack Mobile 2.x is a **native shell around the web Console**. Business UI
(lists, forms, record pages, dashboards, approvals, AI-authored pages) is
rendered by the Console, served by the ObjectStack server at `/_console/`. The
shell does only what the web cannot do well: pick the server, host the page,
push notifications, OS integration, and native fallback pages.

The native metadata renderer that 1.x shipped is kept on the
`legacy/native-renderer` branch.

## Why a shell

- The Console is the platform's authoritative renderer. Page kinds such as
  `kind:'react'` run real React in the browser, and every spec property must be
  live in a renderer (ADR-0078). A second, native renderer has to re-implement
  the whole component registry and falls behind every release — 1.x ended nine
  majors behind the platform.
- With a shell, a platform release needs no mobile release: the Console updates
  with the server.

## Layout

```
app/
  _layout.tsx         providers, Sentry, push-tap routing
  index.tsx           waits for the stored server, then redirects
  server-config.tsx   native server picker
  console.tsx         the Console screen (one long-lived WebView)
  +native-intent.tsx  app links → Console routes
components/shell/
  ConsoleWebView.tsx  WebView + navigation policy + bridge + back button + load states
  OfflineFallback.tsx native page for network / 5xx failures
lib/shell/
  console-url.ts      server URL normalisation, Console URL ⇄ route
  route-owner.ts      per-route ownership: web (default) or native
  native-screens.ts   native screens a route rule may target (empty today)
  navigation-policy.ts what each WebView navigation is allowed to do
  incoming-link.ts    objectstack:// links
  config.ts           build-time config from app.config.ts `extra`
  external.ts         open URLs in the in-app browser / OS
  bridge/             protocol, injected scripts, native handler
```

## Session and auth

The Console is same-origin with the API and authenticates with the session
cookie. The WebView keeps that cookie (`sharedCookiesEnabled` on iOS,
`thirdPartyCookiesEnabled` on Android), so **the shell holds no API credential
and makes no API calls of its own**. Sign-in, sign-up, 2FA and password reset
are the Console's pages.

Sign-in through an external identity provider: the IdP's host must be listed in
`EXPO_PUBLIC_TRUSTED_HOSTS`, or the navigation policy opens it in the system
browser and the session cookie never reaches the WebView. Providers that refuse
embedded WebViews (Google) need the `ASWebAuthenticationSession` flow — tracked
as follow-up work.

## Navigation policy

Every navigation the page attempts goes through `decideNavigation`
(`lib/shell/navigation-policy.ts`):

| Target | Decision |
|---|---|
| Console route on the configured server, owned by web | load |
| Console route owned by a native screen | open that screen |
| Other path on the configured server (auth callbacks, files) | load |
| Host in `EXPO_PUBLIC_TRUSTED_HOSTS` | load |
| Any other http(s) page (top frame) | in-app browser |
| Sub-frame (embedded map, preview) | load |
| `mailto:` `tel:` `sms:` app schemes (top frame) | OS |
| `javascript:` `file:` `intent:` top-frame `data:` | block |

## Route ownership — growing native screens

`lib/shell/route-owner.ts` decides who renders each Console route. Today every
route is web. To make a route native:

1. Add the screen under `app/` and register it in `NATIVE_SCREENS`
   (`lib/shell/native-screens.ts`). It receives the Console route as the
   `route` search param.
2. Add a rule: `{ pattern: '/approvals/*', owner: 'native', screen: 'approvals' }`.

Rules every native screen follows:

- **Fixed scenario, not a renderer.** A native screen covers one high-traffic,
  stable flow; it never interprets arbitrary page metadata.
- **Fall back, never drop.** Anything the screen does not support (an unknown
  field type, component or page kind) offers "open the full page", which shows
  the Console route in the WebView. A rule that names a screen the build lacks
  already resolves to web.
- **Narrow, tested contract.** A native screen calls few, stable endpoints, with
  a contract test that runs against each framework release.
- **Earned by data.** Make a route native when telemetry shows heavy mobile use
  and the web version still misses its performance target.

## Native bridge

The shell injects `window.ObjectStackNative` before the Console's own scripts
run (`injectedJavaScriptBeforeContentLoaded`, main frame only). Its presence is
how the Console knows it runs in the shell.

```ts
interface ObjectStackNative {
  version: number;                 // BRIDGE_PROTOCOL_VERSION — bumps only on breaking change
  platform: 'ios' | 'android';
  appVersion: string;
  capabilities: readonly string[]; // feature-detect with has()
  safeArea: { top: number; bottom: number; left: number; right: number };
  has(capability: string): boolean;

  getPushToken(): Promise<{ token: string; vendor: 'apns' | 'fcm' } | null>;
  haptic(kind: 'light'|'medium'|'heavy'|'selection'|'success'|'warning'|'error'): Promise<null>;
  openExternal(url: string): Promise<null>;  // http(s), mailto, tel, sms
  navigate(route: string): Promise<null>;    // Console route; route ownership applies
  resetServer(): Promise<null>;              // forget the server, back to the picker

  ready(): void;                   // event: page is interactive (hides the loading cover)
  routeChanged(route: string): void; // event: SPA route changed
}
```

Safe-area insets are also published as CSS variables:
`--os-native-safe-top|bottom|left|right`.

Wire format: calls are posted as
`{ type: 'call', id, method, args }` through
`window.ReactNativeWebView.postMessage`; the shell answers by calling
`window.__objectstackNativeResolve({ id, ok, value | error })`. Errors carry a
`code`: `unknown_method`, `bad_args`, `forbidden_origin`, `failed`.

Security:

- The handler answers only pages on the configured server's origin; anything
  else gets `forbidden_origin` and events from it are dropped.
- Messages over 64 KB or not matching the protocol are ignored.
- Arguments are validated per method (URL schemes, route shape, haptic kinds).
- Results are spliced into the page as escaped JSON (`toScriptLiteral`).

Adding a method: add it to `BRIDGE_METHODS` (it becomes a capability of the
same name), handle it in `bridge/handler.ts`, expose it in the bootstrap
(`bridge/scripts.ts`), and document it here. That is additive — no protocol
version bump.

## Console-side integration (framework repository)

The Console needs, in `@object-ui/mobile`:

- a `useNativeHost()` hook that detects `window.ObjectStackNative`;
- in the shell: hide desktop chrome, pad with the safe-area variables, call
  `ready()` once interactive and `routeChanged()` on navigation;
- register the push token after sign-in (`getPushToken()` → the server's device
  registry) and unregister on sign-out.

Until then the shell works without it: the loading cover lifts on the WebView's
own load event and the shell pads the WebView with the safe area itself.

## Push notifications

See [PUSH-NOTIFICATIONS.md](./PUSH-NOTIFICATIONS.md).

## Testing

- Pure modules (`lib/shell/**`, push, stores) — unit tests under `__tests__/lib`.
- The bootstrap script is executed against a fake `window` in
  `__tests__/lib/shell/bridge-scripts.test.ts`.
- `ConsoleWebView` is tested with a mocked `react-native-webview`
  (`__tests__/components/ConsoleWebView.test.tsx`).
- On-device checks: [DEVICE-TESTING.md](./DEVICE-TESTING.md).

## Known limits

- **Android injection timing.** `injectedJavaScriptBeforeContentLoaded` uses
  the document-start script API where the system WebView supports it; on older
  WebViews it can land after the first page scripts. The Console should check
  for `window.ObjectStackNative` when it needs it, not only once at module load.
- **Retry reloads the start route.** After a load failure the WebView is
  re-created, so "Try again" opens the initial route rather than the last page.
- **Downloads and file inputs** rely on the WebView defaults until the
  Phase 4 bridge methods land.
