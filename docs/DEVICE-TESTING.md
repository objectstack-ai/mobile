# Device Testing

The shell uses native modules (`react-native-webview`, notifications), so run a
**development build** rather than Expo Go.

## Build and run

```bash
pnpm install
eas build --profile development --platform ios      # or android
# install the build, then:
pnpm start
```

`eas build --profile development --platform ios` produces a simulator build by
default (see `eas.json`); remove `ios.simulator` for a device build.

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
| Links | `xcrun simctl openurl booted "objectstack://console/apps"` / `adb shell am start -d "objectstack://console/apps"` opens that route |
| Push | see [PUSH-NOTIFICATIONS.md](./PUSH-NOTIFICATIONS.md) — needs the server device registry |

## Debugging the page

Development builds enable WebView debugging: Safari → Develop → (device) on
iOS, `chrome://inspect` on Android.
