---
"mobile": patch
---

Clause-②: no
Metadata-protocol: none

The app can lock itself behind Face ID, Touch ID or fingerprint, with the
device passcode as fallback. It is off by default; the user turns it on, and
picks how long the app may stay in the background before it locks
(immediately, 1, 5, 15 or 60 minutes), on a new native "App lock" settings
screen. Every change there (on, off, another timeout) asks for the same
authentication first, and turning it on needs a screen lock on the device.

- On a return from the background past the timeout, and on a cold start with
  the lock on, an opaque native overlay covers the app until the user
  authenticates. The Console's WebView stays mounted under it and is not
  reloaded; Android back does nothing while it is up.
- While the lock is on, the app-switcher snapshot is protected: blurred on
  iOS, and on Android the window is `FLAG_SECURE` (the recents thumbnail is
  blank, and screenshots and screen recording are blocked).
- The settings screen opens from the "App lock" row of the Switch organization
  sheet, and from the bridge's new `openAppLockSettings()`. The bridge's
  `getAppLock()` reads the setting (`{ enabled, timeoutSeconds }`). Both are
  read-only capabilities behind the origin check: no bridge method changes the
  lock. While the app is locked, bridge methods that open native UI
  (`openExternal`, `scan`, `showConnectionSwitcher`, `openAppLockSettings`)
  fail with "The app is locked".
- New native dependency `expo-screen-capture` (SDK 55); the permissions it
  declares for a screenshot listener the app does not use are blocked. The
  Face ID usage text is localized in all ten languages, and the unlock prompt
  says "Unlock ObjectOS".
