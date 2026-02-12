# ObjectStack Mobile — Roadmap

> **Date**: 2026-02-12
> **SDK**: `@objectstack/client@3.0.0`, `@objectstack/client-react@3.0.0`, `@objectstack/spec@3.0.0`
> **Tests**: ✅ 540/540 passing (63 suites, ~85% coverage)

---

## 1. Project Status

The ObjectStack Mobile client has completed all core development phases (0–6) and spec alignment phases (9–10). The SDK is upgraded to v3.0.0 (spec v3.0.0: 12 modules, 171 schemas).

### What's Implemented

- **23 custom hooks** covering all SDK namespaces
- **12 view renderers** (List, Form, Detail, Dashboard, Kanban, Calendar, Chart, Timeline, Map, Report, Page + widgets)
- **13 UI primitives** + 9 common components
- **24 lib modules** (auth, cache, offline, security, analytics, etc.)
- **4 Zustand stores** (app, ui, sync, security)
- **4 Maestro E2E flows** (configured, pending backend)
- Full authentication (better-auth), offline-first (SQLite), i18n, CI/CD (EAS)

### Tech Stack

| Category | Technology |
|----------|-----------|
| Runtime | Expo SDK 54, TypeScript 5.9 strict |
| Navigation | Expo Router (file-based) |
| Styling | NativeWind v4 (Tailwind CSS) |
| Client SDK | `@objectstack/client@3.0.0` + `@objectstack/client-react@3.0.0` |
| State | Zustand + TanStack Query v5 |
| Offline | expo-sqlite + sync queue |
| Auth | better-auth v1.4.18 + `@better-auth/expo` |
| Monitoring | Sentry |
| Testing | Jest + RNTL + MSW + Maestro |
| CI/CD | GitHub Actions + EAS Build/Update |

---

## 2. Development Phases

### Phase 0–3: Foundation ✅

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Foundation (Expo, Auth, Navigation, State, UI primitives) | ✅ |
| 1 | SDK Integration (Client, Provider, Hooks, Metadata Cache) | ✅ |
| 2 | ObjectUI Rendering Engine (12 view types, actions) | ✅ |
| 3 | ObjectQL Data Layer (Offline, Sync, Query Builder, Batch) | ✅ |

### Phase 4–5: Features ✅

| Phase | Description | Status |
|-------|-------------|--------|
| 4A | SDK Features (Files, Analytics, Charts, Kanban, Calendar, Security) | ✅ |
| 4B | ObjectOS Integration (Permissions, Workflow, Realtime, Notifications) | ✅ |
| 5A | Advanced Features (i18n, RTL, Performance, Testing, CI/CD) | ✅ |
| 5B | Advanced Features · SDK (AI/NLQ, Server i18n, Hook aliases) | ✅ |

### Phase 6: Production Readiness ✅ (mostly)

| Feature | Status |
|---------|--------|
| Crash Reporting (Sentry) | ✅ |
| Feature Flags, Remote Config, Analytics | ✅ |
| Security Audit, Performance Benchmarks | ✅ |
| App Store Readiness | ✅ |
| E2E Test Execution | ⚠️ Configured, pending backend |

### Phase 9–10: Spec Alignment — Core + UI ✅

| Feature | Status |
|---------|--------|
| Automation Hook (`useAutomation`) + Approval Process UI | ✅ |
| Package Management (`usePackageManagement`) + UI | ✅ |
| Analytics Explain (`useAnalyticsQuery.explain()`) | ✅ |
| Report Renderer (tabular/summary/matrix/chart) | ✅ |
| SDUI Page Composition (`PageRenderer`) | ✅ |
| Widget System (`widget-registry` + `WidgetHost`) | ✅ |
| Theme Token Mapping (`theme-bridge.ts`) | ✅ |

---

## 3. Spec v3.0.0 Compliance Matrix

> `@objectstack/spec` is the protocol "constitution". v3.0.0 restructured from 15 → 12 modules.
> Removed: `driver`, `auth`, `hub`, `permission`. Added: `security` (RLS, Policy, Sharing, Territory).
> Total: 171 Zod schemas, 7,095+ `.describe()` annotations.

### ✅ Fully Implemented

| Spec Module | Mobile Hook / Component |
|-------------|------------------------|
| `spec/api` — CRUD, Metadata, Auth, Views | `useQuery`, `useMutation`, `useObject`, `useView` |
| `spec/api` — Permissions | `usePermissions` |
| `spec/api` — Workflow | `useWorkflowState` |
| `spec/api` — Realtime/WebSocket | `useSubscription` |
| `spec/api` — Notifications | `useNotifications` |
| `spec/api` — AI (NLQ, Chat, Suggest, Insights) | `useAI` |
| `spec/api` — i18n | `useServerTranslations` |
| `spec/api` — Files | `useFileUpload` |
| `spec/api` — Analytics | `useAnalyticsQuery` / `useAnalyticsMeta` |
| `spec/api` — Automation Triggers | `useAutomation` |
| `spec/api` — Package Management | `usePackageManagement` |
| `spec/api` — Batch Operations | `useBatchMutation` |
| `spec/ui` — Report Views | `ReportRenderer` |
| `spec/ui` — SDUI Pages | `PageRenderer` |
| `spec/ui` — Widgets | `widget-registry` + `WidgetHost` |
| `spec/ui` — Theme Tokens | `theme-bridge.ts` |

### 🟡 Gaps — To Do

| Spec Module | Gap | Priority |
|-------------|-----|----------|
| `spec/ai` — Conversation Session | Missing session persistence, token budget | 🟡 |
| `spec/ai` — RAG Pipeline | Not implemented | 🟡 |
| `spec/ai` — MCP Integration | Not implemented (full MCP 2.0) | 🟡 |
| `spec/ai` — Agent System | Not implemented (multi-agent groups) | 🟡 |
| `spec/ai` — Cost Management | Not implemented | 🟢 |
| `spec/ai` — DevOps Agent / Code Gen / Predictive | Not implemented | 🟢 |
| `spec/security` — RLS | Not implemented | 🟡 |
| `spec/security` — Policies | Not implemented | 🟡 |
| `spec/security` — Sharing Rules | Not implemented | 🟡 |
| `spec/security` — Territory | Not implemented | 🟢 |
| `spec/ui` — Animation / Gesture | Not implemented | 🟢 |
| `spec/ui` — Accessibility (a11y) | Not implemented | 🟡 |
| `spec/ui` — Offline/Sync Config | Self-built (expo-sqlite), can align | 🟢 |
| `spec/automation` — Flow Builder | Not implemented | 🟡 |
| `spec/automation` — ETL / Connectors | Not implemented | 🟢 |
| `spec/system` — Collaboration/CRDT | Not implemented | 🟡 |
| `spec/system` — Awareness/Presence | Not implemented | 🟡 |
| `spec/system` — Audit Log | Not implemented | 🟢 |

Priority: 🔴 Blocks v1.0 · 🟡 Enhances compliance/UX · 🟢 Defer to post-GA

---

## 4. Next: v1.0 GA Launch

> **Duration**: 2–3 weeks | **Prerequisites**: Running backend + physical devices

### 4.1 E2E Test Execution 🔴

- [ ] Set up test backend, seed data
- [ ] Execute 4 Maestro flows (auth, navigation, list, CRUD)
- [ ] Fix integration issues

### 4.2 Performance Profiling 🟡

- [ ] Build production preview via EAS
- [ ] Profile on real iOS/Android devices (60fps scroll, <100ms form, <500ms API, <200MB RAM)

### 4.3 App Store Launch 🔴

- [ ] Finalize app icon, splash screen, screenshots
- [ ] Privacy policy, Terms of Service, content ratings
- [ ] Production build → TestFlight/Play internal → Public review

---

## 5. Phase 11: AI & Intelligence

> **Duration**: 3–4 weeks
> v3.0.0 expanded AI module from ~100 to 187 exports.

### 11.1 Conversation Session Persistence 🟡

- [ ] Extend `useAI` — session create/resume, persistent history (SQLite), token budget, `ConversationAnalytics`
- [ ] Session list UI for switching conversations

### 11.2 RAG Pipeline 🟡

- [ ] `hooks/useRAG.ts` — query + source citations + confidence scores
- [ ] Integrate into `useAI` chat flow

### 11.3 MCP Awareness 🟡

- [ ] `hooks/useMCPTools.ts` — discover/trigger MCP-connected tools via server proxy
- [ ] Show tool availability in AI chat UI

### 11.4 Agent Orchestration 🟡

- [ ] `hooks/useAgent.ts` — start task, monitor progress, typed agent actions (multi-agent groups)
- [ ] `components/ai/AgentProgress.tsx`

### 11.5 AI Cost Management 🟢

- [ ] `hooks/useAICost.ts` — cost breakdown, budget limits, alerts

### 11.6 Accessibility 🟡

- [ ] Audit renderers for ARIA props, focus management, keyboard navigation, WCAG contrast

---

## 6. Phase 12: Security Module

> 🆕 v3.0.0 `security` module (26 exports) replaces `auth`/`permission`/`hub`.
> **Duration**: 2–3 weeks

### 12.1 RLS Awareness 🟡

- [ ] `hooks/useRLS.ts` — show RLS policies, access restrictions on list/detail views

### 12.2 Security Policies 🟡

- [ ] `hooks/useSecurityPolicies.ts` — password/session/network policy display

### 12.3 Sharing Rules 🟡

- [ ] `hooks/useSharing.ts` — record-level sharing + `SharePanel` component

### 12.4 Territory Management 🟢

- [ ] `hooks/useTerritory.ts` — territory assignments on records

---

## 7. Phase 13: Advanced Platform Features

> **Duration**: 3–4 weeks (can overlap with other phases)

### 13.1 Collaboration & CRDT 🟡

- [ ] `hooks/useCollaboration.ts` — sessions, cursor tracking, presence indicators
- [ ] `components/realtime/CollaborationOverlay.tsx`

### 13.2 Audit Log 🟢

- [ ] `hooks/useAuditLog.ts` — timeline view on record details ("History" tab)

### 13.3 Flow Visualization 🟢

- [ ] `components/automation/FlowViewer.tsx` — read-only flow diagram (nodes + edges)

### 13.4 State Machine Visualization 🟢

- [ ] `components/workflow/StateMachineViewer.tsx` — diagram of states + transitions

---

## 8. Future Roadmap (Post v1.0)

| Version | Focus |
|---------|-------|
| v1.1 | UX refinements (onboarding, haptic, VoiceOver/TalkBack, WidgetKit) |
| v1.2 | Notification Center (categories, inline actions, activity feed, comments) |
| v1.3 | Messaging & Channels (Slack/Teams pattern, DMs, threads, file sharing) |
| v1.4 | Offline-First (selective sync, three-way merge, offline analytics) |
| v1.5 | Platform Integration (Siri Shortcuts, deep links, Share extension, Apple Watch) |

---

## 9. Decision Matrix

| Task | Blocks v1.0? | Est. Time | Priority |
|------|-------------|-----------|----------|
| E2E Testing | ✅ Yes | 1–2 days | 🔴 |
| Performance Profiling | ⚠️ Recommended | 2–3 days | 🟡 |
| App Store Assets + Submit | ✅ Yes | 1–2 weeks | 🔴 |
| AI Sessions (11.1) | No | 3–4 days | 🟡 |
| RAG (11.2) | No | 2–3 days | 🟡 |
| MCP (11.3) | No | 2 days | 🟡 |
| Agents (11.4) | No | 3–4 days | 🟡 |
| AI Cost (11.5) | No | 2 days | 🟢 |
| a11y (11.6) | No | 3–4 days | 🟡 |
| RLS (12.1) | No | 3–4 days | 🟡 |
| Security Policies (12.2) | No | 2 days | 🟡 |
| Sharing (12.3) | No | 3 days | 🟡 |
| Territory (12.4) | No | 1–2 days | 🟢 |
| Collaboration (13.1) | No | 4–5 days | 🟡 |
| Audit Log (13.2) | No | 2–3 days | 🟢 |
| Flow Viz (13.3) | No | 3–4 days | 🟢 |
| State Machine (13.4) | No | 2 days | 🟢 |

**Total Phase 11–13**: ~8–10 weeks (can overlap with v1.0 launch)

---

## 10. Success Criteria

### v1.0 GA

1. ✅ 540+ unit/integration tests passing
2. ✅ All hooks and lib modules have test coverage
3. ☐ All 4 Maestro E2E flows passing
4. ☐ Performance metrics within targets on real devices
5. ☐ Security audit passing
6. ☐ App Store readiness score ≥ 90/100
7. ☐ App Store / Play Store review approved

### v1.1 (Spec v3.0.0 Full Compliance)

1. ☑ Phase 9–10 complete
2. ☐ Phase 11 complete (AI, a11y)
3. ☐ Phase 12 complete (Security)
4. ☐ Phase 13 complete (Collaboration, audit, flow)
5. ☐ All new hooks exported and tested

---

## 11. For SDK Team — Suggested Upstream Hooks

| Mobile Hook | SDK API | Notes |
|-------------|---------|-------|
| `usePermissions()` | `client.permissions.*` | RBAC enforcement |
| `useWorkflowState()` | `client.workflow.*` | State machine UI |
| `useSubscription()` | `client.realtime.*` | WebSocket management |
| `useNotifications()` | `client.notifications.*` | Push lifecycle |
| `useAI()` | `client.ai.*` | NLQ, chat, suggest |
| `useServerTranslations()` | `client.i18n.*` | Server translations |
| `useSavedViews()` | `client.views.*` | View CRUD |
| `useAutomation()` | `client.automation.*` | Automation triggers |
| `usePackageManagement()` | `client.packages.*` | Package lifecycle |
| `useRAG()` | `client.ai.rag?` | 🆕 Needs server RAG |
| `useCollaboration()` | `client.realtime.*` | 🆕 CRDT co-editing |
| `useRLS()` | `client.security?` | 🆕 RLS awareness (v3.0.0) |
| `useSharing()` | `client.security?` | 🆕 Sharing rules (v3.0.0) |
| `useAICost()` | `client.ai.cost?` | 🆕 AI cost tracking (v3.0.0) |
| `useMCPTools()` | `client.ai.mcp?` | 🆕 MCP tool discovery (v3.0.0) |

---

*Last updated: 2026-02-12*
