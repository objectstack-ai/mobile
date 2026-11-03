---
"mobile": patch
---

Clause-②: no
Metadata-protocol: none

Link the app to the EAS project `@objectstack/objectos`, so CI can produce
installable builds. The Expo slug moves from `objectos-mobile` to `objectos`,
matching that project. Over-the-air updates are on, gated by the fingerprint
runtime version (`expo-updates`). A `development-device` profile builds a dev
client for a phone (`expo-dev-client`). `preview` builds use channel `preview`
and pre-fill no server.

Both modules are native: earlier development builds need rebuilding.
