# Hybrid Shell — Architecture

ObjectOS Mobile 2.x is a **native shell around the web Console**. Business UI
(lists, forms, record pages, dashboards, approvals, AI-authored pages) is
rendered by the Console, served by the ObjectOS server at `/_console/`. The
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
  server-config.tsx   native server picker: address step, then confirm step
  console.tsx         the Console screen (one long-lived WebView)
  +native-intent.tsx  app links → Console routes
components/shell/
  ConsoleWebView.tsx  WebView + navigation policy + bridge + back button + load states
  ServerConfirm.tsx   "is this your server?" step of the picker
  OfflineFallback.tsx native page for network / 5xx failures
lib/
  server-probe.ts     anonymous probe of a server before it is saved
  server-url.ts       persistence of the chosen server URL
lib/shell/
  console-url.ts      server URL normalisation, Console URL ⇄ route
  route-owner.ts      per-route ownership: web (default) or native
  native-screens.ts   native screens a route rule may target (empty today)
  navigation-policy.ts what each WebView navigation is allowed to do
  incoming-link.ts    objectos:// links
  config.ts           build-time config from app.config.ts `extra`
  external.ts         open URLs in the in-app browser / OS
  bridge/             protocol, injected scripts, native handler
```

## Session and auth

The Console is same-origin with the API and authenticates with the session
cookie. The WebView keeps that cookie (`sharedCookiesEnabled` on iOS,
`thirdPartyCookiesEnabled` on Android), so **the shell holds no API credential
and makes no authenticated API calls of its own** — its only requests are the
anonymous server probe below. Sign-in, sign-up, 2FA and password reset are the
Console's pages.

## Server selection

The picker (`app/server-config.tsx`) has two steps, and the server is saved
only when the user confirms the second.

1. **Address.** The typed address is normalized (`normalizeServerUrl`: https
   added, a pasted Console link cut at `/_console`, plain http refused except
   for local hosts) and probed by `probeServer` (`lib/server-probe.ts`).
2. **Confirm.** `ServerConfirm` shows who answered: the logo (or the initial on
   the brand colour), the product name, the full URL, a lock row for https, the
   sign-in methods and the platform version. "Connect and sign in" saves the
   server and opens the Console; "Not this server" goes back with the address
   kept.

The probe reads three anonymous endpoints, sends no cookie, and never throws:

| Endpoint                       | Body                                                                    | Used for                           |
| ------------------------------ | ----------------------------------------------------------------------- | ---------------------------------- |
| `GET /.well-known/objectstack` | `{ success: true, data: { name, version, routes, … } }`                 | is this ObjectOS; platform version |
| `GET /api/v1/runtime/config`   | bare `{ branding: { productName, logoUrl, brandColor }, … }`            | name, logo, colour (best-effort)   |
| `GET /api/v1/auth/config`      | `{ success: true, data: { emailPassword, socialProviders, features } }` | sign-in methods (best-effort)      |

Discovery alone decides whether the host is an ObjectOS server: a 4xx, a body
that is not JSON, or JSON without the envelope, `name`, `version` and `routes`
is "not an ObjectOS server". A redirect of the discovery request to another
origin (apex → www, http → https) is adopted as the server URL
(`serverUrlAfterRedirect`); a redirect onto plain http to a public host is
refused like typed http.

Each outcome has its own copy (`serverConfig.error.<kind>`): `not-objectos`,
`unreachable` (with the VPN hint), `tls` (certificate invalid), `timeout`
(8 s per request), `server-error` (5xx), `insecure-http`, `empty`,
`invalid`.

React Native's `fetch` reports every transport failure as the same
`TypeError: Network request failed`, so a certificate error would read as
"unreachable". The picker therefore injects `xhrFetch`, a transport over RN's
`XMLHttpRequest`, which keeps the native error text (iOS `NSURLErrorDomain`,
Android `javax.net.ssl` / `java.security.cert`) for the probe to classify.

The QR scanner is not built yet; its button and the `objectos://connect` link
will feed the scanned address into the same probe and confirm steps.

Sign-in through an external identity provider: the IdP's host must be listed in
`EXPO_PUBLIC_TRUSTED_HOSTS`, or the navigation policy opens it in the system
browser and the session cookie never reaches the WebView. Providers that refuse
embedded WebViews (Google) need the `ASWebAuthenticationSession` flow — tracked
as follow-up work.

## Navigation policy

Every navigation the page attempts goes through `decideNavigation`
(`lib/shell/navigation-policy.ts`):

| Target                                                      | Decision         |
| ----------------------------------------------------------- | ---------------- |
| Console route on the configured server, owned by web        | load             |
| Console route owned by a native screen                      | open that screen |
| Other path on the configured server (auth callbacks, files) | load             |
| Host in `EXPO_PUBLIC_TRUSTED_HOSTS`                         | load             |
| Any other http(s) page (top frame)                          | in-app browser   |
| Sub-frame (embedded map, preview)                           | load             |
| `mailto:` `tel:` `sms:` app schemes (top frame)             | OS               |
| `javascript:` `file:` `intent:` top-frame `data:`           | block            |

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

The shell injects `window.ObjectStackNative` through
`injectedJavaScriptBeforeContentLoaded` (main frame only). On iOS that is a
document-start user script, so it runs before the Console's own scripts. On
Android, react-native-webview (13.16) has no document-start script: it
evaluates the script from `onPageStarted`, which usually but not always lands
before the page's first scripts. The same idempotent bootstrap is therefore
also passed as `injectedJavaScript`, so the bridge exists by the time the page
has loaded. Its presence is how the Console knows it runs in the shell.

```ts
interface ObjectStackNative {
  version: number; // BRIDGE_PROTOCOL_VERSION — bumps only on breaking change
  platform: "ios" | "android";
  appVersion: string;
  installId: string | null; // random per-install id (UUID v4) — see "Install id"
  capabilities: readonly string[]; // methods and shell events; feature-detect with has()
  safeArea: { top: number; bottom: number; left: number; right: number };
  has(capability: string): boolean;

  getPushToken(): Promise<{ token: string; vendor: "apns" | "fcm" } | null>;
  haptic(
    kind: "light" | "medium" | "heavy" | "selection" | "success" | "warning" | "error"
  ): Promise<null>;
  openExternal(url: string): Promise<null>; // http(s), mailto, tel, sms
  navigate(route: string): Promise<null>; // Console route; route ownership applies
  resetServer(): Promise<null>; // forget the server, back to the picker

  ready(): void; // event: page is interactive (hides the loading cover)
  routeChanged(route: string): void; // event: SPA route changed
}
```

Safe-area insets are also published as CSS variables:
`--os-native-safe-top|bottom|left|right`.

### Install id

`installId` is a random UUID v4 the shell generates on first launch
(`lib/install-id.ts`) and keeps in SecureStore, outside the WebView, so it
survives the WebView's storage (cookies, localStorage, IndexedDB) being
cleared. The Console sends it as the device registry's `deviceId`, so a
re-registration refreshes the device's row instead of minting a second one.

- Not a hardware identifier and not an advertising id: it comes from the
  platform's CSPRNG and identifies nothing outside this install.
- Android drops it with the app's data (uninstall, "clear storage"; a value
  restored from a backup cannot be decrypted and is regenerated). iOS keychain
  items can outlive an uninstall, so a reinstall may keep it. It is stored
  `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`: never restored onto another device.
- `null` when secure storage could not be read or written when the WebView
  was created (the Console then falls back to a server-minted `deviceId`).
- Read-only, and only for the Console: the bootstrap runs in every main-frame
  document (a trusted sign-in host's pages too), so it exposes `installId`
  only when `window.location.origin` is the configured server's origin; any
  other page reads `null`. Sub-frames never see host info (Known limits).

### Shell → Console events

When a notification tap, an app link or a bridge `navigate()` asks for a
Console route while the page is loaded, the shell dispatches on `window`:

```ts
new CustomEvent("objectstack-native:navigate", {
  detail: { route: "/apps/crm/lead/123" }, // a Console route, query/fragment kept
  cancelable: true,
});
```

A Console that handles it navigates with its own router and calls
`event.preventDefault()`; nothing else happens, and the bundle is not
reloaded. If no listener cancels the event (an older Console, or the route is
not one its router knows), the shell falls back to
`window.location.assign(<server>/_console<route>)`, a full page load. The
route has passed `safeConsoleRoute` before the event is dispatched
(`buildNavigateScript` in `bridge/scripts.ts`).

When the OS reports a push token for the app — APNs / FCM rotated it — the
shell dispatches, if the page announces the `pushTokenChanged` capability:

```ts
new CustomEvent("objectstack-native:pushTokenChanged", {
  detail: { token: "…", vendor: "apns" }, // same shape as getPushToken()
});
```

The Console re-registers `detail` under the signed-in session (with
`deviceId = installId`). Rules:

- Delivered only to a page on the configured server's origin, the same pages
  `getPushToken()` answers; another page in the main frame (a trusted sign-in
  host) gets nothing.
- Delivered after the page's `ready()`, when the Console's listeners are
  mounted. A token reported earlier — cold start, a reload, the failure page —
  is held (the latest only) and delivered at `ready()`.
- It can repeat an unchanged token: iOS reports every completed registration,
  including the one `getPushToken()` triggers, and Android replays the last
  known token when the shell starts listening. Registration is idempotent, so
  treat every event as "register this token".
- Not cancelable; the shell does nothing else with it.

Shell events are named `objectstack-native:<capability>`
(`SHELL_EVENTS` in `bridge/protocol.ts`).

### Wire format

Calls are posted as
`{ type: 'call', id, method, args }` through
`window.ReactNativeWebView.postMessage`; the shell answers by calling
`window.__objectstackNativeResolve({ id, ok, value | error })`. Errors carry a
`code`: `unknown_method`, `bad_args`, `failed`.

Security:

- The handler answers only pages on the configured server's origin (default
  ports ignored). A call from anything else gets no answer at all — a reply runs
  in the main frame, where its id could settle one of the Console's own calls —
  and events from it are dropped.
- Messages over 64 KB or not matching the protocol are ignored.
- Arguments are validated per method (URL schemes, haptic kinds). A route —
  from `navigate`, an app link or a notification — must pass
  `safeConsoleRoute` (`lib/shell/console-url.ts`): a `/` path with no `.` /
  `..` segment (raw or percent-encoded), backslash or control character, so it
  cannot resolve outside `<server>/_console/`. `consoleUrl` applies the same
  check before building any URL.
- Results are spliced into the page as escaped JSON (`toScriptLiteral`).

Adding a method: add it to `BRIDGE_METHODS` (it becomes a capability of the
same name), handle it in `bridge/handler.ts`, expose it in the bootstrap
(`bridge/scripts.ts`), and document it here. That is additive — no protocol
version bump.

Adding a shell → Console event: add its name to `SHELL_EVENTS` (it becomes a
capability of the same name and the DOM event `objectstack-native:<name>`),
build its dispatch script in `bridge/scripts.ts` (origin-checked when it
carries data only the Console should see), deliver it from `ConsoleWebView`,
and document it here. Also additive.

### User-agent marker

The WebView appends `ObjectStackShell/<appVersion>` to its user agent
(`applicationNameForUserAgent` in `ConsoleWebView.tsx`). This is a contract:
the token stays `ObjectStackShell` whatever the app is called, and the test
in `__tests__/components/ConsoleWebView.test.tsx` pins it.

- It is readable synchronously from the document's first script
  (`navigator.userAgent`) and by the server on every request, so it answers
  "am I in the shell?" before the bridge exists — Android may inject the
  bridge after the page's first scripts (Known limits).
- It says nothing about capabilities: detect those with
  `ObjectStackNative.has()`.
- Never a security signal: any client can send it.

### Service Workers: none inside the shell

Rule: the Console registers no Service Worker inside the shell, and
unregisters one it registered earlier in the same WebView. Why:

- **Android WebView** supports Service Workers. A worker that answers the
  document from its cache while offline means the WebView's `onError` never
  fires, so the shell's offline page (`OfflineFallback`) never shows and its
  retry-on-reconnect never runs: the shell's failure handling is masked.
- **iOS WKWebView** exposes no `navigator.serviceWorker` to an app without
  App-Bound Domains, so a worker would only ever exist on one platform.
- Offline and push are the shell's: push arrives through APNs / FCM natively,
  not through a worker's `push` handler.

The Console's gate (objectstack-ai/objectstack#29326, in review) reads
`window.ObjectStackNative` after boot. Because
Android can inject the bridge late, the first load can still register a worker
that the next load removes. Reading the user-agent marker as well closes that
window, since it is there from the first byte.

## Console-side integration (framework repository)

The Console needs, in `@object-ui/mobile`:

- a `useNativeHost()` hook that detects `window.ObjectStackNative`;
- in the shell: hide desktop chrome, pad with the safe-area variables, call
  `ready()` once interactive and `routeChanged()` on navigation;
- listen for `objectstack-native:navigate` on `window`, navigate to
  `event.detail.route` with the Console router, and call
  `event.preventDefault()` (otherwise the shell reloads the page at the
  route);
- register the push token after sign-in (`getPushToken()` → the server's device
  registry, with `deviceId = installId` when it is a string) and unregister on
  sign-out;
- listen for `objectstack-native:pushTokenChanged` when
  `has("pushTokenChanged")` and re-register `event.detail` while signed in;
- register no Service Worker inside the shell (see above).

Until then the shell works without it: the loading cover lifts on the WebView's
own load event and the shell pads the WebView with the safe area itself.

## Push notifications

See [PUSH-NOTIFICATIONS.md](./PUSH-NOTIFICATIONS.md).

## Testing

- Pure modules (`lib/shell/**`, the server probe, push, stores) — unit tests
  under `__tests__/lib`.
- The picker and its confirm step — component tests under
  `__tests__/components` (`ServerConfigScreen`, `ServerConfirm`).
- The bootstrap and navigate scripts are executed against a fake `window` in
  `__tests__/lib/shell/bridge-scripts.test.ts`.
- `ConsoleWebView` is tested with a mocked `react-native-webview`
  (`__tests__/components/ConsoleWebView.test.tsx`).
- On-device checks: [DEVICE-TESTING.md](./DEVICE-TESTING.md).

## Known limits

- **Android injection timing.** react-native-webview evaluates the early
  bootstrap at `onPageStarted`, not as a document-start script, so it can land
  after the Console's first scripts; it is guaranteed only once the page has
  loaded (`injectedJavaScript`). The Console should check for
  `window.ObjectStackNative` when it needs it, not only once at module load.
- **Recovery re-creates the WebView.** After a load failure ("Try again", or
  the network coming back) or a dead web content process, the WebView is
  re-created at the route a notification or link asked for meanwhile, else at
  the last Console route it reported. In-page state and history are lost.
- **Android reports every navigation as top-frame.** react-native-webview
  always sends `isTopFrame: true` on Android, so a cross-origin iframe
  navigation is treated as a top-frame one (opened outside, not in the frame).
- **Old Android WebViews cannot tell an iframe's bridge message from the
  page's.** Without `WebMessageListener` support, the message URL is the main
  frame's, so the origin check sees the Console's origin for any frame.
- **Host info reaches main-frame documents only.** The bootstrap is injected
  into the main frame only: iOS adds it as a main-frame-only user script, and
  Android evaluates it in the main frame from `onPageStarted`
  (react-native-webview 13.16 supports nothing else there). No bridge method
  returns host info, and a cross-origin sub-frame cannot read the main frame's
  `window`. A trusted host's page in the main frame gets the non-identifying
  fields (`platform`, `appVersion`, `capabilities`, `safeArea`), and `null` for
  `installId`.
- **Downloads and file inputs** rely on the WebView defaults until the
  Phase 4 bridge methods land.
