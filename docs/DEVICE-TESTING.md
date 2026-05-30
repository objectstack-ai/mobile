# ObjectStack Mobile — Device Testing Guide

> How to run and test the app on a **physical iOS / Android device**.

This guide complements [DEPLOYMENT.md](./DEPLOYMENT.md) (which covers store
builds & CI/CD) and [E2E-TESTING.md](./E2E-TESTING.md) (automated Maestro
flows). Here we focus on **manual testing on a real phone**.

---

## Which path do I need?

| What you want to test | Path | Why |
|-----------------------|------|-----|
| Lists, forms, navigation, most UI | **A — Expo Go** | Fastest; just scan a QR code |
| **Push notifications**, biometrics, or any native module | **B — Development Build** | Expo Go does **not** bundle `expo-notifications`; you need a custom dev client |

> Rule of thumb: if the feature touches an OS capability (push, secure
> enclave, background tasks), it needs **Path B**.

---

## Prerequisites (both paths)

1. Node + pnpm installed, repo cloned, `pnpm install` run.
2. A running ObjectStack backend reachable from the phone.
3. **Phone and computer on the same Wi-Fi network.**

### Backend URL — the #1 gotcha

The app asks for a **server URL** on first launch (the server-config screen in
`app/_layout.tsx`). On a physical device, **do not use `localhost`** —
`localhost` means the phone itself, not your computer.

Use your computer's LAN IP instead:

```bash
# macOS
ipconfig getifaddr en0           # e.g. 192.168.1.42

# Linux
hostname -I | awk '{print $1}'
```

Then enter `http://192.168.1.42:3000` (your IP + backend port) on the device.

---

## Path A — Expo Go (fastest, non-push features)

1. Start the dev server:

   ```bash
   pnpm start
   ```

2. Install **Expo Go** on the phone (App Store / Play Store).

3. Connect:
   - **iOS** — open the Camera app, point it at the QR code in the terminal,
     tap the banner to open in Expo Go.
   - **Android** — open Expo Go, tap **Scan QR code**.

4. Enter the backend LAN URL when prompted, sign in, and test.

**Can't connect?** Firewalls or restrictive networks often block the LAN
connection. Use a tunnel instead (slower but works anywhere):

```bash
pnpm start --tunnel
```

---

## Path B — Development Build (required for push notifications)

A development build is your app compiled with its native modules, plus the
Expo dev-client launcher. You build it once; afterwards you iterate over JS the
same way as Path A.

### 1. One-time setup

```bash
npm install -g eas-cli        # or: pnpm add -g eas-cli
eas login                     # use your Expo account (sign up at expo.dev)
eas init                      # links/creates the Expo project + writes projectId
```

`eas init` writes a **`projectId`** into the Expo config. This is the exact
value the push-token code reads at runtime
(`Constants.expoConfig.extra.eas.projectId` — see
[PUSH-NOTIFICATIONS.md](./PUSH-NOTIFICATIONS.md)). Without it, production push
tokens cannot be acquired.

### 2. Build & install on the device

The build runs in Expo's cloud; when it finishes you get a QR code / link to
install directly on the phone.

```bash
# Android — no paid account needed
eas build --platform android --profile development

# iOS — requires an Apple Developer account ($99/yr) and the device
# registered for ad-hoc/development provisioning (EAS prompts you through it)
eas build --platform ios --profile development
```

> The `development` profile in `eas.json` sets `developmentClient: true`. The
> iOS profile also enables `simulator: true`; for a **physical** iPhone EAS
> produces a device build (it will guide you through device registration).

### 3. Run against the dev server

```bash
pnpm start --dev-client
```

Open the **dev build** you just installed (not Expo Go) and scan the QR code.

### 4. Push-notification specific setup

Push requires platform credentials beyond the build itself:

- **iOS**
  - In the Apple Developer portal, enable the **Push Notifications**
    capability for the `com.objectstack.mobile` App ID.
  - EAS can generate and manage the APNs key for you
    (`eas credentials`).
  - Push is **not** deliverable to the iOS Simulator — use a real device.
- **Android**
  - Configure **FCM** for the project and upload the FCM credentials in the
    Expo project (`eas credentials` → Android → FCM).

### 5. Verify the end-to-end flow

1. Launch the dev build → sign in.
2. Accept the notification-permission prompt when it appears.
3. The app acquires an Expo push token and calls the backend
   `registerDevice` — confirm the device appears server-side.
4. Send a test push from the
   [Expo Push Notifications Tool](https://expo.dev/notifications) using the
   token (printed/registered above). Include a `data` payload such as:

   ```json
   { "url": "objectstack://objects/tasks/123" }
   ```

5. Tap the delivered notification → the app should deep-link to that record
   (foreground, background, and cold-start are all handled).

---

## Iterating after the first build

You only rebuild (Path B step 2) when **native** things change: adding/removing
a native module, upgrading the Expo SDK, or changing native config in
`app.config.ts`. For day-to-day JS/TS changes, just keep
`pnpm start --dev-client` running and reload.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| App can't reach the backend | Used `localhost` instead of the LAN IP; or phone/computer on different networks. Try `--tunnel`. |
| QR scan does nothing / times out | Network blocks LAN; use `pnpm start --tunnel`. |
| Push permission prompt never appears | Running in Expo Go (use a dev build) or on a simulator (use a real device). |
| `getExpoPushTokenAsync` fails | Missing `projectId` (run `eas init`) or push credentials not configured (`eas credentials`). |
| Notification arrives but tap doesn't navigate | Payload missing a `url` / `objectName`+`recordId`; see [PUSH-NOTIFICATIONS.md](./PUSH-NOTIFICATIONS.md). |
| iOS build fails on provisioning | Device not registered; run `eas device:create`, re-register, rebuild. |

---

*See [PUSH-NOTIFICATIONS.md](./PUSH-NOTIFICATIONS.md) for the push architecture,
[DEPLOYMENT.md](./DEPLOYMENT.md) for store builds, and
[E2E-TESTING.md](./E2E-TESTING.md) for automated flows.*
