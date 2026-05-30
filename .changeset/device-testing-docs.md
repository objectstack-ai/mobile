---
"mobile": patch
---

Add a physical-device testing guide and fix stale build config docs.

- `docs/DEVICE-TESTING.md` — how to run on a real iOS/Android device: Expo Go
  for non-native features vs. an EAS development build for push notifications,
  the LAN-IP backend-URL gotcha, and an end-to-end push-notification test +
  troubleshooting checklist. Linked from the README.
- `docs/DEPLOYMENT.md` — corrected the `eas.json` example to match the real
  file (CLI `>= 14.0.0`, `development.ios.simulator`, `autoIncrement`, empty
  `submit.production`).
- `eas.json` — added `EXPO_PUBLIC_API_URL` env placeholders to the `preview`
  and `production` build profiles (staging / prod), so device builds point at a
  real backend instead of the localhost default.
