# ObjectStack Mobile — Platform v7 Re-Baselining Plan

> **Date**: 2026-05-30
> **Status**: 🟢 SDK migrated to 7.3.0 — lint + 1151 tests green, dev server verified end-to-end
> **Mobile now on**: `@objectstack/*@7.3.0`
> **Was pinned to**: `@objectstack/*@3.1.1`
> **Gap closed**: **4 major versions** (3 → 4 → 5 → 6 → 7)

## ✅ Completed in this migration

The 3.1.1 → 7.3.0 bump turned out far smaller than the raw "4 majors" suggested,
because **the 7.x client SDK kept backward compatibility for the breaking surfaces
that matter to a metadata-driven client**:

- **Query conventions (v4)** — `client.data.find()` accepts **both** legacy
  `QueryOptions` (`filter`/`select`/`sort`/`top`/`skip`) and canonical
  `QueryOptionsV2` (`where`/`fields`/`orderBy`/`limit`/`offset`). The rename is
  normalized at the adapter layer, so the mobile query builder did **not** break.
  *(Verified live: `data.find('sys_user', { limit })` returns records against a 7.3.0 server.)*
- **Tenancy rename (v6)** — handled inside the SDK's route resolution; the device
  client talks to `/api/v1/...` and `connect()`/discovery work unchanged.

What actually required code changes:

| Area | Change | File |
|------|--------|------|
| **AI reset (v6)** | `client.ai.chat` was removed. `useAI().chat` is now layered on the surviving `client.ai.nlq` primitive (still multi-turn via `conversationId`); reply = NLQ `explanation`, suggestions surfaced as actions. | `hooks/useAI.ts`, `__tests__/hooks/useAI.test.ts` |
| **Auth typing** | better-auth 1.4.18 Expo plugin doesn't structurally satisfy `BetterAuthClientPlugin`; isolated the runtime-correct cast in one helper. | `lib/auth-client.ts` |
| **Dev server engine registration (v7)** | ObjectQL must be registered as the kernel engine plugin (`new ObjectQLPlugin(objectql)`, providing `com.objectstack.engine.objectql`) instead of `registerService("data", …)`, which the auth plugin depends on. | `server/dev.ts` |
| **Deps** | All `@objectstack/*` `^3.1.1 → ^7.3.0`; lockfile regenerated. | `package.json`, `pnpm-lock.yaml` |

**Verification (live, against `server/dev.ts` on 7.3.0):**
`GET /api/v1/discovery` ✅ · `client.connect()` ✅ · `client.auth.register()` ✅ ·
`client.auth.me()` ✅ · `client.data.find()` ✅ · `pnpm lint` ✅ · `1151/1151` tests ✅.

### Integration server: `server/hotcrm` submodule → ObjectStack CLI ✅

The old `server/hotcrm` git submodule no longer built against 7.x (its agent/tool
definitions predated spec fields `version`/`async`/`requiresConfirmation`/
`deprecated`), and the fix lived in a separate repo. It has been **removed** and
replaced with a self-contained CLI-started stack:

- **`server/integration/`** — a minimal ObjectStack project (`objectstack.config.ts`
  + `crm_account` / `crm_contact` objects) started via the `@objectstack/cli`
  (`objectstack start --home server/integration --database-driver memory --auth-secret …`).
- **`scripts/start-integration-server.sh`** / **`stop-integration-server.sh`** now
  drive the CLI instead of building a submodule; **`.github/workflows/integration.yml`**
  drops `submodules: recursive` + the HotCRM build.
- The integration tests were re-pointed to the **v7 REST routes**
  (`/api/v1/data/<object>`, `/api/v1/meta/*`) and updated for two v7 behaviors:
  better-auth's CSRF **origin check** (send `Origin`) and its **JSON-body** parse on
  sign-out (send `{}`).
- **Result: `pnpm test:integration:server` → 20/20 passing** against a CLI-started
  7.3.0 server (auth register/login/session/sign-out, `crm_account` CRUD, metadata).

### Hook reconciliation — speculative hooks pruned ✅

Audited all hooks against the **real 7.3.0 client surface** (introspected from the SDK
`.d.ts` and a live CLI server). The 7.x client exposes:
`meta, data, auth, views, workflow, realtime, ai, analytics, automation, notifications,
permissions, packages, storage, feed, i18n, projects, organizations, oauth`.

**19 hooks called namespaces/methods that do not exist in 7.x** — built against 3.1.1
schemas the platform removed in the v6 AI reset and module consolidation. They had **zero
screen consumers** (only barrel re-exports + self-mocked tests), so their "green" tests
proved nothing against a real server. **Deleted** (42 files: 19 hooks + 19 tests + 2 unused
components `AgentProgress`/`CollaborationOverlay` + their tests):

| Removed namespace | Deleted hooks |
|-------------------|---------------|
| `client.ai.{rag,mcp,agents,cost,sessions,codegen,devops,predictive}` (ai = nlq/suggest/insights only) | `useRAG`, `useMCPTools`, `useAgent`, `useAICost`, `useAISession`, `useCodeGen`, `useDevOpsAgent`, `usePredictive` |
| `client.security.*` (no security namespace) | `useRLS`, `useSecurityPolicies`, `useSharing`, `useTerritory` |
| `client.realtime.{channels,collaboration,messaging}` (realtime = connect/sub/presence only) | `useChannels`, `useMessaging`, `useCollaboration` |
| `client.automation.etl` / `client.integration.*` | `useETLPipeline`, `useConnector` |
| `client.system.audit` / `client.api.search` | `useAuditLog`, `useGlobalSearch` |

Hook count **95 → 76**; every retained hook maps to a verified 7.3.0 namespace
(`useAI`→nlq/suggest/insights, `useAnalyticsQuery`→analytics.query/explain,
`usePermissions`→permissions.check, `useFileUpload`→storage.upload, `useWorkflowState`→
workflow.\*, `useNotifications`→notifications.\*, `useSubscription`→realtime presence, …).

> **Rebuildable later on the data API:** audit, record sharing, territory, and global
> search were *deleted, not lost* — 7.x exposes `sys_audit_log`, `sys_record_share`,
> `sys_department`, and multi-object `data.find`, so these can be reimplemented as real
> features (querying data) rather than calls to namespaces that never shipped.

### v7 Action protocol ✅

Implemented the v7 Action/App surface in the action system (`components/actions/`):

- **`Action.target` interpolation** — `${param.X}` (action params) and `${ctx.X}`
  (`recordId`/`objectName`/`appName`/`userId`/record fields, incl. `${ctx.record.X}`),
  with legacy `{field}` kept for back-compat (`interpolate()` in `ActionExecutor`).
- **Flows run via `client.automation.execute(name, ctx)`** (the v7 canonical runner)
  instead of the old `trigger` path.
- **`Action.resultDialog`** — `executeAction` returns the dialog config; new
  `ResultDialog` component renders it with `secret` masking + dot-path field extraction
  (for TOTP URIs, OAuth secrets, backup codes).
- **`App.hidden`** — `useAppDiscovery` excludes hidden apps from the switcher while
  keeping them routable by name.

### Still outstanding

- Account App self-service identity surfaces (v7) — not yet wired.
- Optional re-builds of audit/sharing/search on the data API (see note above).

---

## Original Plan & Breaking-Change Inventory

---

## 1. Situation

The mobile client was built against `@objectstack/spec@3.1.1` (Feb–Mar 2026). Since
then the platform (the `objectstack-ai/framework` monorepo) has shipped **four major
versions in ~3 months**, with the entire `@objectstack/*` line now at **7.3.0**.

This is **not an incremental bump**. Several of the breaking changes touch the exact
layers the mobile app depends on most: query conventions, REST routing, the tenancy
model, and the AI protocol. At the same time, the platform **removed** a large set of
schemas that the mobile app built speculative hooks against (the spec's AI module was
"refocused on primitives" in 6.0.0, deleting ~4,700 lines / 8 application-template
schemas).

So the mobile app is simultaneously **behind** (core data/routing conventions) and
**ahead of a spec that no longer exists** (speculative AI/security/integration hooks).
The current ROADMAP's "full v3.1.1 compliance, 1149 tests passing" is true against
3.1.1 but **overstates readiness against the platform as it ships today**.

### Version timeline (npm `@objectstack/spec`)

| Mobile sees | Platform now | Published |
|-------------|--------------|-----------|
| 3.1.1       | **7.3.0**    | 2026-05-30 (today) |

All deps the mobile uses are available at 7.3.0:
`spec`, `core`, `client`, `client-react`, `objectql`, `driver-memory`,
`plugin-auth`, `plugin-hono-server`, `platform-objects`, `cli`.

---

## 2. Breaking-Change Inventory (3.1.1 → 7.3.0)

Sourced from the framework `packages/spec/CHANGELOG.md` major entries.

### v4.0.0 — Query & discovery conventions ⚠️ HIGH mobile impact

- **Query parameter rename** (affects every read path):
  `filter → where`, `select → fields`, `sort → orderBy`, `skip → offset`, `top → limit`.
- Discovery endpoint standardized: adapters mount at `{prefix}/discovery` (not root).
- `DataEngineQueryOptions` → `EngineQueryOptions`.

### v5.0.0 — Concurrency & metadata history ⚠️ MEDIUM

- **Optimistic Concurrency Control (OCC)**: `If-Match` header required on `PATCH`/`DELETE`.
- Execution-pinned metadata (runtime version pinning for workflows/approvals).
- `sys_metadata_history` with index-based lookups.

### v6.0.0 — Tenancy rename + AI reset ⚠️ HIGH mobile impact

- **`project` → `environment`** everywhere, no compatibility shims:
  - REST: `/api/v1/projects/:projectId/...` → `/api/v1/environments/:environmentId/...`
  - Header: `X-Project-Id` → `X-Environment-Id`
  - Symbols: `ProjectArtifactSchema` → `EnvironmentArtifactSchema`
  - DB columns: `project_id` → `environment_id`
- **AI protocol refocused on primitives** — removed 8 application-template schemas
  (~4,700 lines). Introduced AI v1: ModelRegistry, structured output, tracing,
  schema retrieval, `query_data` tool, **actions-as-tools** (declarative UI actions
  callable by LLMs).

### v7.0.0 — Actions, Account App, driver split ⚠️ MEDIUM

- `@objectstack/driver-turso` / `knowledge-turso` removed from open core (Cloud-only);
  local dev uses better-sqlite3. `databaseDriver` enum drops `'turso'`.
  → Only affects the **dev/integration server**, not the device runtime.
- **Account App** for self-service identity (dedicated UI surfaces).
- `App.hidden` (hide from app switcher, keep routing).
- **`Action.resultDialog`** (reveal API responses — TOTP URIs, OAuth secrets, backup codes).
- **`Action.target` interpolation contract**: `${param.X}` and `${ctx.X}` rules.

### Structural: spec re-modularization

- 3.1.1 exposed **14 modules** (`api`, `security`, `integration`, `kernel`, `qa`,
  `studio`, …). 7.x organizes the protocol around **5 domains**: **System, Data, UI,
  Automation, AI**. Mobile code that imports from `spec/api`, `spec/security`,
  `spec/integration`, `spec/system` namespaces will need re-pointing.

### 7.x client SDK namespaces (target)

`client.meta` (ETag schema cache), `client.data` (CRUD/query/batch), `client.auth`,
`client.views`, `client.workflow`, `client.realtime`, `client.ai`, `client.analytics`,
`client.automation`, `client.notifications`, `client.i18n`, `client.packages`,
`client.permissions`. Client is created with `{ baseUrl, token }` then `connect()`
fetches the discovery manifest from `/api/v1`.

> Note: namespaces like `client.security.*`, `client.integration.*`,
> `client.system.audit.*`, and the deep `client.ai.{rag,mcp,agents,sessions,cost,
> devops,codegen,predictive}.*` paths that the 3.1.1 ROADMAP assumed are **not** part
> of the 7.x primitive surface. Hooks built on them must be pruned or rewritten.

---

## 3. Hook Reconciliation

The repo has **95 hooks**. They fall into three buckets for v7:

| Bucket | Examples | Action |
|--------|----------|--------|
| **A. Core — keep, fix conventions** | `useQuery`, `useMutation`, `useObject`, `useView`, `useBatchMutation`, `useFileUpload`, `useGlobalSearch`, `useNotifications`, `useWorkflowState`, `usePermissions`, `useSubscription`, `useAnalyticsQuery` | Re-point to 7.x namespaces; apply `where/fields/orderBy/offset/limit`; add `If-Match` on writes. |
| **B. UX/local — mostly safe** | `useFavorites`, `useRecentItems`, `useOnboarding`, `useSettings`, `useInlineEdit`, `useFormDraft`, skeletons, gesture/animation/focus protocol hooks, design tokens | Largely client-local; verify any spec-schema imports still resolve under the 5-domain layout. |
| **C. Speculative — built on removed schemas** | `useRAG`, `useMCPTools`, `useAgent`, `useAICost`, `useAISession`, `useDevOpsAgent`, `useCodeGen`, `usePredictive`, `useETLPipeline`, `useConnector`, `useRLS`, `useSharing`, `useTerritory`, `useSecurityPolicies`, `useCollaboration` | **Re-validate against 7.x.** Delete or rewrite to real AI v1 primitives (`query_data`, actions-as-tools, ModelRegistry, tracing) and the consolidated security/automation surfaces. Do not assume the 3.1.1 schema exists. |

The goal is **honest compliance**: every retained hook must map to a schema/endpoint
that exists in 7.3.0.

---

## 4. Phased Plan

> Each phase ends with a green `pnpm lint && pnpm test`. Expect heavy breakage after
> Phase 1; phases 2–4 are about restoring green.

### Phase 1 — SDK bump & breakage triage (foundation) 🔴

- [ ] Bump `@objectstack/{client,client-react,core,spec}` and dev deps
      `{objectql,driver-memory,plugin-auth,plugin-hono-server}` `3.1.1 → 7.3.0`;
      regenerate `pnpm-lock.yaml`.
- [ ] Switch the dev/integration server off Turso → `file:` better-sqlite3 (v7 driver split).
- [ ] Run `tsc --noEmit`; **catalog every compile error** into a tracking checklist
      (this is the real surface area, not the CHANGELOG summary).
- [ ] Update `__mocks__` / `jest.setup.ts` for the new client shape.

### Phase 2 — Data layer & query conventions ⚠️ HIGH

- [ ] Rename query params across the query builder, `useQuery`, offline SQL translation,
      `useOfflineAnalytics`, saved views: `filter→where`, `select→fields`,
      `sort→orderBy`, `skip→offset`, `top→limit`.
- [ ] Re-point metadata fetch to `client.meta.getObject()` with **ETag** caching;
      align the MMKV metadata cache with ETag/`getCached()`.
- [ ] Adopt **OCC**: send `If-Match` on update/delete; wire `412` responses into the
      existing `useConflictResolution` / three-way-merge flow.
- [ ] Update discovery to `{prefix}/discovery` and `client.connect()` manifest flow.

### Phase 3 — Tenancy / control-plane model ⚠️ HIGH

- [ ] `project → environment` everywhere: config, headers (`X-Environment-Id`),
      route building, deep links, any artifact/discovery URLs.
- [ ] Validate auth/login against 7.x `client.auth` + the v7 **Account App** identity
      surfaces (self-service identity, backup codes via `Action.resultDialog`).

### Phase 4 — Actions & ObjectUI re-alignment ⚠️ MEDIUM

- [ ] Implement `Action.target` interpolation (`${param.X}`, `${ctx.X}`) in the action system.
- [ ] Support `Action.resultDialog` (render returned secrets/URIs/codes).
- [ ] Honor `App.hidden` in the app switcher / Apps tab.
- [ ] Re-validate ObjectUI view/layout/dashboard renderers against the 7.x **UI** domain
      schemas (the spec UI module moved under the 5-domain layout).

### Phase 5 — AI & speculative-hook reconciliation ⚠️ MEDIUM

- [ ] Audit bucket-C hooks (§3) against 7.x. For each: map to a real primitive or remove.
- [ ] Build the **actions-as-tools** + **`query_data`** integration into `useAI` (the
      sanctioned NLQ path in v7), replacing ad-hoc RAG/agent/MCP assumptions.
- [ ] Re-point any retained security hooks to the consolidated 7.x security surface;
      delete hooks whose schemas were removed.
- [ ] Rewrite the ROADMAP "Spec Compliance Matrix" to list **only** verified 7.3.0 mappings.

### Phase 6 — Tests, E2E & integration server 🟢

- [x] Replace the `server/hotcrm` submodule with a `@objectstack/cli`-started stack
      (`server/integration/`); `pnpm test:integration:server` → 20/20 on 7.3.0.
- [ ] Update MSW handlers + fixtures to 7.x request/response shapes (regular suite
      already green on 7.3.0).
- [ ] Re-run/refresh the 4 Maestro flows + Jest E2E screen tests.
- [ ] Restore coverage target (~85%) on the **reconciled** hook set.

### Phase 7 — Docs & GA re-validation 🟢

- [ ] Rewrite `README.md` status + `ROADMAP.md` to reflect 7.3.0 reality.
- [ ] Performance profiling + App Store assets (carried over, unchanged by the bump).

---

## 5. Effort & Sequencing

| Phase | Risk | Est. | Blocks later phases? |
|-------|------|------|----------------------|
| 1 — SDK bump & triage | High | 2–4 days | ✅ yes — gates everything |
| 2 — Data layer / queries | High | 1–1.5 weeks | ✅ yes |
| 3 — Tenancy / control plane | High | 3–5 days | ✅ yes (auth) |
| 4 — Actions & ObjectUI | Medium | 1 week | partial |
| 5 — AI / speculative pruning | Medium | 1–1.5 weeks | no |
| 6 — Tests / E2E / server | Medium | 1 week | no |
| 7 — Docs / GA | Low | 2–3 days | no |

**Critical path: 1 → 2 → 3.** Until those land, nothing renders against a real 7.x
backend. Phases 4–6 can parallelize once the data layer is green.

**Recommended first PR (this branch):** Phase 1 only — bump deps, get a compile-error
inventory, and convert that inventory into the live checklist that drives Phases 2–7.
That turns the unknowns in this plan into a concrete, sized backlog.

---

## 6. Open Questions for the Platform Team

1. Is there a published **3.x → 7.x client migration guide**, or is the spec CHANGELOG
   the canonical source?
2. Which 3.1.1 AI/security/integration schemas survived the 6.0.0 AI reset — i.e. which
   bucket-C hooks have a real 7.x home vs. should be deleted?
3. For mobile, is metadata fetched per-**environment** via discovery, or is there a
   device-facing **environment artifact** endpoint we should consume directly?
4. Mobile-optimized layouts are tracked platform-side as **M10.22 (P2, deferred)** —
   should the mobile renderers keep deriving layouts client-side, or wait for that?
