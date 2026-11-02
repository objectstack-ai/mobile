---
"mobile": patch
---

Clause-②: no
Metadata-protocol: none

The bridge can scan codes for the Console. `ObjectStackNative.scan(opts?)`,
announced as the `scan` capability, opens the native full-screen scanner (the
same one as "connect by QR code", with close and torch) and resolves the
decoded text, or `null` when the user closes it.

- `formats` narrows what the camera reads, with `expo-camera`'s names (`qr`,
  `ean13`, `code128`, …); without it every listed format is read. An empty list,
  an unknown format or any other option is refused as `bad_args`.
- A refused camera permission fails the call with `failed`
  ("Camera permission denied"); a second `scan()` while one is open fails with
  "A scan is already open" and leaves the first alone.
- Only pages on the configured server's origin can call it, like every method.

Bridge answers now go only to the document that made the call. A call id
carries a per-document token, and the shell drops an answer whose page was
replaced while the call was open (a reload, the WebView re-created after a
failure, a redirect). Before, an answer meant for the old page could settle a
call of the new one.

The scanner screen lays out right-to-left under Arabic on its own root. The
camera prompt text now names both uses (connect code, and codes for Console
fields) in all ten languages.
