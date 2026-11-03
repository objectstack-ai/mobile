# Deployment

## Build-time configuration

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_DEFAULT_SERVER_URL` | pre-filled on the server picker (white-label builds) |
| `EXPO_PUBLIC_TRUSTED_HOSTS` | extra hosts allowed in the WebView, comma-separated (SSO IdP) |
| `EXPO_PUBLIC_SENTRY_DSN` | crash reporting |
| `EXPO_PUBLIC_APP_SCHEME` | URL scheme for app links (default `objectos`) |

Profiles and their values live in `eas.json`. `preview` skips Sentry's source map
upload (`SENTRY_DISABLE_AUTO_UPLOAD`); a `production` build uploads, so it needs a
`SENTRY_AUTH_TOKEN` in the project's EAS environment variables.

## Managed deployment (MDM)

An organization that distributes the app through its MDM can preconfigure the
server, so employees type nothing. The app reads the platform's standard managed
app configuration channel:

- **iOS:** Managed App Configuration — the dictionary the MDM server installs
  for the app under `com.apple.configuration.managed` in its user defaults.
- **Android:** managed configurations (app restrictions), read through
  `RestrictionsManager`. The app declares its keys in
  `res/xml/app_restrictions.xml`, which EMM consoles read to offer them.

### Keys

| Key          | Type    | Meaning |
| ------------ | ------- | ------- |
| `serverUrl`  | string  | The ObjectOS server the app opens, e.g. `https://erp.example.com` — the same address users would type. |
| `lockServer` | boolean | `true`: the app uses only the managed server. Users cannot switch to another saved server, add one or remove the managed one, and cannot edit the address. Ignored without `serverUrl`. |
| `trustedHosts` | — | Not supported. The app does not read it from MDM (see below). |

`lockServer` may also be sent as the string `"true"` or `"false"`. Any other
value that is present locks, so a lock the admin meant to set is never dropped.
Other keys are ignored. `trustedHosts` is **not** read from MDM: the hosts
allowed in the WebView (an SSO identity provider) still come only from the
build's `EXPO_PUBLIC_TRUSTED_HOSTS`.

### What the app does

- **Precedence.** Managed config > the build's `EXPO_PUBLIC_DEFAULT_SERVER_URL`
  > what the user enters. Once the managed server is saved, it is made the
  current connection at launch and whenever the managed config changes.
- **The managed server is still checked and confirmed.** With `serverUrl` set
  and not yet saved, the app skips the address step and the scanner: it probes
  the server at once and shows the "is this your server?" step; confirming saves
  it and opens its sign-in page. A managed value never skips the probe.
- **A server that fails the probe** shows the probe's error with "Please
  contact your IT administrator." and "Try again". Unlocked, the user may also
  choose "Enter a different address" (asked again on the next launch); locked,
  there is no way to edit.
- **Locked** (`lockServer`), the "Switch organization" sheet lists only the
  managed connection: it has no Remove, and there is no "Add an organization or
  company server". The Console's `resetServer()` is refused, and a connect link
  or the scanner cannot bring another server in. Other connections saved before
  the lock are hidden, not deleted: they cannot be switched to or removed while
  locked, and are listed again once the lock is lifted.
- **Changes while the app runs.** The app reads the configuration on launch
  and every time it comes to the foreground, and also on the platform's change
  signal where there is one (Android's `ACTION_APPLICATION_RESTRICTIONS_CHANGED`,
  delivered only while the app runs). A new `serverUrl` opens the check-and-confirm
  step; a new `lockServer` applies at once. Removing the configuration lifts
  the lock; the saved connection stays.

### Samples

iOS — the managed app configuration dictionary, as a property list. MDM
consoles that take app configuration as XML (for example Intune's app
configuration policy for managed devices, or Jamf Pro's app configuration for a
mobile device app) take the dictionary body:

```xml
<dict>
  <key>serverUrl</key>
  <string>https://erp.example.com</string>
  <key>lockServer</key>
  <true/>
</dict>
```

Android — the app publishes its keys in `app_restrictions.xml`, so a console
that uses managed configurations (for example Intune or Jamf through managed
Google Play) lists **Server URL** (`serverUrl`, string) and **Lock the server**
(`lockServer`, bool) for the app; set them there. For a test device without an
EMM, Google's Test DPC app can set the same app restrictions.

The schema the build declares:

```xml
<restrictions xmlns:android="http://schemas.android.com/apk/res/android">
  <restriction android:key="serverUrl" android:restrictionType="string"
    android:title="@string/managed_config_server_url_title"
    android:description="@string/managed_config_server_url_description" />
  <restriction android:key="lockServer" android:restrictionType="bool"
    android:defaultValue="false"
    android:title="@string/managed_config_lock_server_title"
    android:description="@string/managed_config_lock_server_description" />
</restrictions>
```

### Native module

The reader is a small local Expo module, `modules/managed-config/` (autolinked
from `./modules`), with a config plugin that writes the Android schema at
prebuild. It reads only; the app never writes the managed configuration. It is
native code, so it ships in a new store or development build, not over the air;
a build without it reads no managed config.

## System sign-in

Google and other providers that refuse embedded WebViews sign in through the
system auth session and a one-time token
([HYBRID-SHELL.md](./HYBRID-SHELL.md#system-sign-in)). The server has to allow it:

- a platform release with the Console half of the hand-off;
- `AuthConfig.trustedAppSchemes` listing `ai.objectos.mobile`.

Without them the app says the sign-in method is not supported, and other
sign-in methods work as before. The scheme is native configuration, so a
binary built before this feature needs a new build, not an update.

## Builds

```bash
eas build --profile development --platform ios|android   # dev client, iOS simulator
eas build --profile development-device --platform ios|android   # dev client, phone
eas build --profile preview --platform all               # internal distribution
eas build --profile production --platform all            # store builds
eas submit --platform ios|android --profile production
```

The app builds under the EAS project `@objectstack/objectos`. `owner`, `slug` and
`extra.eas.projectId` in `app.config.ts` name it together.

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

`runtimeVersion` uses the fingerprint policy, so an update only reaches binaries
with the same native side. A binary reads the branch its channel points at:
`preview` builds use channel `preview`, while `eas-update.yml` publishes with
`--auto`, to a branch named after the git branch (`main`). Until the channel is
pointed there, an update from CI reaches no installed build:

```bash
eas channel:edit preview --branch main
```

## App review

App Store guideline 4.2 rejects apps that are only a website in a frame. The
shell's native features (server picker, push, offline page, and the follow-up
biometric lock and scanner) must be demonstrable in the review build, with a
demo server and account in the review notes. Enterprise customers can also
distribute through MDM.
