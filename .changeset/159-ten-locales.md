---
"mobile": minor
---

Clause-②: no
Metadata-protocol: none

The native screens (server picker, confirm step, loading and offline pages)
now ship in the same ten languages as the Console UI, under the same codes:
en, zh, ja, ko, de, fr, es, pt, ru, ar. The app picks the first of the phone's
preferred languages that it supports, with the Console's matching rule (a
region tag falls back to its base language: `pt-BR` → `pt`, `zh-Hans-CN` →
`zh`; Traditional Chinese → `zh`, as in the Console), else English. A
phone-language change is picked up when the app next comes to the foreground.
Under Arabic the native screens lay out right-to-left from the first render.
There is no in-app language picker: the phone setting decides, and a language
stored by an earlier in-app picker is no longer read.
