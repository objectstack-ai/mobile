---
"mobile": patch
---

Clause-②: no
Metadata-protocol: none

A tapped push opens on the saved connection that sent it. The platform's push
data now names its server (`origin`, the origin the Console was loaded from
when it registered the device), and the shell compares it byte for byte with
each saved connection's origin:

- From the current connection: the route opens there, as before.
- From another saved connection: the shell switches to it, the same way the
  switcher does, and opens the route on that connection's Console once it has
  loaded. The route never reaches the Console being left.
- From a server that is no longer saved: nothing opens; the app shows and the
  route is dropped.
- From an older server that names no sender: with one saved connection the
  route opens there; with two or more it is dropped, since the sender cannot
  be told.

A server locked by the organization's device management keeps a tap from
switching away from the managed connection: a push for any other saved
connection is dropped. With the app lock on, a tap waits until the user
unlocks, then switches and opens. A cold start from a tap follows the same
rules. The push's `origin` is only used to choose among saved connections:
the app never connects to a server because a push named it.
