---
"mobile": patch
---

Clause-②: no
Metadata-protocol: none

The navigation policy is also enforced when a top-frame load starts, so every
top-frame load follows it. A page the policy does not load in the WebView is
stopped and goes where the policy sends it, as a link does: a web page to the
in-app browser, a blocked page nowhere. The WebView then goes back to the
server, to the route the Console was on. If the server's page goes there again
before the Console is ready, the app says it can't show the page, with Try
again and Switch organization.

No native module and no new permission: an over-the-air update is enough.
