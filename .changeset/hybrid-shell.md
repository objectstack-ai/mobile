---
"mobile": major
---

Rebuild the app as a hybrid shell around the web Console. The native metadata
renderer, its data hooks and the `@objectstack/client` dependency are removed;
business UI is the Console served by the configured server. Adds the server
picker, the Console WebView with navigation policy and native loading/offline
pages, route ownership for future native screens, the `window.ObjectStackNative`
bridge (v1), native device push tokens with tap routing, and app links. The 1.x
renderer is preserved on the `legacy/native-renderer` branch.
