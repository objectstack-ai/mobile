---
"mobile": minor
---

Clause-②: no
Metadata-protocol: none

The server picker now checks that the address belongs to an ObjectOS server
and asks the user to confirm it before connecting. It reads the server's
anonymous discovery, branding and sign-in endpoints, then shows the logo (or
the initial on the brand colour), product name, full address, a lock for
https, the sign-in methods and the platform version. Nothing is saved until
"Connect and sign in". Each failure has its own message: not an ObjectOS
server, unreachable (with a VPN hint), invalid certificate, timeout, server
error, or plain http to a public host. `resolveServerUrl` and
`validateServerUrl` are removed from `lib/server-url.ts`; the probe is
`probeServer` in `lib/server-probe.ts`.
