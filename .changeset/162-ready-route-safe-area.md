---
"mobile": patch
---

Clause-②: no
Metadata-protocol: none

The Console shell now acts on the Console's `ready` and `routeChanged` bridge
events. The loading cover stays up until the Console posts `ready`, and a
route asked for before then (a notification tap on cold start) is dispatched
at `ready`, when the Console's navigate listener is mounted, instead of at the
WebView's load end, where it went unhandled and reloaded the page. A Console
that never posts `ready` gets the cover lifted and the held route dispatched
8 s after load end. The route a re-created WebView resumes at comes from
`routeChanged`, with WebView navigation state as the fallback for Consoles
that never post it.

The shell keeps owning the safe-area padding; `docs/HYBRID-SHELL.md` now says
so, and that `--os-native-safe-*` are informational.
