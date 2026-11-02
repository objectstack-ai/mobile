---
"mobile": patch
---

Clause-②: no
Metadata-protocol: none

The app now keeps several saved connections — ObjectOS Cloud organizations and
company servers — and switches between them from a native "Switch
organization" sheet. The single saved server URL becomes the first connection
on the first launch after the update (read once, then deleted). The confirm
step adds a server as a connection (or refreshes the saved one with the same
host) and makes it current; the sheet's "Add an organization or company
server" goes back to the address step, so nothing is saved without it.

Switching re-creates the Console on the chosen host at that connection's last
route, and the bridge answers only the current connection's pages. Swiping a
connection left removes it and signs it out: its Console, when loaded, is asked
to unregister this install's push token (`objectstack-native:connectionRemoved`),
then that host's own cookies are cleared — never another host's. The failure
page's secondary action now opens the sheet.

New bridge method `showConnectionSwitcher()` and shell event
`connectionRemoved`, both announced as capabilities. `resetServer()` now
forgets the current connection (the next saved one becomes current).

Adds the native module `@preeternal/react-native-cookie-manager` 7.0.0 and its
Expo config plugin: a new store or development build is required.
