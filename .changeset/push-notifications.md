---
"mobile": minor
---

Add OS-level push notifications (APNs / FCM via Expo).

Closes the roadmap §20.x push-notification gap: the backend device registry
(`client.notifications.registerDevice`) was already wired through
`useNotifications`, but nothing acquired an OS push token to feed it.

- `lib/push-notifications.ts` — React-free wrapper over `expo-notifications` +
  `expo-device`: permission handling, Expo push-token acquisition (APNs/FCM),
  Android channel setup, foreground presentation config, and deep-link
  extraction from a notification payload.
- `hooks/usePushNotifications.ts` — lifecycle hook that requests permission,
  acquires + registers the token with the backend (only when signed in), and
  routes notification taps (foreground, background, cold start) to a deep-link
  callback.
- `app/_layout.tsx` — mounts the hook gated on auth; tapped notifications open
  their app-scheme deep link, which expo-router resolves.
- `app.config.ts` — adds the `expo-notifications` config plugin.
- Adds `expo-notifications` + `expo-device` deps, Jest mocks, and unit tests
  for the pure helpers.
