---
"mobile": patch
---

Clause-②: no
Metadata-protocol: none

Bridge answers follow the same origin rule as the shell's other page scripts.
The answer to a `window.ObjectStackNative` call is delivered only to a page on
the configured server's origin, default ports ignored; any other page in the
main frame gets nothing.

No native module and no new permission: an over-the-air update is enough.
