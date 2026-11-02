---
"mobile": patch
---

Clause-②: no
Metadata-protocol: none

Rebrand the app to ObjectOS. The app is named `ObjectOS`, its URL scheme
defaults to `objectos` (`objectos://open?route=…`, `objectos://console/…`),
the iOS bundle identifier and Android package are `ai.objectos.mobile`, and the
Expo slug is `objectos-mobile`. The server picker says "ObjectOS server" in
en / zh / ar.

Development builds made before this change are a different app (old bundle id,
old scheme): uninstall them and build again. `objectstack://` links no longer
open the app unless a build sets `EXPO_PUBLIC_APP_SCHEME=objectstack`.

Unchanged: the `window.ObjectStackNative` bridge global, the
`objectstack-native:navigate` event, platform API paths and `@objectstack/*`
package names.
