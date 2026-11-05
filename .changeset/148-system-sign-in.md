---
"mobile": minor
---

Clause-②: no
Metadata-protocol: none

Sign in with providers that refuse embedded WebViews, such as Google. When the
WebView is about to reach one, the app opens the server's sign-in page in the
system auth session (`ASWebAuthenticationSession`, Custom Tabs) and brings the
session back through the server's one-time-token hand-off, bound to a PKCE
verifier the app keeps in memory. A server that does not register the app's
`ai.objectos.mobile` scheme in `trustedAppSchemes` keeps the "not supported"
notice. The new scheme and `expo-crypto` are native changes, so this needs a new
binary.
