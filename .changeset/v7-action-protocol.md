---
"mobile": minor
---

Implement the platform v7 Action/App protocol in the action system.

- `Action.target` interpolation: `${param.X}` (action params) and `${ctx.X}`
  (`recordId`/`objectName`/`appName`/`userId`/record fields), with legacy `{field}`
  placeholders still supported (`interpolate()` in `ActionExecutor`).
- Flows now run through `client.automation.execute(name, ctx)` (the v7 canonical
  flow runner) instead of the legacy `trigger` path.
- `Action.resultDialog`: `executeAction` returns the dialog config and a new
  `ResultDialog` component renders the action's response with `secret` masking and
  dot-path field extraction (TOTP URIs, OAuth secrets, backup codes).
- `App.hidden`: `useAppDiscovery` excludes hidden apps from the switcher while keeping
  them routable by name.
