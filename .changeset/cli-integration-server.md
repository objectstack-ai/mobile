---
"mobile": patch
---

Replace the `server/hotcrm` git submodule with a CLI-started integration stack.

The HotCRM submodule no longer built against platform v7. It has been removed and
replaced with a self-contained ObjectStack project (`server/integration/`) started
via `@objectstack/cli` (`objectstack start --home server/integration --database-driver
memory --auth-secret …`).

- `server/integration/objectstack.config.ts` defines `crm_account` + `crm_contact`.
- `scripts/start-integration-server.sh` / `stop-integration-server.sh` now drive the
  CLI; `.github/workflows/integration.yml` drops `submodules: recursive` and the HotCRM
  build step.
- Integration tests re-pointed to v7 REST routes (`/api/v1/data/<object>`,
  `/api/v1/meta/*`) and updated for two v7 auth behaviors: better-auth's CSRF origin
  check (send `Origin`) and JSON-body parse on sign-out (send `{}`).

`pnpm test:integration:server` → 20/20 passing against a live 7.3.0 server.
