# Push Notifications

OS-level push (APNs on iOS, FCM on Android) delivered through Expo, registered
against the ObjectStack backend device registry.

## Architecture

```
OS (APNs / FCM)
   │  push token
   ▼
expo-notifications / expo-device
   │  acquirePushToken()
   ▼
lib/push-notifications.ts          ← React-free, unit-tested
   │  { token, platform }
   ▼
usePushNotifications (hook)        ← lifecycle + tap routing
   │  registerDevice(token, platform)
   ▼
useNotifications → client.notifications.registerDevice   ← backend registry
```

The split keeps OS concerns (`lib/`) testable and free of React, while the
hook owns lifecycle: permission → token → registration → tap handling.

## Behavior

- **Registration** runs only when signed in (`enabled: !!token` in the root
  layout), so anonymous users are never prompted.
- **Permission** is requested only when not already decided; a permanent denial
  is respected and never re-prompts.
- **Token** is acquired only on physical devices (simulators have no push
  hardware) and returns `null` otherwise — never throwing.
- **Taps** are handled for all three entry points — foreground, background, and
  cold start (`getLastNotificationResponseAsync`) — and routed via the
  notification's deep link.

## Deep links

Server-sent notifications carry a `data` payload. A navigable link is resolved
from either an explicit `data.url` or structured `data.objectName` /
`data.recordId` fields, producing an app-scheme URL
(`objectstack://objects/{objectName}/{recordId}`). The root layout opens it via
`expo-linking`, which expo-router resolves to the matching screen.

## Configuration

- `app.config.ts` registers the `expo-notifications` config plugin.
- EAS builds need a `projectId`; it is read from the Expo config at runtime
  (`Constants.expoConfig.extra.eas.projectId` / `easConfig.projectId`).
- Android uses a single `default` notification channel created at startup.

## Testing

- `__mocks__/expo-notifications.js` and `__mocks__/expo-device.js` are
  auto-applied by Jest for the node_modules packages.
- `__tests__/lib/push-notifications.test.ts` covers the pure helpers
  (permission flow, token acquisition guards, deep-link resolution).

## Not included

- In-app push settings toggle UI (preferences already exist via
  `useNotifications().updatePreferences`).
- Rich notification categories / actionable buttons.
- Badge-count reconciliation with the notification center.
