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
- A notification names where a tap goes with one of two keys (see the payload
  contract below):
  - `route`: a Console route, e.g. `"/apps/crm/opportunity/123"` (preferred);
  - `url`: accepted only when it points into the configured server's Console.
    Anything else is ignored, so a notification cannot steer the shell to another
    site. A route must be a plain Console path: it starts with `/` (not `//`) and
    has no `.` / `..` segment (raw or percent-encoded), backslash or control
    character — the same check app links and the bridge's `navigate` use
    (`safeConsoleRoute` in `lib/shell/console-url.ts`).

## Payload contract

`route` / `url` are custom keys, delivered differently by each transport.
`routeFromResponse` (`lib/push-notifications.ts`) reads, in order, the
notification's `content.data`, then the iOS `trigger.payload` (the full APNs
`userInfo`) and its `body` dictionary, and uses the first valid one.

**APNs (iOS)** — put the key at the top level of the payload, beside `aps`:

```json
{
  "aps": { "alert": { "title": "New lead", "body": "Acme Corp" }, "sound": "default" },
  "route": "/apps/crm/lead/123"
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
    "data": { "route": "/apps/crm/lead/123" }
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
