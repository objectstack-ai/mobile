# ObjectStack Mobile — Roadmap

> **Date**: 2026-02-12
> **SDK**: `@objectstack/client@3.0.0`, `@objectstack/client-react@3.0.0`, `@objectstack/spec@3.0.0`
> **Tests**: ✅ 605/605 passing (78 suites, ~85% coverage)

---

## 1. Project Status

The ObjectStack Mobile client has completed all core development phases (0–6), spec alignment phases (9–10), and advanced feature phases (11–13). The SDK is upgraded to v3.0.0 (spec v3.0.0: 12 modules, 171 schemas).

### What's Implemented

- **34 custom hooks** covering all SDK namespaces (including AI sessions, RAG, MCP, agents, cost, security, collaboration, audit)
- **16 view renderers / components** (List, Form, Detail, Dashboard, Kanban, Calendar, Chart, Timeline, Map, Report, Page, widgets, FlowViewer, StateMachineViewer, AgentProgress, CollaborationOverlay)
- **13 UI primitives** + 9 common components
- **24 lib modules** (auth, cache, offline, security, analytics, etc.)
- **4 Zustand stores** (app, ui, sync, security)
- **4 Maestro E2E flows** (configured, pending backend)
- Full authentication (better-auth), offline-first (SQLite), i18n, CI/CD (EAS)
- Accessibility props on all new components (Phase 11.6)

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

### Phase 11: AI & Intelligence ✅

| Feature | Status |
|---------|--------|
| AI Session Persistence (`useAISession`) | ✅ |
| RAG Pipeline (`useRAG`) | ✅ |
| MCP Awareness (`useMCPTools`) | ✅ |
| Agent Orchestration (`useAgent` + `AgentProgress`) | ✅ |
| AI Cost Management (`useAICost`) | ✅ |
| Accessibility (a11y props on components) | ✅ |

### Phase 12: Security Module ✅

| Feature | Status |
|---------|--------|
| RLS Awareness (`useRLS`) | ✅ |
| Security Policies (`useSecurityPolicies`) | ✅ |
| Sharing Rules (`useSharing`) | ✅ |
| Territory Management (`useTerritory`) | ✅ |

### Phase 13: Advanced Platform Features ✅

| Feature | Status |
|---------|--------|
| Collaboration & CRDT (`useCollaboration` + `CollaborationOverlay`) | ✅ |
| Audit Log (`useAuditLog`) | ✅ |
| Flow Visualization (`FlowViewer`) | ✅ |
| State Machine Visualization (`StateMachineViewer`) | ✅ |

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
| `spec/ai` — Conversation Session | `useAISession` |
| `spec/ai` — RAG Pipeline | `useRAG` |
| `spec/ai` — MCP Integration | `useMCPTools` |
| `spec/ai` — Agent System | `useAgent` + `AgentProgress` |
| `spec/ai` — Cost Management | `useAICost` |
| `spec/security` — RLS | `useRLS` |
| `spec/security` — Policies | `useSecurityPolicies` |
| `spec/security` — Sharing Rules | `useSharing` |
| `spec/security` — Territory | `useTerritory` |
| `spec/ui` — Accessibility (a11y) | a11y props on all new components |
| `spec/automation` — Flow Builder | `FlowViewer` (read-only) |
| `spec/system` — Collaboration/CRDT | `useCollaboration` + `CollaborationOverlay` |
| `spec/system` — Awareness/Presence | `CollaborationIndicator` (with a11y) |
| `spec/system` — Audit Log | `useAuditLog` |

### 🟡 Gaps — Deferred to Post-GA

| Spec Module | Gap | Priority |
|-------------|-----|----------|
| `spec/ai` — DevOps Agent / Code Gen / Predictive | Not implemented | 🟢 |
| `spec/ui` — Animation / Gesture | Not implemented | 🟢 |
| `spec/ui` — Offline/Sync Config | Self-built (expo-sqlite), can align | 🟢 |
| `spec/automation` — ETL / Connectors | Not implemented | 🟢 |

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

## 5. Phase 11: AI & Intelligence ✅

> **Duration**: 3–4 weeks
> v3.0.0 expanded AI module from ~100 to 187 exports.

### 11.1 Conversation Session Persistence ✅

- [x] `hooks/useAISession.ts` — session create/resume/delete/list, persistent history
- [x] Session list UI for switching conversations

### 11.2 RAG Pipeline ✅

- [x] `hooks/useRAG.ts` — query + source citations + confidence scores
- [x] Integrate into `useAI` chat flow

### 11.3 MCP Awareness ✅

- [x] `hooks/useMCPTools.ts` — discover/trigger MCP-connected tools via server proxy
- [x] Show tool availability in AI chat UI

### 11.4 Agent Orchestration ✅

- [x] `hooks/useAgent.ts` — start task, monitor progress, typed agent actions (multi-agent groups)
- [x] `components/ai/AgentProgress.tsx`

### 11.5 AI Cost Management ✅

- [x] `hooks/useAICost.ts` — cost breakdown, budget limits, alerts

### 11.6 Accessibility ✅

- [x] Audit renderers for ARIA props, focus management, keyboard navigation, WCAG contrast
- [x] a11y props on all new Phase 11–13 components

---

## 6. Phase 12: Security Module ✅

> 🆕 v3.0.0 `security` module (26 exports) replaces `auth`/`permission`/`hub`.
> **Duration**: 2–3 weeks

### 12.1 RLS Awareness ✅

- [x] `hooks/useRLS.ts` — show RLS policies, access restrictions on list/detail views

### 12.2 Security Policies ✅

- [x] `hooks/useSecurityPolicies.ts` — password/session/network policy display

### 12.3 Sharing Rules ✅

- [x] `hooks/useSharing.ts` — record-level sharing + `SharePanel` component

### 12.4 Territory Management ✅

- [x] `hooks/useTerritory.ts` — territory assignments on records

---

## 7. Phase 13: Advanced Platform Features ✅

> **Duration**: 3–4 weeks (can overlap with other phases)

### 13.1 Collaboration & CRDT ✅

- [x] `hooks/useCollaboration.ts` — sessions, cursor tracking, presence indicators
- [x] `components/realtime/CollaborationOverlay.tsx`

### 13.2 Audit Log ✅

- [x] `hooks/useAuditLog.ts` — timeline view on record details ("History" tab)

### 13.3 Flow Visualization ✅

- [x] `components/automation/FlowViewer.tsx` — read-only flow diagram (nodes + edges)

### 13.4 State Machine Visualization ✅

- [x] `components/workflow/StateMachineViewer.tsx` — diagram of states + transitions

---

## 8. UX Design Review Summary

> Full UX design review: **[docs/UX-DESIGN-REVIEW.md](./docs/UX-DESIGN-REVIEW.md)**
> Benchmarks: Salesforce Mobile, ServiceNow, Microsoft Dynamics 365, HubSpot, Monday.com, Notion, Linear

### Current UX Rating: ★★★☆☆ (3.2/5)

| Area | Rating | Key Gap |
|------|--------|---------|
| Architecture | ★★★★★ | None — excellent foundation |
| Feature Coverage | ★★★★★ | None — 34 hooks, 16 renderers |
| Visual Design | ★★☆☆☆ | No brand identity, flat cards, no elevation system |
| Interaction Design | ★★☆☆☆ | No animations, minimal haptics, missing gestures |
| Navigation Efficiency | ★★☆☆☆ | 5+ taps to any record; no search, no recent items |
| User Onboarding | ★☆☆☆☆ | No onboarding; first screen is a URL input |
| Home Screen | ★★☆☆☆ | Static hardcoded KPIs; no personalization |
| Profile/Settings | ★☆☆☆☆ | Placeholder buttons; no actual settings |

### Top 10 Critical UX Gaps

1. No global search / command palette
2. No recent items or favorites
3. No quick actions (FAB)
4. Static home dashboard with no personalization
5. No skeleton loading (spinners only)
6. No page transition animations
7. Profile page is non-functional
8. No inline field editing on record detail
9. Dashboard widgets are not interactive (no drill-down)
10. No user onboarding flow

---

## 9. Future Roadmap (Post v1.0)

### Phase 14: UX Foundation — Navigation & Loading ⏳

> **Duration**: 3–4 weeks | **Priority**: 🔴 Critical for v1.1
> **Goal**: Fix navigation inefficiency and perceived performance

| # | Feature | Description | Est. |
|---|---------|-------------|------|
| 14.1 | Global Search | Universal search across all objects/records with type-ahead, recent searches, and result grouping | 5 days |
| 14.2 | Recent Items | Track last 50 accessed records; show on Home; persist across sessions | 3 days |
| 14.3 | Favorites / Pinned | Pin any record, dashboard, or report; show on Home and per-app | 2 days |
| 14.4 | Skeleton Loading | Replace all `ActivityIndicator` spinners with content-shaped skeletons (list, detail, dashboard, form) | 3 days |
| 14.5 | Navigation Tab Redesign | 5-tab layout: Home, Search, Apps, Notifications, More (replaces Profile) | 2 days |
| 14.6 | Page Transitions | Spring-based stack/modal transitions using `react-native-reanimated` | 3 days |

### Phase 15: UX Polish — Home & Detail ⏳

> **Duration**: 3–4 weeks | **Priority**: 🔴 Critical for v1.1
> **Goal**: Transform Home and Detail views to match top-tier enterprise apps

| # | Feature | Description | Est. |
|---|---------|-------------|------|
| 15.1 | Home Redesign | Personalized feed: greeting, favorites, recent items, dynamic KPIs, AI suggestions | 5 days |
| 15.2 | Quick Actions / FAB | Context-aware floating action button with new-record, search, scan shortcuts | 3 days |
| 15.3 | Detail View Tabs | Tabbed layout: Details, Activity, Related, Files — with activity timeline from `useAuditLog` | 4 days |
| 15.4 | Inline Field Editing | Tap field on detail view → edit in place without navigating to form | 3 days |
| 15.5 | Contextual Record Actions | Phone → Call, Email → Compose, Address → Maps, URL → Browser | 2 days |
| 15.6 | Undo/Redo Snackbar | After destructive actions, show 5-second undo snackbar | 2 days |

### Phase 16: UX Polish — Forms, Lists & Interactions ⏳

> **Duration**: 2–3 weeks | **Priority**: 🟡 Important for v1.1
> **Goal**: Improve data entry, list interactions, and micro-interactions

| # | Feature | Description | Est. |
|---|---------|-------------|------|
| 16.1 | Form Improvements | Auto-save drafts, progress indicator, "Discard changes?" confirmation, field-level help | 4 days |
| 16.2 | Enhanced Input Components | Floating labels, error states, prefix/suffix icons, search-enabled Select | 3 days |
| 16.3 | List View Enhancements | Record count badge, density toggle (compact/comfortable), saved view tabs | 3 days |
| 16.4 | Haptic Feedback | Extend haptics to toggles, swipe actions, pull-to-refresh, success/error states | 2 days |
| 16.5 | Micro-interactions | List item entrance animations, state change transitions, button feedback | 3 days |

### Phase 17: UX Polish — Settings, Onboarding & Notifications ⏳

> **Duration**: 2–3 weeks | **Priority**: 🟡 Important for v1.1
> **Goal**: Complete the user experience with onboarding, settings, and notification improvements

| # | Feature | Description | Est. |
|---|---------|-------------|------|
| 17.1 | Settings Screen | Theme, language, notification prefs, security, cache, diagnostics, support | 4 days |
| 17.2 | User Onboarding | Welcome screens, feature tour (3–4 slides), contextual first-use tooltips | 3 days |
| 17.3 | Notification Improvements | Category grouping, swipe actions, inline action buttons, relative timestamps | 3 days |
| 17.4 | Sign-In Enhancements | Password toggle, forgot password, biometric quick-login, field validation | 2 days |
| 17.5 | Sign-Up Enhancements | Password strength meter, ToS checkbox, step-by-step registration | 2 days |

### Phase 18: Advanced UX — Dashboards, Kanban & Calendar ⏳

> **Duration**: 3–4 weeks | **Priority**: 🟢 Nice-to-have for v1.2
> **Goal**: Elevate specialized views to match best-in-class experiences

| # | Feature | Description | Est. |
|---|---------|-------------|------|
| 18.1 | Dashboard Drill-Down | Tap widget → filtered record list; date range picker; fullscreen widget mode | 4 days |
| 18.2 | Kanban Drag-and-Drop | True drag-and-drop cards between columns using `react-native-gesture-handler` | 5 days |
| 18.3 | Calendar Week/Day Views | Week and day view modes with event creation and drag-to-reschedule | 5 days |
| 18.4 | Map View (Native) | Replace location list with `react-native-maps` with marker clustering | 4 days |
| 18.5 | Chart Interactions | Tap-to-highlight, drill-down, animated chart transitions | 3 days |

### Phase 19: Accessibility & Performance ⏳

> **Duration**: 2–3 weeks | **Priority**: 🟡 Important for v1.2
> **Goal**: Enterprise-grade accessibility and perceived performance

| # | Feature | Description | Est. |
|---|---------|-------------|------|
| 19.1 | Screen Reader Optimization | `accessibilityHint`, live regions, focus management, announcements | 4 days |
| 19.2 | Dynamic Type Support | iOS Dynamic Type + Android text scaling across all components | 3 days |
| 19.3 | Reduced Motion | Respect `prefers-reduced-motion`; alternative non-animated states | 2 days |
| 19.4 | Optimistic Updates | Instant UI updates on mutations with background sync and rollback | 3 days |
| 19.5 | Prefetching | List → detail prefetch; tab content prefetch; search type-ahead | 3 days |

### Phase 20: Platform Integration ⏳

> **Duration**: 3–4 weeks | **Priority**: 🟢 Nice-to-have for v1.3+
> **Goal**: Deep OS integration for power users

| # | Feature | Description | Est. |
|---|---------|-------------|------|
| 20.1 | Design Token Enhancement | Semantic colors (success/warning/info), elevation system, spacing/radius tokens | 2 days |
| 20.2 | Widget Kit | iOS WidgetKit + Android app widgets for KPIs and recent items | 5 days |
| 20.3 | Siri/Google Assistant | Voice shortcuts for search, create record, check notifications | 4 days |
| 20.4 | Deep Links & Share Extension | Universal links, share to app, open record from notification | 3 days |
| 20.5 | Apple Watch Companion | Notification triage, quick actions, recent items on wrist | 5 days |

### Version Summary

| Version | Phases | Focus | Duration |
|---------|--------|-------|----------|
| **v1.0 GA** | 0–13 + E2E + App Store | Feature-complete, spec-compliant | ✅ + 2–3 weeks |
| **v1.1** | 14–17 | UX overhaul — navigation, home, detail, forms, onboarding | 10–14 weeks |
| **v1.2** | 18–19 | Advanced views, accessibility, performance | 5–7 weeks |
| **v1.3** | 20 | Platform integration (widgets, voice, deep links, Watch) | 3–4 weeks |
| **v1.4** | — | Notification Center (categories, inline actions, activity feed) |  |
| **v1.5** | — | Messaging & Channels (Slack/Teams pattern, DMs, threads) |  |
| **v1.6** | — | Advanced Offline (selective sync, three-way merge, offline analytics) |  |

---

## 10. Decision Matrix

| Task | Blocks v1.0? | Est. Time | Status |
|------|-------------|-----------|--------|
| E2E Testing | ✅ Yes | 1–2 days | ⏳ Pending backend |
| Performance Profiling | ⚠️ Recommended | 2–3 days | ⏳ Pending devices |
| App Store Assets + Submit | ✅ Yes | 1–2 weeks | ⏳ Pending assets |
| AI Sessions (11.1) | No | 3–4 days | ✅ Done |
| RAG (11.2) | No | 2–3 days | ✅ Done |
| MCP (11.3) | No | 2 days | ✅ Done |
| Agents (11.4) | No | 3–4 days | ✅ Done |
| AI Cost (11.5) | No | 2 days | ✅ Done |
| a11y (11.6) | No | 3–4 days | ✅ Done |
| RLS (12.1) | No | 3–4 days | ✅ Done |
| Security Policies (12.2) | No | 2 days | ✅ Done |
| Sharing (12.3) | No | 3 days | ✅ Done |
| Territory (12.4) | No | 1–2 days | ✅ Done |
| Collaboration (13.1) | No | 4–5 days | ✅ Done |
| Audit Log (13.2) | No | 2–3 days | ✅ Done |
| Flow Viz (13.3) | No | 3–4 days | ✅ Done |
| State Machine (13.4) | No | 2 days | ✅ Done |
| **UX: Navigation & Loading (14)** | **No** | **3–4 weeks** | **⏳ Planned** |
| **UX: Home & Detail (15)** | **No** | **3–4 weeks** | **⏳ Planned** |
| **UX: Forms & Interactions (16)** | **No** | **2–3 weeks** | **⏳ Planned** |
| **UX: Settings & Onboarding (17)** | **No** | **2–3 weeks** | **⏳ Planned** |
| **UX: Advanced Views (18)** | **No** | **3–4 weeks** | **⏳ Planned** |
| **UX: A11y & Performance (19)** | **No** | **2–3 weeks** | **⏳ Planned** |
| **Platform Integration (20)** | **No** | **3–4 weeks** | **⏳ Planned** |

**Phase 11–13**: ✅ Complete

---

## 11. Success Criteria

### v1.0 GA

1. ✅ 605+ unit/integration tests passing
2. ✅ All hooks and lib modules have test coverage
3. ☐ All 4 Maestro E2E flows passing
4. ☐ Performance metrics within targets on real devices
5. ☐ Security audit passing
6. ☐ App Store readiness score ≥ 90/100
7. ☐ App Store / Play Store review approved

### v1.1 (UX Overhaul)

1. ✅ Phase 9–13 complete (spec v3.0.0 compliance)
2. ☐ Phase 14 complete (navigation, search, skeletons)
3. ☐ Phase 15 complete (home redesign, detail tabs, inline edit)
4. ☐ Phase 16 complete (forms, lists, micro-interactions)
5. ☐ Phase 17 complete (settings, onboarding, notifications)
6. ☐ ≤ 3 taps to any record via search or recent items
7. ☐ Skeleton loading on all data screens
8. ☐ User onboarding flow for first-time users
9. ☐ Settings screen fully functional
10. ☐ App Store rating ≥ 4.5★

### v1.2 (Advanced UX + Accessibility)

1. ☐ Phase 18 complete (dashboard drill-down, kanban DnD, calendar views)
2. ☐ Phase 19 complete (screen reader, dynamic type, optimistic updates)
3. ☐ WCAG 2.1 Level AA compliance
4. ☐ Accessibility score ≥ 90/100

---

## 11. For SDK Team — Suggested Upstream Hooks

| Mobile Hook | SDK API | Status |
|-------------|---------|--------|
| `usePermissions()` | `client.permissions.*` | ✅ |
| `useWorkflowState()` | `client.workflow.*` | ✅ |
| `useSubscription()` | `client.realtime.*` | ✅ |
| `useNotifications()` | `client.notifications.*` | ✅ |
| `useAI()` | `client.ai.*` | ✅ |
| `useServerTranslations()` | `client.i18n.*` | ✅ |
| `useSavedViews()` | `client.views.*` | ✅ |
| `useAutomation()` | `client.automation.*` | ✅ |
| `usePackageManagement()` | `client.packages.*` | ✅ |
| `useRAG()` | `client.ai.rag.*` | ✅ Needs server RAG |
| `useCollaboration()` | `client.realtime.collaboration.*` | ✅ Needs CRDT backend |
| `useRLS()` | `client.security.rls.*` | ✅ Needs security API |
| `useSharing()` | `client.security.sharing.*` | ✅ Needs security API |
| `useAICost()` | `client.ai.cost.*` | ✅ Needs cost API |
| `useMCPTools()` | `client.ai.mcp.*` | ✅ Needs MCP proxy |
| `useAgent()` | `client.ai.agents.*` | ✅ Needs agent runtime |
| `useAISession()` | `client.ai.sessions.*` | ✅ Needs session API |
| `useSecurityPolicies()` | `client.security.policies.*` | ✅ Needs security API |
| `useTerritory()` | `client.security.territories.*` | ✅ Needs security API |
| `useAuditLog()` | `client.system.audit.*` | ✅ Needs audit API |

---

*Last updated: 2026-02-12*
