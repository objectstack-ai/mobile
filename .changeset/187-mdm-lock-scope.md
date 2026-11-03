---
"mobile": patch
---

Clause-②: no
Metadata-protocol: none

While the organization's MDM locks the server (`lockServer`), the "Switch
organization" sheet lists only the managed connection. Connections saved
before the lock are hidden, not deleted: they cannot be switched to or removed
while locked, and are listed again once the lock is lifted. The managed
connection is still made current when the lock arrives, and connect links and
the scanner stay refused while locked.

Docs: the MDM key table in `docs/DEPLOYMENT.md` states that `trustedHosts` is
not supported, and `docs/HYBRID-SHELL.md` lists as a known limit that a route
asked for while the main frame is on another origin is dropped.
