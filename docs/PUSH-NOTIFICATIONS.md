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
  Expo push token: the ObjectStack server delivers through APNs and FCM
  directly (ADR-0012).
- The Console asks for the token over the bridge once the user is signed in and
  registers it under its own session. The OS permission prompt therefore
  appears when the Console decides, and the shell needs no API credential.
- A notification's `data` names where a tap goes:
  - `route`: a Console route, e.g. `"/apps/crm/opportunity/123"` (preferred);
  - `url`: accepted only when it points into the configured server's Console.
  Anything else is ignored, so a notification cannot steer the shell to another
  site.

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
