# Device Testing

The shell uses native modules (`react-native-webview`, notifications), so it does
not run in Expo Go. Install a build from EAS, project
[`@objectstack/objectos`](https://expo.dev/accounts/objectstack/projects/objectos/builds).

## Install on a phone

The `preview` profile is the build for testers. It needs no computer on the
phone's side.

**Android**

1. Open the latest `preview` Android build on the
   [builds page](https://expo.dev/accounts/objectstack/projects/objectos/builds),
   or scan its QR code.
2. Install the APK. Android asks once to allow installs from that browser.

**iOS** needs an Apple Developer team, and only registered devices can install.

1. Someone with the Expo account runs `eas device:create` and sends the phone the
   link it prints. Open it on the iPhone and install the profile.
2. Build after registering, because a build only includes the devices registered
   when it was made: `eas build --profile preview --platform ios`.
3. Open the build's link on the iPhone and install.

Then open the app and enter a server (see [Server address](#server-address)).
`preview` builds pre-fill no server.

## Development builds

For working on the shell itself, against `pnpm start`:

```bash
pnpm install
eas build --profile development-device --platform ios   # or android; a phone
eas build --profile development --platform ios          # or android; a simulator
# install the build, then:
pnpm start
```

A development build for an iPhone needs the same device registration as above.

## Server address

On first launch the shell asks for the server. From a phone, `localhost` is the
phone itself — use your computer's LAN address, e.g. `http://192.168.1.42:3000`.
Plain `http://` is accepted for private-network hosts and in development builds;
anything public must be `https://`.

## What to check

| Area | Check |
|---|---|
| Server picker | bare host, full URL and pasted Console link all connect |
| Loading | cover shows until the Console is up; no white flash |
| Navigation | in-Console links stay in the WebView; external links open the in-app browser; `mailto:`/`tel:` open the OS |
| Back | Android back walks Console history, then leaves the app; iOS edge swipe goes back |
| Offline | airplane mode → offline page; turning it off reloads on its own |
| Server error | a 5xx from the server shows the server error page |
| Change server | offline page → "Use a different server" → picker → new Console |
| Session | sign in, kill the app, reopen — still signed in |
| Links | `xcrun simctl openurl booted "objectos://console/apps"` / `adb shell am start -d "objectos://console/apps"` opens that route |
| Push | see [PUSH-NOTIFICATIONS.md](./PUSH-NOTIFICATIONS.md) — needs the server device registry |

## Smoke checklist for landed cards

None of these has run on a device yet. Each comes from the manual check on its
card. "Dev" means it needs a development build for the tooling named.

| Card | Check |
|---|---|
| #151 Rebrand | `objectos://console/apps` opens the Console's apps page (`adb shell am start -d "objectos://console/apps"`, Dev on iOS: `xcrun simctl openurl booted`) |
| #154 Server probe | a private server shows the confirm page with the right details; a server with a bad certificate says the certificate is invalid; an https site that is not ObjectOS says so |
| #162 Ready signals | kill the app, tap a push notification: the target record opens with no second cover or full page reload |
| #163 Device registration | after a push token rotates, a signed-in Console receives `objectstack-native:pushTokenChanged`; `window.ObjectStackNative.installId` survives clearing WebView storage |
| #156 Connect | scan a real connect QR code; open an `objectos://connect` link from mail or notes; deny the camera permission |
| #159 Languages | set the phone to Japanese, Arabic and Traditional Chinese (`zh-TW`) in turn: native pages follow, `zh-TW` shows Simplified Chinese, Arabic reads right to left |
| #146 Scan | in a Console page that calls `scan()`, a scanned code fills the field; closing the scanner returns `null`; a denied camera permission fails with `failed` |
| #152 Saved connections | add two connections and switch between them; remove one and confirm it is signed out; upgrade from a version that saved one server |
| #157 MDM | on Android with Test DPC or an EMM, push `serverUrl` and `lockServer=true`: the app goes straight to the confirm page, the switcher has no add-server row, the managed connection cannot be swiped away, and a failed probe says to contact the IT administrator |
| #155 IdP sign-in | with an https test OIDC provider: its page loads under the bar with its exact host; finishing sign-in removes the bar and loads the Console; Android back does not return to the provider; Cancel returns to `/login` |
| #148 System sign-in | on a server that registers `ai.objectos.mobile`: tap Google, the auth session opens on the server's sign-in page; finish there and the Console loads signed in; close the session instead and the sign-in page stays with no message; on a server that does not register it, the "not supported" notice shows and no session opens. Android: background the Custom Tab mid-sign-in and come back |
| Navigation policy | Android: in-server navigation, trusted hosts and sign-in excursions work; a top-level page outside the policy is stopped and returns to the server |
| #147 Pick, share, open | take a photo and pick a library image to upload; open a PDF and an image; open the share sheet; on Android a page's own `input type=file` still works |
| #145 App lock | turn the lock on with "immediately", background and return: the cover shows; biometrics remove it with no reload and form contents intact; the passcode works after a cancelled prompt; the app switcher shows blur on iOS and blank on Android; changing the setting asks for biometrics first, and cancelling leaves it unchanged |

Report results on the maintainer's device-testing card, and open a defect card
for each failure.

## Debugging the page

Development builds enable WebView debugging: Safari → Develop → (device) on
iOS, `chrome://inspect` on Android.
