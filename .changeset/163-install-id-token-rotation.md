---
"mobile": patch
---

Clause-②: no
Metadata-protocol: none

The bridge exposes a stable install id and tells the Console when the push
token rotates, so the Console can keep one device row per install in the
server's device registry.

- `window.ObjectStackNative.installId`: a random UUID v4 generated on first
  launch and kept in SecureStore (`AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`), so
  it survives the WebView's storage being cleared. It is not a hardware or
  advertising id. It is `null` when secure storage is unavailable at page
  start. The Console sends it as `deviceId`.
- New capability and window event `pushTokenChanged`: when APNs / FCM report a
  token, the shell dispatches `objectstack-native:pushTokenChanged` with
  `detail: { token, vendor }`. Only pages on the configured server's origin
  receive it. A token reported before the page's `ready()` is held, and the
  latest one is delivered at `ready()`.
- Notification taps also read `userInfo.data.route` / `.url` on iOS, as a
  fourth candidate after `content.data`, the top-level keys and `body`.
- Docs: the `ObjectStackShell/<appVersion>` user-agent marker is now a
  documented contract, and the Console registers no Service Worker inside
  the shell.

Additive: no bridge protocol version bump.
