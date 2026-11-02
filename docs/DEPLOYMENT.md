# Deployment

## Build-time configuration

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_DEFAULT_SERVER_URL` | pre-filled on the server picker (white-label builds) |
| `EXPO_PUBLIC_TRUSTED_HOSTS` | extra hosts allowed in the WebView, comma-separated (SSO IdP) |
| `EXPO_PUBLIC_SENTRY_DSN` | crash reporting |
| `EXPO_PUBLIC_APP_SCHEME` | URL scheme for app links (default `objectstack`) |

Profiles and their values live in `eas.json`.

## Builds

```bash
eas build --profile development --platform ios|android   # dev client
eas build --profile preview --platform all               # internal distribution
eas build --profile production --platform all            # store builds
eas submit --platform ios|android --profile production
```

CI (`.github/workflows/`):

- `ci.yml` — Jest with coverage on every PR;
- `lint-typecheck.yml` — `tsc` + ESLint;
- `eas-build.yml`, `eas-update.yml`, `eas-submit.yml` — need the `EXPO_TOKEN`
  secret and are clean no-ops without it.

## Updates

The Console updates with the server, so most product changes need no mobile
release. A new store build is needed only for native changes (new native
module, bridge method, permission, icon). Shell-only JavaScript fixes can ship
over the air with EAS Update.

## App review

App Store guideline 4.2 rejects apps that are only a website in a frame. The
shell's native features (server picker, push, offline page, and the follow-up
biometric lock and scanner) must be demonstrable in the review build, with a
demo server and account in the review notes. Enterprise customers can also
distribute through MDM.
