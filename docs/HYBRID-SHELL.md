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
  connect-scan.tsx    QR scanner for the server address (screen 6)
  bridge-scan.tsx     scanner for the bridge's `scan()` (Console fields)
  console.tsx         the Console screen (one long-lived WebView)
  +native-intent.tsx  app links → Console routes
components/shell/
  ConsoleWebView.tsx  WebView + navigation policy + bridge + back button + load states
  ServerConfirm.tsx   "is this your server?" step of the picker
  QrScanner.tsx       full-screen camera QR scanner (reusable; `accept` decides)
  OfflineFallback.tsx native page for network / 5xx failures
lib/
  i18n.ts             shell strings in the Console's ten locales; follows the phone language
  rtl.ts              right-to-left layout for Arabic
  server-probe.ts     anonymous probe of a server before it is saved
  server-url.ts       persistence of the chosen server URL
lib/shell/
  console-url.ts      server URL normalisation, Console URL ⇄ route
  console-load.ts     load states: loading cover, held route and push token, last route
  route-owner.ts      per-route ownership: web (default) or native
  native-screens.ts   native screens a route rule may target (empty today)
  navigation-policy.ts what each WebView navigation is allowed to do
  incoming-link.ts    objectos:// links: Console routes, `connect`, scanned codes
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

## Language

The shell translates only its own native screens (server picker, confirm step,
loading and offline pages); everything inside the WebView is the Console's.

- **The locale set mirrors the Console UI's.** The shell ships the same ten
  locales under the same short codes as the Console's built-in catalogues
  (objectstack `ui/packages/i18n/src/locales/`): `en`, `zh`, `ja`, `ko`, `de`,
  `fr`, `es`, `pt`, `ru`, `ar`. A test pins `SUPPORTED_LANGUAGES` to that list,
  and another fails when any bundle in `locales/` misses a key `en.json` has —
  a new native string ships in all ten.
- **The phone language decides, with the Console's matching rule.** The shell
  walks the phone's preferred languages in order and takes the first one that
  resolves to a bundled locale, else `en`. A tag resolves exactly, else through
  its base language: the Console's `matchLanguageTag`
  (`ui/packages/i18n/src/locales/registry.ts`), ported as is. So `zh-Hans-CN` →
  `zh`, `pt-BR` → `pt`, `es-MX` → `es`, and Traditional Chinese (`zh-TW`,
  `zh-HK`, `zh-Hant`) → `zh`, because the Console has no Traditional Chinese
  catalogue either.
- **No in-app language picker.** The phone setting is the only source for the
  native screens. A phone-language change is picked up the next time the app
  comes to the foreground.
- **Arabic lays out right-to-left.** Each native screen root carries Yoga's
  `direction` style for the current language, so the switch applies on first
  render and on a language change without a restart. `I18nManager.forceRTL` is
  kept in step as well; what reads it (for example the navigation stack's
  transition direction) follows on the next launch.
- **Once signed in, the user's Console locale wins inside the Console.** The
  Console resolves its own language: the user's `sys_user.locale`, else the
  request's `Accept-Language` (the WebView's own; the shell does not set it), else
  the deployment default. So a user whose Console locale differs from the
  phone sees the native screens in the phone's language and the Console in
  their own. Built-in object and field labels exist in fewer locales than the
  Console chrome; that gap is the platform's, not the shell's.

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

### Connect by QR code or link

The Console's mobile-app page shows a QR code, and an invite email carries the
same link. It holds the server address and nothing else — never a credential:

```
objectos://connect?server=https%3A%2F%2Ferp.example.com
```

Both end on the picker's address step with the address filled in, which
probes it at once (`/server-config?server=…&n=…`; `n` makes a repeat of the
same address probe again). **A connect link never connects silently**: the
user always sees the confirm step, or the error beside the address. That holds
when a server is already saved too — confirming replaces it, "Not this server"
keeps it. A link can cold-start the app onto the picker with nothing behind it;
when a server is saved and the picker cannot go back, the address step offers
"Back to" the saved host (Android back does the same), which opens that
server's Console and saves nothing.

- **The link.** `connectRequestFromLink` (`lib/shell/incoming-link.ts`) reads
  the `server` param and normalizes it with `normalizeServerUrl`. A link with
  no `server`, a repeated `server`, any other param, or a path after `connect`
  is refused and lands on the start screen, like any unknown link. An address
  that does not normalize (plain http to a public host, not a URL, empty) still
  opens the picker, with the value in the field and its error shown.
- **The scanner.** The scan button in the address field opens
  `app/connect-scan.tsx`, which renders `QrScanner` with
  `serverAddressFromCode`: it accepts `objectos://connect` codes, and a plain
  `https://` server URL as a convenience. Anything else shows "This isn't a
  connect QR code" and keeps scanning. The first accepted code goes back to the
  picker (`router.dismissTo`) and the scanner stops reading.
- **Camera permission.** The scanner asks on open. Refused for good, it offers
  the system Settings and "Enter address manually". The iOS prompt text is
  `permissions.camera` in each locale bundle, written by `app.config.ts` into
  the `expo-camera` plugin and per-language `InfoPlist.strings` for all ten
  shell languages (`zh-Hans`, plus `zh-Hant` reusing the `zh` text, as the
  shell's own strings do); the plugin is
  configured for the camera only (no microphone, no `RECORD_AUDIO`).

`QrScanner` knows nothing about servers: the caller passes `accept`, the
refusal text, the optional note and manual action, and optionally the code
formats and the permission panel's copy. The bridge's `scan()` for Console
fields reuses it (see "Scanning codes"). The iOS prompt text names both uses.

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
  scan(opts?: { formats?: string[] }): Promise<string | null>; // see "Scanning codes"

  ready(): void; // event: the Console has mounted (lifts the cover, releases a held route)
  routeChanged(route: string): void; // event: SPA route changed (the shell's last route)
}
```

Safe-area insets are also published as CSS variables:
`--os-native-safe-top|bottom|left|right`. They are informational: the shell
pads the WebView with the safe area itself (see "Safe area"), so a page must
not pad with them again.

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

### Scanning codes

`scan()` opens a native full-screen scanner (`app/bridge-scan.tsx`, the same
`QrScanner` as screen 6) with close and torch controls. It resolves the decoded
text of the first code read, or `null` when the user closes the scanner
(the close control, Android back or the iOS swipe).

- `formats` narrows what the camera reads. The names are `expo-camera`'s:
  `qr`, `aztec`, `datamatrix`, `pdf417`, `ean13`, `ean8`, `upc_a`, `upc_e`,
  `code39`, `code93`, `code128`, `codabar`, `itf14` (`SCAN_FORMATS`). Without
  `formats` it reads all of them. An empty list, an unknown name or any other
  option is `bad_args`, and no scanner opens.
- Camera permission refused: the scanner shows its permission panel (with
  Settings when the refusal is final), and leaving it rejects the call with
  `failed` ("Camera permission denied"). Closed before the prompt was
  answered, it resolves `null`.
- One scan at a time: a `scan()` while another is open rejects with `failed`
  ("A scan is already open") and leaves the open one alone.
- The answer goes only to the document that called. Call ids carry a
  per-document token, so a page that replaced it while the scanner was up (a
  reload, a redirect) cannot match the answer, and a WebView re-created after
  a failure is not sent it at all. The Console's pending promise went away
  with the old page.
- Like every method, only a page on the configured server's origin is
  answered. The scanner never opens for anything else.

```js
if (ObjectStackNative.has("scan")) {
  const text = await ObjectStackNative.scan({ formats: ["ean13", "code128"] });
  if (text !== null) field.value = text;
}
```

### Shell → Console events

When a notification tap, an app link or a bridge `navigate()` asks for a
Console route once the page is ready (see "Load states"), the shell
dispatches on `window`:

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
- Delivery follows the load state machine (see "Load states"): sent at once
  in the `ready` phase, when the Console's listeners are mounted. A token
  reported in any other phase — cold start, a reload, a re-created WebView,
  the failure page — is held (the latest only) and sent on entering `ready`:
  at `ready()`, or at the ready timeout for a Console that never posts it. A
  held token survives a re-created WebView.
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
`code`: `unknown_method`, `bad_args`, `failed`. A call id is a per-document
token and a counter (`<token>.<n>`), so an answer settles only a call of the
document that made it.

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

### Load states

`lib/shell/console-load.ts` is one state machine for the loading cover, a held
route, a held push token and the last route:

| Phase     | Entered on                                   | Cover | A requested route    |
| --------- | -------------------------------------------- | ----- | -------------------- |
| `loading` | mount, `reload()`, a re-created WebView      | up    | held                 |
| `loaded`  | the WebView's load end                       | up    | held                 |
| `ready`   | `ready()`, or 8 s after load end without it  | down  | dispatched to page   |
| `failed`  | a network error or a 5xx on the document     | —     | held for the next WebView |

- **Why the cover waits for `ready`.** The Console boots after its document
  has loaded (boot round-trips, then the first render), and its
  `objectstack-native:navigate` listener mounts with that first render. A
  route dispatched at load end goes unhandled and the fallback reloads the
  page, so a held route — a notification tap on cold start — waits for
  `ready` too. `ready` that arrives before load end counts.
- **Timeout.** A Console that never posts `ready` (one older than shell mode,
  or a boot that failed before the app mounted) gets the cover lifted and the
  held route dispatched `READY_TIMEOUT_MS` (8 s) after load end. A held route
  is dispatched once, whichever comes first; a held push token is sent at the
  same moment. The timeout does not run before load end or on a failed load.
- **What re-arms the hold.** The shell's own `reload()` and a re-created
  WebView. The machine's re-create is also the one place that counts a new
  WebView for bridge answers: an answer to a call the old WebView made is
  dropped (see "Scanning codes"). `onLoadStart` does neither: on Android
  react-native-webview (13.16) fires it from `doUpdateVisitedHistory`, so it
  also fires for SPA history changes, after which no second `ready` comes. A full-document load the page
  starts by itself after `ready` (an older Console's `location.assign`
  fallback, an identity-provider round trip) is not seen as a new document:
  the cover stays down, and a route or token sent during that load is lost
  with the old document.
- **Last route.** Once the page has posted `routeChanged`, its `route` is the
  last route; WebView navigation state (which misses SPA `pushState` on some
  engines) is used only until then. A re-created WebView starts at the held
  route, else at the last route.

## Safe area

The shell owns the safe area: it pads the WebView natively with the top and
bottom insets, and the failure page with the top inset. The Console adds no
padding of its own; `--os-native-safe-*` and `ObjectStackNative.safeArea` are
informational. Handing the padding to the Console would need a handshake, so
that a Console older than the change does not lose its padding.

## Console-side integration (framework repository)

The Console needs, in `@object-ui/mobile`:

- a `useNativeHost()` hook that detects `window.ObjectStackNative`;
- in the shell: hide desktop chrome, call `ready()` once its router has
  mounted and `routeChanged()` on navigation; do not pad for the safe area
  (the shell does);
- listen for `objectstack-native:navigate` on `window`, navigate to
  `event.detail.route` with the Console router, and call
  `event.preventDefault()` (otherwise the shell reloads the page at the
  route);
- register the push token after sign-in (`getPushToken()` → the server's device
  registry, with `deviceId = installId` when it is a string) and unregister on
  sign-out;
- listen for `objectstack-native:pushTokenChanged` when
  `has("pushTokenChanged")` and re-register `event.detail` while signed in;
- register no Service Worker inside the shell (see above);
- offer a scan affordance on text and lookup fields when `has("scan")`, and
  fill the field with what `scan()` resolves (nothing on `null`).

A Console without it still works in the shell: the cover lifts and a held
route is dispatched at the ready timeout, a held route then reloads the page
at that route, and the last route comes from WebView navigation state.

## Push notifications

See [PUSH-NOTIFICATIONS.md](./PUSH-NOTIFICATIONS.md).

## Testing

- Pure modules (`lib/shell/**`, the server probe, push, stores) — unit tests
  under `__tests__/lib`. The load state machine:
  `__tests__/lib/shell/console-load.test.ts`.
- The picker and its confirm step — component tests under
  `__tests__/components` (`ServerConfigScreen`, `ServerConfirm`).
- Locale list, phone-language matching and bundle completeness —
  `__tests__/lib/i18n.test.ts`; right-to-left native screens under `ar` —
  `__tests__/components/RtlLayout.test.tsx`.
- The scanner and screen 6 — `__tests__/components/QrScanner.test.tsx`, with a
  mocked `expo-camera` (permission states, refused and accepted codes, torch).
- The bridge's `scan()`: the handler (`bridge-handler.test.ts`), the session
  (`scan-session.test.ts`) and the scanner screen (`QrScanner.test.tsx`).
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
  the last Console route (`routeChanged`, else WebView navigation state). In-page
  state and history are lost.
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
