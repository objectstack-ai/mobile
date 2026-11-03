---
"mobile": patch
---

Clause-②: no
Metadata-protocol: none

The native screens now ship in the platform's one list of 11 languages, keyed
by the platform table's tags: en, zh-Hans, zh-Hant, es, ar, fr, pt-BR, ru, de,
ja, ko. Traditional Chinese is new: a phone set to 繁體中文 (`zh-Hant-*`, or
`zh-TW` / `zh-HK` / `zh-MO`) now gets Traditional Chinese native screens and a
Traditional Chinese iOS camera, photo-library and Face ID prompt, where it got
Simplified Chinese before. The bundles `zh` and `pt` are renamed `zh-Hans` and
`pt-BR`.

The phone language now resolves by script: an explicit Chinese script subtag
decides, `zh-TW` / `zh-HK` / `zh-MO` resolve to `zh-Hant`, any other Chinese
tag to `zh-Hans`, every Portuguese tag (`pt-PT` included) to `pt-BR`, and any
other tag to its primary subtag, else English. This replaces the port of the
Console's exact-then-base `matchLanguageTag`, which is no longer exported;
`resolveLanguageTag(tag)` takes its place.
