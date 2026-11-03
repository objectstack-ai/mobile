---
"mobile": patch
---

Clause-②: no
Metadata-protocol: none

Route delivery to the page follows the same origin rule as the shell's other
scripts. A Console route (a notification tap, an app link, a bridge
`navigate()`) is delivered only to a page on the configured server's origin,
default ports ignored. There the shell dispatches `objectstack-native:navigate`
and, when no listener handles it, loads the route's Console URL. Another page
in the main frame gets neither and is left where it is.

No native module and no new permission: an over-the-air update is enough.
