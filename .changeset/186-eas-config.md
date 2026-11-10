---
"mobile": patch
---

Clause-②: no
Metadata-protocol: none

EAS keeps the build numbers: `eas.json` sets `cli.appVersionSource` to
`remote`, so iOS `buildNumber` and Android `versionCode` live on EAS servers and
`production` builds increment them there. The first remote build seeds them from
the app config, which sets none, so they start from 1.

`eas-build.yml` builds each platform in its own job, so a failing iOS build no
longer stops the Android one. A push to `main` builds Android only; iOS builds
run by hand (`workflow_dispatch`) until the project has Apple signing
credentials.
