---
"mobile": minor
---

Clause-②: no
Metadata-protocol: none

Connect by QR code. The server picker has a scan button in the address field
that opens a full-screen camera scanner (close, torch, "Place the QR code
inside the frame", "Contains only the server address, no account
information", "Enter address manually"). It accepts the
`objectos://connect?server=…` code from the Console's mobile-app page, and a
plain `https://` server URL; anything else shows "This isn't a connect QR
code". The same `objectos://connect` link opens the app from an invite email.
Either way the address is probed and the user confirms the server before
anything is saved, also when a server is already saved. When a link
cold-starts the app onto the picker while a server is saved, the address step
offers a way back to that server's Console (a "Back to" button, and Android
back). A link carrying any
parameter besides `server` is refused, and an unusable address shows in the
field with its error. Adds `expo-camera` (~55.0.18, camera only: no
microphone, no `RECORD_AUDIO`), with the camera permission text localized in
English, Chinese and Arabic. The scanner is a reusable `QrScanner` component.
