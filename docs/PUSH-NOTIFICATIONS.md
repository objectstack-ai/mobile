# Push Notifications

## Flow

```
OS (APNs / FCM) ──native device token──▶ shell (lib/push-notifications.ts)
                                            │  bridge: getPushToken()
                                            ▼
                                   Console (signed in) ──register──▶ server device registry
server ──APNs / FCM──▶ device ──tap──▶ shell (hooks/usePushRouting.ts) ──route──▶ Console screen
```

- The shell obtains the **native** token (`getDevicePushTokenAsync`), not an
  Expo push token: the ObjectOS server delivers through APNs and FCM
  directly (ADR-0012).
- The Console asks for the token over the bridge once the user is signed in and
  registers it under its own session. The OS permission prompt therefore
  appears when the Console decides, and the shell needs no API credential.
- The Console registers with `deviceId = installId` (the bridge's host info,
  a random id the shell keeps in SecureStore), so clearing the WebView's
  storage does not create a second device row on the server.
- When APNs / FCM rotate the token, the shell dispatches
  `objectstack-native:pushTokenChanged` (`detail: { token, vendor }`, the
  `pushTokenChanged` capability) and the Console re-registers. The shell only
  listens (`Notifications.addPushTokenListener`); it never asks for a token
  on its own. Delivery rules: [HYBRID-SHELL.md](./HYBRID-SHELL.md#shell--console-events).
- A notification names where a tap goes with one of two keys (see the payload
  contract below):
  - `route`: a Console route, e.g. `"/apps/crm/opportunity/123"` (preferred);
  - `url`: accepted only when it points into the sending connection's Console.
    Anything else is ignored, so a notification cannot steer the shell to another
    site. A route must be a plain Console path: it starts with `/` (not `//`) and
    has no `.` / `..` segment (raw or percent-encoded), backslash or control
    character — the same check app links and the bridge's `navigate` use
    (`safeConsoleRoute` in `lib/shell/console-url.ts`).

- A notification names the server that sent it with `origin` (see "Which
  server a tap opens on" below). With several saved connections, every one of
  them registers the same device token, so this is the only way the shell can
  tell them apart.

## Which server a tap opens on

The platform's push data (`PushDeliveryDataSchema` in objectstack
`packages/spec/src/api/push-delivery.zod.ts`) carries an optional `origin`:
the origin the Console was loaded from when it registered the device
(`window.location.origin`, for example `https://crm.example.com` or
`http://localhost:3000`). The shell compares it byte for byte with each saved
connection's origin, `scheme://host[:port]` of its server URL
(`connectionByOrigin` in `lib/connections/model.ts`). There is no case folding,
port guessing or host-only match: the server sends the canonical form, and a
value in any other form matches nothing.

`pushTapTarget` (`lib/push-notifications.ts`) picks the connection, and
`hooks/usePushRouting.ts` acts on it:

| The push | Saved connections | The tap |
|:---|:---|:---|
| `origin` is the current connection's | any | opens the route there |
| `origin` is another saved connection's | any | switches to it (the switcher's path), then opens the route on its Console once that has loaded |
| `origin` is present, no saved connection has it (removed, or never saved) | any | opens nothing; the app shows and the route is dropped |
| no `origin` (a server older than the member) | exactly one | opens the route on it |
| no `origin` | two or more | opens nothing: the sender cannot be told |

- **The route goes to the new connection's Console, never the one being
  left.** The switch is made first. The WebView then re-creates itself on the
  new host and holds the route until that Console says it is ready (see "Load
  states" in HYBRID-SHELL.md). The navigate script only runs on the current
  connection's origin.
- **`origin` is a lookup key, nothing more.** The shell never connects to,
  saves or builds a URL from a server a push names, and the `route` / `url`
  checks above are unchanged.
- **A managed lock** (MDM `lockServer`, see "Managed deployment" in
  HYBRID-SHELL.md) leaves only the managed connection open to a tap. A push
  for any other saved connection is dropped and never switched to. While the
  managed address waits for its confirm step, every push is dropped.
- **The app lock.** A tap waits while the app lock's overlay is up, and is
  opened, switch included, once the user unlocks. The switcher cannot be
  reached while the app is locked either. Only the latest tap that waited is
  opened.
- **A cold start from a tap** follows the same rules, once the saved
  connections have loaded (and the app is unlocked). Each notification is
  opened at most once, across a switch too.
- A tap with no usable Console route switches nothing.

## Payload contract

`route` / `url` / `origin` are custom keys, delivered differently by each
transport.
`routeFromResponse` (`lib/push-notifications.ts`) reads, in order, the
notification's `content.data`, then the iOS `trigger.payload` (the full APNs
`userInfo`), its `body` dictionary, and last its `data` dictionary, and uses
the first valid one. `pushSenderFromResponse` reads `origin` in the same order. `userInfo.data` is off-contract (never put the key under
`data` on iOS); it is read only as a fallback, after the other three.

**APNs (iOS)** — put the key at the top level of the payload, beside `aps`:

```json
{
  "aps": { "alert": { "title": "New lead", "body": "Acme Corp" }, "sound": "default" },
  "route": "/apps/crm/lead/123",
  "origin": "https://crm.example.com"
}
```

expo-notifications exposes only `userInfo["body"]` as `content.data` on iOS
(`NotificationRecords.swift`), so a top-level key is read from
`trigger.payload`. Nesting it as `"body": { "route": "/apps/crm/lead/123" }` (a
dictionary, the Expo push-service shape) is accepted too.

**FCM (Android)** — put the key in the message's `data` map (string values):

```json
{
  "message": {
    "token": "…",
    "notification": { "title": "New lead", "body": "Acme Corp" },
    "data": { "route": "/apps/crm/lead/123", "origin": "https://crm.example.com" }
  }
}
```

expo-notifications copies the `data` map into `content.data`. Do not put a JSON
object string under `data.body` unless `route` is inside it: such a `body`
replaces the whole `data` map (the Expo push-service shape).

## Prerequisites

- **Server**: the device registry and the push channel (`/notifications/devices`,
  APNs + FCM transports). The framework client notes these routes were never
  built; they are the first follow-up for push to work end to end.
- **Console**: register / unregister the token through the bridge.
- **iOS**: push capability and an APNs key on the Apple developer account.
- **Android**: Firebase project; set `android.googleServicesFile` in
  `app.config.ts` so `getDevicePushTokenAsync` can return an FCM token.
- A **development build** (Expo Go cannot receive push for this app).

China-market Android vendors (HMS, Xiaomi, OPPO, vivo) are not covered by FCM;
they need a vendor SDK integration in the shell and matching server channels —
tracked as follow-up work.
