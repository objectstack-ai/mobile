---
"mobile": patch
---

Clause-②: no
Metadata-protocol: none

The bridge carries files for the Console: three new methods, each announced as
a capability of the same name.

- `ObjectStackNative.pickImage(opts?)` takes a photo (`camera: true`) or lets
  the user choose one from the library, downscales it to `maxWidth` pixels wide
  (default 2048) and saves it as JPEG at `quality` (default 0.8). It resolves
  `{ base64, name, mime }`, which the Console uploads as a `File`, or `null` on
  cancel. A refused camera permission fails the call ("Camera permission
  denied"); one picker at a time.
- `ObjectStackNative.share({ url?, text? })` opens the OS share sheet.
- `ObjectStackNative.openFile({ base64, name, mime })` hands a file the
  Console fetched with its own session to the OS: Android opens it in the app
  that views its type (else the share sheet), iOS shows the share sheet with a
  preview. The shell takes bytes only: it reads no cookie, calls no API and
  downloads no URL.
- Files cross the bridge up to 8 MiB. A larger `openFile` is refused with
  `bad_args` in the page before anything is posted, and by the shell; a
  `pickImage` result over it fails. Only `openFile`, and only from the current
  connection's origin, may send a message over 64 KB; any other call too long
  for the shell is refused in the page with `bad_args`.
- Arguments are checked per method (unknown keys, ranges, a file name without
  a path, a plain MIME type, padded base64); a bad one is `bad_args` and
  nothing opens. Only pages on the current connection's origin are answered.

New native modules: `expo-image-picker`, `expo-image-manipulator` (the
downscale), `expo-file-system`, `expo-sharing` and `expo-intent-launcher`
(Android `ACTION_VIEW`), so the app needs a native rebuild. The camera prompt
now also names photo capture, and the iOS photo-library prompt is new, both in
all ten languages; the image picker adds no microphone permission.
`<input type="file">` keeps working as before.
