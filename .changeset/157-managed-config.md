---
"mobile": patch
---

Clause-②: no
Metadata-protocol: none

Managed deployment: the app reads the server from MDM managed app
configuration (iOS `com.apple.configuration.managed`, Android managed
configurations through `RestrictionsManager`). Two keys: `serverUrl` (string)
and `lockServer` (boolean). Precedence is managed config, then the build's
`EXPO_PUBLIC_DEFAULT_SERVER_URL`, then what the user enters.

With `serverUrl` set and not yet saved, the app skips the address step and the
scanner, probes the managed server at once and shows the confirm step; the
probe is never skipped. A failed probe shows its error with "Please contact
your IT administrator." With `lockServer`, the switcher hides "Add an
organization or company server" and the managed connection's Remove, the
Console's `resetServer()` is refused, and there is no way to edit the address.
The configuration is read on launch, on every return to the foreground, and on
the platform's change signal; a saved managed connection becomes current on
launch and on a change. `trustedHosts` is not read from MDM.

Native change: a local Expo module (`modules/managed-config/`) with a config
plugin that declares the Android schema (`res/xml/app_restrictions.xml`). It
needs a new development or store build; a build without it reads no managed
config. Keys and Intune / Jamf samples: `docs/DEPLOYMENT.md`.
