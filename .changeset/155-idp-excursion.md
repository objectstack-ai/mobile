---
"mobile": patch
---

Clause-②: no
Metadata-protocol: none

Signing in through an enterprise identity provider (OIDC or SAML) now works
inside the app. When the server's sign-in page (the Console's `/login`, or a
sign-in route under `/api/v1/auth/`) sends the WebView to the provider, the
provider's https pages load in the WebView under a native bar. The bar shows a
lock, the provider's exact host, "正在外部页面登录 · <server>" and 取消. The
session cookie the server sets on the way back lands in the app, so the user
is signed in. Before, those pages opened in the system browser and the sign-in
never reached the app.

Outside a sign-in, the navigation policy is unchanged: off-server pages still
open in the in-app browser. A sign-in excursion admits https only. It ends when
the WebView is back on the server or the user taps 取消, which returns to the
server's sign-in page. It also ends, with a message, after 30 navigations or 10
minutes, or when a page is plain http. The bridge answers nothing while a
provider's page is on screen. Google's sign-in refuses embedded WebViews, so
the app now says that sign-in method is not supported in the app yet instead of
opening it in the browser.

No native module and no new permission: an over-the-air update is enough.
