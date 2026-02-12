# Next Development Phase — Roadmap to v1.0 GA & Beyond

> **Date**: 2026-02-12 (Updated after `@objectstack/spec@3.0.0` upgrade)
> **Status**: All Feature Development & Testing Complete — Entering Final Validation + Spec Alignment
> **Test Status**: ✅ 540/540 tests passing (63 suites)
> **SDK**: `@objectstack/client@3.0.0`, `@objectstack/client-react@3.0.0`, `@objectstack/spec@3.0.0`

---

## Current Situation

All development phases (0 through 5B) and most of Phase 6 are **complete**:

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 0 | Foundation (Expo, Auth, Navigation, State) | ✅ Complete |
| Phase 1 | SDK Integration (Client, Provider, Hooks, Cache) | ✅ Complete |
| Phase 2 | ObjectUI Rendering Engine (12 view types, actions) | ✅ Complete |
| Phase 3 | ObjectQL Data Layer (Offline, Sync, Query Builder) | ✅ Complete |
| Phase 4A | SDK Features (Files, Analytics, Charts, Security) | ✅ Complete |
| Phase 4B | ObjectOS Integration (Permissions, Workflow, Realtime, Notifications) | ✅ Complete |
| Phase 5A | Advanced Features (i18n, Performance, Testing, CI/CD) | ✅ Complete |
| Phase 5B | Advanced Features · SDK (AI, Server i18n, SDK Hooks) | ✅ Complete |
| Phase 6.1–6.2 | Production Monitoring & Analytics | ✅ Complete |
| Phase 6.3 | Final Validation | ⚠️ In Progress |

### What's Actually Implemented

- **23 custom hooks** covering all SDK namespaces (all tested)
- **12 view renderers** (List, Form, Detail, Dashboard, Kanban, Calendar, Chart, Timeline, Map + filter/swipe/fields)
- **13 UI primitives** (Button, Card, Input, Dialog, etc.)
- **9 common components** (ErrorBoundary, SearchBar, etc.)
- **24 lib modules** (auth, cache, offline, security, analytics, etc.) (all tested)
- **4 Zustand stores** (app, ui, sync, security)
- **4 Maestro E2E flows** (auth, navigation, list, CRUD)
- **493 unit/integration tests** across 58 test suites (expanded to 540 tests / 63 suites after Phase 9–10)

---

## Spec v3.0.0 Gap Analysis Summary

> `@objectstack/spec` is the protocol "constitution" for all ObjectStack development.
> The spec v3.0.0 defines **12 modules** (restructured from v2.0.4's 15 modules): data, system, kernel, ai, automation, api, ui, contracts, integration, security, studio, + root.
> Removed modules: `driver`, `auth`, `hub`, `permission` (functionality merged into `security`, `system`, `data`).
> New module: `security` (RLS, Permission, Policy, Sharing, Territory).
> Total: **171 Zod schemas**, 7,095+ `.describe()` annotations.
> The mobile app must align with this protocol to remain specification-compliant.

### Protocol Compliance Matrix

| Spec Module | Client SDK | Mobile Status | Gap |
|-------------|-----------|---------------|-----|
| `spec/api` — CRUD, Metadata, Auth, Views | `client.data.*`, `client.meta.*`, `client.auth.*`, `client.views.*` | ✅ Fully implemented | — |
| `spec/api` — Permissions | `client.permissions.*` | ✅ `usePermissions` hook | — |
| `spec/api` — Workflow | `client.workflow.*` | ✅ `useWorkflowState` hook | — |
| `spec/api` — Realtime/WebSocket | `client.realtime.*` | ✅ `useSubscription` hook | — |
| `spec/api` — Notifications | `client.notifications.*` | ✅ `useNotifications` hook | — |
| `spec/api` — AI (NLQ, Chat, Suggest, Insights) | `client.ai.*` | ✅ `useAI` hook | — |
| `spec/api` — i18n | `client.i18n.*` | ✅ `useServerTranslations` hook | — |
| `spec/api` — Files | `client.files.*` | ✅ `useFileUpload` hook | — |
| `spec/api` — Analytics | `client.analytics.query/meta` | ✅ `useAnalyticsQuery/Meta` hooks | — |
| `spec/api` — Automation Triggers | `client.automation.trigger()` | ✅ `useAutomation` hook | — |
| `spec/api` — Package Management | `client.packages.*` (6个方法) | ✅ `usePackageManagement` hook | — |
| `spec/api` — Batch Data Operations | `client.data.batch/createMany/updateMany/deleteMany` | ✅ `useBatchMutation` hook | — |
| `spec/api` — GraphQL Federation | `spec/api` → GraphQL, Subgraph, Federation | ❌ Not implemented | 🟢 Server feature |
| `spec/api` — OData Adapter | `spec/api` → OData | ❌ Not implemented | 🟢 Server feature |
| `spec/ui` — Report/Analytics Views | `ReportSchema`, `ReportChart`, `ReportColumn`, `ReportGrouping` | ✅ ReportRenderer 已实现 | — |
| `spec/ui` — Page/SDUI Composition | `PageSchema`, `PageComponent`, `PageRegion`, `PageVariable` | ✅ PageRenderer 已实现 | — |
| `spec/ui` — Widget System | `WidgetManifest`, `WidgetLifecycle`, `WidgetEvent`, `WidgetProperty` | ✅ widget-registry + WidgetHost 已实现 | — |
| `spec/ui` — Theme Tokens | `ThemeSchema`, `ColorPalette`, `Typography`, `Spacing`, `Shadow` | ✅ theme-bridge.ts 已实现 | — |
| `spec/ui` — Animation System | 🆕 `AnimationSchema`, `ComponentAnimation`, `EasingFunction`, `MotionConfig` | ❌ Not implemented | 🟢 Enhancement |
| `spec/ui` — Gesture System | 🆕 `GestureConfig`, `SwipeGesture`, `PinchGesture`, `LongPressGesture` | ❌ Not implemented | 🟢 Enhancement |
| `spec/ui` — Accessibility (a11y) | 🆕 `AriaProps`, `FocusManagement`, `KeyboardNavigation`, `WcagContrastLevel` | ❌ Not implemented | 🟡 Medium |
| `spec/ui` — Offline/Sync Config | 🆕 `OfflineConfig`, `SyncConfig`, `OfflineStrategy`, `OfflineCache` | ⚠️ 自建 (expo-sqlite) | 🟢 Can align |
| `spec/ui` — Responsive Layout | 🆕 `ResponsiveConfig`, `Breakpoints`, `DensityMode` | ⚠️ 部分 (NativeWind) | 🟢 Can align |
| `spec/ui` — DnD Config | 🆕 `DndConfig`, `DragHandle`, `DropZone`, `DragConstraint` | ⚠️ Kanban 有拖拽 | 🟢 Can align |
| `spec/ai` — MCP Server Integration | `MCPServerConfig`, `MCPTool`, `MCPResource`, `MCPPrompt` (full MCP 2.0) | ❌ Not implemented | 🟡 AI extensibility |
| `spec/ai` — RAG Pipeline | `RAGPipelineConfig`, `RAGQueryRequest/Response`, `ChunkingStrategy` | ❌ Not implemented | 🟡 Advanced AI |
| `spec/ai` — Conversation Session | `ConversationSession`, `ConversationMessage`, `TokenBudget`, `ConversationAnalytics` | ⚠️ Basic in `useAI` | 🟡 Missing session persistence |
| `spec/ai` — Agent System | `AgentSchema`, `AgentAction`, `MultiAgentGroup`, `AgentCommunicationProtocol` | ❌ Not implemented | 🟡 Agent orchestration |
| `spec/ai` — Cost Management | 🆕 `CostAnalytics`, `BudgetLimit`, `CostAlert`, `CostReport`, `CostOptimizationRecommendation` | ❌ Not implemented | 🟢 Admin feature |
| `spec/ai` — DevOps Agent | 🆕 `DevOpsAgentSchema`, `DevOpsTool`, `CICDPipelineConfig`, `SelfHealingConfig` | ❌ Not implemented | 🟢 Admin feature |
| `spec/ai` — Code Generation | 🆕 `CodeGenerationConfig`, `CodeGenerationRequest`, `GeneratedCode` | ❌ Not implemented | 🟢 Developer feature |
| `spec/ai` — Predictive Analytics | 🆕 `PredictiveModel`, `PredictionRequest`, `AnomalyDetection` | ❌ Not implemented | 🟢 Advanced feature |
| `spec/security` — RLS | 🆕 `RLSConfig`, `RowLevelSecurityPolicy`, `RLSEvaluationResult` | ❌ Not implemented | 🟡 Security |
| `spec/security` — Policies | 🆕 `PolicySchema`, `PasswordPolicy`, `SessionPolicy`, `NetworkPolicy` | ❌ Not implemented | 🟡 Security |
| `spec/security` — Sharing Rules | 🆕 `SharingRuleSchema`, `OwnerSharingRule`, `CriteriaSharingRule` | ❌ Not implemented | 🟡 Security |
| `spec/security` — Territory | 🆕 `TerritorySchema`, `TerritoryModel` | ❌ Not implemented | 🟢 Enterprise |
| `spec/automation` — Flow Builder | `FlowSchema`, `FlowNode`, `FlowEdge`, `FlowVariable` | ❌ Not implemented | 🟡 Visual automation |
| `spec/automation` — ETL Pipelines | `ETLPipeline`, `ETLSource`, `ETLDestination` | ❌ Not implemented | 🟢 Admin feature |
| `spec/automation` — State Machine Config | `StateMachineConfig`, `StateNodeConfig`, `Transition` | ⚠️ Runtime state only | 🟡 Config viewing |
| `spec/automation` — Connector System | 🆕 `ConnectorSchema`, `ConnectorInstance`, `ConnectorOperation` | ❌ Not implemented | 🟢 Admin feature |
| `spec/system` — Collaboration/CRDT | `CollaborationSession`, `CRDTState`, `OTOperation` (expanded) | ❌ Not implemented | 🟡 Real-time co-editing |
| `spec/system` — Awareness/Presence | 🆕 `AwarenessSession`, `AwarenessEvent`, `AwarenessUserState` | ❌ Not implemented | 🟡 Collaboration |
| `spec/system` — Audit Log | `AuditEvent`, `AuditConfig` (expanded with severity, retention) | ❌ Not implemented | 🟢 Admin feature |
| `spec/system` — Object Storage | 🆕 `ObjectStorageConfig`, `StorageProvider`, `PresignedUrl` | ⚠️ 使用 client.storage | 🟢 Can align |
| `spec/integration` — Connectors | 85 types (DB, File, GitHub, MQ, SaaS, Vercel) | ❌ 不适用 (服务端) | — |
| `spec/kernel` — Plugin System | `PluginSchema`, `PluginCapability`, `FeatureFlag`, `SBOM` | ❌ 不适用 (服务端) | — |
| `spec/studio` — Studio Plugins | `StudioPluginManifest`, `StudioPluginContributions` | ❌ 不适用 (桌面端) | — |

### Priority Legend

- 🔴 **High** — Needed for core user workflows
- 🟡 **Medium** — Enhances spec compliance or user experience
- 🟢 **Low** — Admin/platform features, can defer to post-GA

---

## Phase 7: Final Validation & Production Polish

> **Goal**: Validate all implemented features end-to-end and ensure production-grade quality.
>
> **Duration**: 1–2 weeks
>
> **Prerequisites**: Running ObjectStack backend, physical iOS/Android devices

### 7.1 E2E Test Execution (Priority: 🔴 High)

> Maestro flows are configured but have not been executed against a live environment.

- [ ] Set up test environment with ObjectStack backend
- [ ] Create test user and seed sample data
- [ ] Execute all 4 Maestro flows:
  - `maestro test .maestro/auth-flow.yaml`
  - `maestro test .maestro/app-navigation.yaml`
  - `maestro test .maestro/record-list.yaml`
  - `maestro test .maestro/record-crud.yaml`
- [ ] Fix any integration issues discovered
- [ ] Document E2E test results

**Estimated Time**: 1–2 days

### 7.2 Real-Device Performance Profiling (Priority: 🟡 Medium)

> Performance optimizations (FlashList, image caching, code splitting) are in place, but have not been validated on physical devices.

- [ ] Build production preview:
  ```bash
  eas build --platform ios --profile preview
  eas build --platform android --profile preview
  ```
- [ ] Run `lib/performance-benchmark.ts` on real devices
- [ ] Profile with Xcode Instruments (iOS) and Android Profiler
- [ ] Measure key metrics:
  - List scrolling: target 60 fps
  - Form rendering: target < 100ms
  - API requests: target < 500ms average
  - Memory usage: target < 200 MB typical
- [ ] Optimize any identified bottlenecks
- [ ] Validate offline/sync performance under poor network conditions

**Estimated Time**: 2–3 days

### 7.3 Integration Smoke Testing (Priority: 🟡 Medium)

> Hooks for newer SDK features (AI, i18n, realtime, workflow) need validation against a real backend.

- [ ] Test AI hooks (`useAI`) against live `client.ai.*` endpoints
- [ ] Test server translations (`useServerTranslations`) against `client.i18n.*`
- [ ] Test real-time subscriptions (`useSubscription`) via WebSocket
- [ ] Test workflow state transitions (`useWorkflowState`)
- [ ] Test push notification registration and delivery (`useNotifications`)
- [ ] Test permissions enforcement (`usePermissions`) with different user roles

**Estimated Time**: 2–3 days

---

## Phase 8: App Store Launch

> **Goal**: Prepare all assets and metadata, then submit to App Store and Play Store.
>
> **Duration**: 1–2 weeks
>
> **Prerequisites**: Phase 7 complete with no critical issues

### 8.1 App Store Assets (Priority: 🔴 High)

- [ ] Finalize app icon (1024×1024) and splash screen
- [ ] Create screenshots for all required sizes:
  - iPhone 6.7" (1290×2796)
  - iPhone 6.5" (1242×2688)
  - iPad Pro 12.9" (2048×2732)
  - Android phone (1080×1920)
  - Android tablet (1200×1920)
- [ ] Create app preview video (15–30 seconds)
- [ ] Write app title, subtitle, and keywords
- [ ] Write app description (short + full)
- [ ] Prepare "What's New" text for first release

### 8.2 Legal & Compliance (Priority: 🔴 High)

- [ ] Privacy policy URL published and linked in app config
- [ ] Terms of service URL published and linked
- [ ] Complete App Store content rating questionnaire
- [ ] Complete Google Play content rating questionnaire
- [ ] GDPR / data processing disclosure (if applicable)
- [ ] Data safety section for Google Play

### 8.3 Build & Submit (Priority: 🔴 High)

- [ ] Run final validation: `lib/app-store-review.ts` (target score ≥ 90/100)
- [ ] Run security audit: `lib/security-audit.ts` (all checks passing)
- [ ] Production builds:
  ```bash
  eas build --platform ios --profile production
  eas build --platform android --profile production
  ```
- [ ] Submit to TestFlight for internal testing (minimum 1 week)
- [ ] Submit to Google Play internal testing track
- [ ] Address any reviewer feedback
- [ ] Submit for public App Store / Play Store review

### 8.4 Launch Operations (Priority: 🟡 Medium)

- [ ] Configure Sentry release tracking for v1.0
- [ ] Set up feature flags for gradual rollout
- [ ] Prepare rollback plan via EAS Update
- [ ] Monitor crash-free rate post-launch (target ≥ 99.5%)
- [ ] Set up user feedback channel

---

## Phase 9: Spec v2.0.4→v3.0.0 Alignment — Core Protocol Compliance ✅ COMPLETE

> **Goal**: Close the highest-priority gaps identified in the spec analysis to ensure protocol compliance.
>
> **Duration**: 2–3 weeks
>
> **Prerequisites**: Phases 7–8 in progress or complete
>
> **Status**: ✅ Complete — All items implemented and tested (540 tests passing)

### 9.1 Automation Hook & Approval Process UI (Priority: 🔴 High)

> The spec defines `automation` as a first-class module. The client exposes `client.automation.trigger()` but mobile only uses it inside `ActionExecutor`. Approval processes (`ApprovalProcess`, `ApprovalStep`) are defined in `spec/automation` and are critical for business workflow users on mobile.

**Deliverables:**
- [ ] Create `hooks/useAutomation.ts` — dedicated hook wrapping `client.automation.trigger()`
  - Expose `trigger(name, payload)`, `loading`, `error` state
  - Support optimistic UI feedback
- [ ] Create `components/workflow/ApprovalCard.tsx` — inline approval UI
  - Show pending approvals with approve/reject actions
  - Integrate with `client.workflow.approve()` and `client.workflow.reject()`
- [ ] Create `components/workflow/ApprovalList.tsx` — list of pending approvals
  - Filter by object, status, assigned approver
- [ ] Add approval count badge to tab bar / notification center
- [ ] Export `useAutomation` from `hooks/useObjectStack.ts` barrel
- [ ] Tests for `useAutomation` hook and approval components

**Estimated Time**: 3–4 days

### 9.2 Full Package Management (Priority: 🔴 High)

> The client SDK exposes `client.packages.install/uninstall/enable/disable` but mobile only uses `client.packages.list()` in `useAppDiscovery`. Users need to manage extensions from mobile.

**Deliverables:**
- [ ] Extend `hooks/useAppDiscovery.ts` or create `hooks/usePackageManagement.ts`
  - `install(manifest, options?)` — install a new package
  - `uninstall(id)` — uninstall a package
  - `enable(id)` / `disable(id)` — toggle package status
  - Loading/error states per operation
- [ ] Create `components/packages/PackageCard.tsx` — show package info with actions
- [ ] Create `components/packages/PackageList.tsx` — browsable package list with status filters
- [ ] Create screen route `app/(app)/packages.tsx` for package management
- [ ] Tests for package management hook

**Estimated Time**: 2–3 days

### 9.3 Analytics Explain & SQL (Priority: 🟡 Medium)

> The client exposes `client.analytics.explain(payload)` for SQL explain plans. This is useful for power users debugging analytics queries.

**Deliverables:**
- [ ] Extend `hooks/useAnalyticsQuery.ts` to expose `explain(payload)` method
- [ ] Show query explanation in analytics/chart detail views when in debug mode
- [ ] Tests for explain integration

**Estimated Time**: 0.5 day

---

## Phase 10: Spec v2.0.4→v3.0.0 Alignment — UI Protocol Compliance ✅ COMPLETE

> **Goal**: Implement spec-mandated UI patterns: SDUI page composition, report views, and theme token mapping.
>
> **Duration**: 2–3 weeks
>
> **Status**: ✅ Complete — All items implemented and tested

### 10.1 Report View Renderer (Priority: 🟡 Medium)

> `spec/ui` defines `ReportSchema` with types: `tabular`, `summary`, `matrix`, `chart`. The mobile app has chart rendering but no dedicated report view that aggregates columns, groupings, and chart configurations.

**Deliverables:**
- [ ] Create `components/renderers/ReportRenderer.tsx`
  - Accept `ReportSchema` config (type, columns, groupings, chart)
  - Render tabular reports with column definitions
  - Render summary reports with aggregation rows
  - Render matrix (pivot) reports
  - Integrate with existing `ChartRenderer` for chart reports
- [ ] Wire into `ViewFactory` for `type: 'report'`
- [ ] Tests and snapshot tests for report renderer

**Estimated Time**: 3–4 days

### 10.2 SDUI Page Composition (Priority: 🟡 Medium)

> Per `spec/ui`, pages should be **Server-Driven UI** composed from `PageSchema` → `PageRegion` → `PageComponent`. The mobile app currently uses file-based Expo Router pages. The spec mandates rendering dynamically from metadata.

**Deliverables:**
- [ ] Create `lib/page-renderer.ts` — parse and validate `PageSchema` from API
- [ ] Create `components/renderers/PageRenderer.tsx`
  - Render `PageRegion` (header, main, sidebar, footer) layouts
  - Map `PageComponent` types to existing renderers (list, form, chart, dashboard widget, etc.)
  - Support `PageVariable` bindings for dynamic data
- [ ] Create `app/(app)/page/[id].tsx` — dynamic SDUI route
  - Fetch `PageSchema` from `client.meta.getView()` or a new page API
  - Render using `PageRenderer`
- [ ] Tests for page renderer logic

**Estimated Time**: 4–5 days

### 10.3 Theme Token Mapping (Priority: 🟢 Low)

> `spec/ui` defines `ThemeSchema` with tokens: `ColorPalette`, `Typography`, `Spacing`, `Shadow`, `BorderRadius`, `Breakpoints`, `ZIndex`. The mobile app uses NativeWind/Tailwind for styling. A bridge layer can map spec tokens to Tailwind config.

**Deliverables:**
- [ ] Create `lib/theme-bridge.ts` — convert `ThemeSchema` tokens to Tailwind-compatible config
  - Map `ColorPalette` → Tailwind `colors`
  - Map `Typography` → Tailwind `fontFamily`/`fontSize`
  - Map `Spacing` → Tailwind `spacing`
- [ ] Optionally allow server-driven theme overrides at runtime
- [ ] Tests for theme token mapping

**Estimated Time**: 1–2 days

### 10.4 Widget System Foundation (Priority: 🟢 Low)

> `spec/ui` defines `WidgetManifest`, `WidgetLifecycle`, `WidgetEvent`, `WidgetProperty`, `WidgetSource` for an extensible widget framework.

**Deliverables:**
- [ ] Create `lib/widget-registry.ts` — register and resolve widgets by manifest
- [ ] Create `components/widgets/WidgetHost.tsx` — render a widget from manifest
- [ ] Support lifecycle events (mount, unmount, update)
- [ ] Tests for widget registry

**Estimated Time**: 2–3 days

---

## Phase 11: Spec v3.0.0 Alignment — AI & Intelligence

> **Goal**: Implement advanced AI protocol features: conversation persistence, RAG pipelines, MCP integration, agent orchestration, cost management, and accessibility.
>
> **Duration**: 3–4 weeks
>
> **Note**: v3.0.0 significantly expanded the AI module from ~100 to 187 exports, adding full MCP 2.0, multi-agent groups, DevOps agents, code generation, cost tracking, and predictive analytics.

### 11.1 Conversation Session Persistence (Priority: 🟡 Medium)

> `spec/ai` defines `ConversationSession` with session management, message pruning, token budget tracking, and conversation analytics. Current `useAI` hook has basic chat but no session persistence or token management. v3.0.0 adds `ConversationAnalytics` and `ConversationSummary`.

**Deliverables:**
- [ ] Extend `hooks/useAI.ts` to support:
  - `createSession(context)` — create a named conversation session
  - `resumeSession(sessionId)` — resume an existing session
  - `sessionMessages` — persistent message history
  - Token usage tracking (`TokenUsageStats`)
  - Token budget enforcement (`TokenBudgetConfig`)
- [ ] Store conversation sessions in offline storage (SQLite)
- [ ] Add session list UI for switching between conversations
- [ ] Tests for session management

**Estimated Time**: 3–4 days

### 11.2 RAG Pipeline Integration (Priority: 🟡 Medium)

> `spec/ai` defines `RAGPipelineConfig`, `RAGQueryRequest`, `RAGQueryResponse`, `ChunkingStrategy`, `RerankingConfig`, `VectorStoreConfig` for retrieval-augmented generation. v3.0.0 adds document management (`DocumentChunk`, `DocumentMetadata`) and embedding model configuration.

**Deliverables:**
- [ ] Create `hooks/useRAG.ts`
  - `query(request: RAGQueryRequest)` → `RAGQueryResponse`
  - Display source documents/citations in chat responses
  - Show retrieval confidence scores
- [ ] Integrate RAG results into `useAI` chat flow
- [ ] Export from `hooks/useObjectStack.ts`
- [ ] Tests for RAG hook

**Estimated Time**: 2–3 days

### 11.3 MCP (Model Context Protocol) Awareness (Priority: 🟡 Medium)

> `spec/ai` defines full MCP 2.0 schemas: `MCPServerConfig`, `MCPTool`, `MCPResource`, `MCPPrompt`, `MCPResourceTemplate`, `MCPSamplingConfig`, `MCPRootsConfig`, `MCPStreamingConfig`, `MCPToolApproval`. v3.0.0 significantly expanded MCP support with transport, streaming, roots, and tool approval patterns. Mobile should be aware of MCP-connected tools and allow triggering them.

**Deliverables:**
- [ ] Create `hooks/useMCPTools.ts` — discover and display MCP-connected tools
  - List available tools from server MCP configuration
  - Allow triggering MCP tools from mobile (via server proxy)
- [ ] Show MCP tool availability in AI chat interface
- [ ] Tests for MCP tools hook

**Estimated Time**: 2 days

### 11.4 Agent Orchestration UI (Priority: 🟡 Medium)

> `spec/ai` defines `AgentSchema`, `AgentAction`, `AgentActionSequence`, `MultiAgentGroup`, `AgentCommunicationProtocol`, `AgentGroupRole` for multi-agent workflows. v3.0.0 adds multi-agent groups and typed agent actions (`DataAgentAction`, `FormAgentAction`, `ViewAgentAction`, `NavigationAgentAction`, `WorkflowAgentAction`).

**Deliverables:**
- [ ] Create `hooks/useAgent.ts` — interact with server-side agents
  - Start agent task, monitor progress, view results
  - Support agent action sequences with step-by-step UI
- [ ] Create `components/ai/AgentProgress.tsx` — visualize agent execution
- [ ] Tests for agent hook

**Estimated Time**: 3–4 days

### 11.5 AI Cost Management UI (Priority: 🟢 Low)

> 🆕 `spec/ai` v3.0.0 defines `CostAnalytics`, `BudgetLimit`, `CostAlert`, `CostReport`, `CostBreakdownEntry`, `CostOptimizationRecommendation` for tracking and managing AI costs.

**Deliverables:**
- [ ] Create `hooks/useAICost.ts` — fetch AI usage costs and budgets
  - Display cost breakdown by model/provider
  - Show budget limits and alerts
  - Track token usage trends
- [ ] Create cost summary widget for admin dashboards
- [ ] Tests for AI cost hook

**Estimated Time**: 2 days

### 11.6 Accessibility (a11y) Alignment (Priority: 🟡 Medium)

> 🆕 `spec/ui` v3.0.0 defines `AriaProps`, `FocusManagement`, `FocusTrapConfig`, `KeyboardNavigation`, `KeyboardShortcut`, `WcagContrastLevel` for comprehensive accessibility support.

**Deliverables:**
- [ ] Audit all renderers for ARIA props compliance
- [ ] Implement focus management for form views (`FocusTrapConfig`)
- [ ] Add keyboard navigation support for list and kanban views
- [ ] Ensure WCAG contrast compliance in theme bridge
- [ ] Tests for accessibility features

**Estimated Time**: 3–4 days

---

## Phase 12: Spec v3.0.0 Alignment — Security Module

> 🆕 **Goal**: Implement the new `security` module introduced in v3.0.0: RLS, Policy, Sharing Rules, and Territory management.
>
> **Duration**: 2–3 weeks
>
> **Note**: The `security` module (26 exports) replaces the removed `auth`, `permission`, and `hub` modules, consolidating security concerns into a dedicated namespace.

### 12.1 Row-Level Security (RLS) Awareness (Priority: 🟡 Medium)

> `spec/security` defines `RLSConfig`, `RowLevelSecurityPolicy`, `RLSEvaluationResult`, `RLSAuditConfig`, `RLSAuditEvent`, `RLSUserContext`. Mobile needs to understand RLS policies to properly filter data and explain access restrictions to users.

**Deliverables:**
- [ ] Create `hooks/useRLS.ts` — fetch and display RLS policies for objects
  - Show which records the user can access and why
  - Display RLS evaluation results
- [ ] Integrate RLS awareness into list/query views
- [ ] Show access restrictions in record detail views
- [ ] Tests for RLS hook

**Estimated Time**: 3–4 days

### 12.2 Security Policies Display (Priority: 🟡 Medium)

> `spec/security` defines `PolicySchema`, `PasswordPolicy`, `SessionPolicy`, `NetworkPolicy`, `AuditPolicy` for comprehensive security policy management.

**Deliverables:**
- [ ] Create `hooks/useSecurityPolicies.ts` — fetch active security policies
- [ ] Display password policy requirements during password changes
- [ ] Show session policy info (timeout, concurrent session limits)
- [ ] Tests for security policy hook

**Estimated Time**: 2 days

### 12.3 Sharing Rules (Priority: 🟡 Medium)

> `spec/security` defines `SharingRuleSchema`, `OwnerSharingRule`, `CriteriaSharingRule`, `SharingLevel`, `ShareRecipientType` for record-level sharing control.

**Deliverables:**
- [ ] Create `hooks/useSharing.ts` — manage sharing rules for records
  - List sharing rules for an object
  - Display sharing info on record details
  - Allow share/unshare actions from mobile
- [ ] Create `components/security/SharePanel.tsx` — UI for sharing records
- [ ] Tests for sharing hook

**Estimated Time**: 3 days

### 12.4 Territory Management (Priority: 🟢 Low)

> `spec/security` defines `TerritorySchema`, `TerritoryModel`, `TerritoryType` for geographic and organizational territory-based access control.

**Deliverables:**
- [ ] Create `hooks/useTerritory.ts` — fetch and display territory assignments
- [ ] Show territory info on relevant record types
- [ ] Tests for territory hook

**Estimated Time**: 1–2 days

---

## Phase 13: Spec v3.0.0 Alignment — Advanced Platform Features

> **Goal**: Implement remaining spec modules that enhance the platform experience.
>
> **Duration**: 3–4 weeks (can be parallelized with other phases)
>
> **Note**: These features were previously Phase 12 in the v2.0.4 roadmap.

### 13.1 Collaboration & CRDT (Priority: 🟡 Medium)

> `spec/system` defines `CollaborationSession`, `CollaborativeCursor`, `CRDTState`, `OTOperation`, `AwarenessSession`, `AwarenessEvent`, `AwarenessUserState` for real-time co-editing. v3.0.0 adds comprehensive OT (Operational Transform) support with `OTComponent`, `OTOperationType`, `OTTransformResult` and awareness with `AwarenessUpdateSchema`, `CursorColorPreset`.

**Deliverables:**
- [ ] Create `hooks/useCollaboration.ts`
  - Join/leave collaboration sessions
  - Track cursor positions of other users
  - Display presence indicators on form fields
- [ ] Create `components/realtime/CollaborationOverlay.tsx` — show other users' cursors
- [ ] Integrate with existing `useSubscription` for transport
- [ ] Tests for collaboration hook

**Estimated Time**: 4–5 days

### 13.2 Audit Log Viewer (Priority: 🟢 Low)

> `spec/system` defines `AuditEvent`, `AuditConfig`, `AuditEventFilter`, `AuditEventSeverity`, `AuditRetentionPolicy`, `AuditStorageConfig` for compliance audit trails. v3.0.0 expands with severity levels, retention policies, and storage configuration.

**Deliverables:**
- [ ] Create `hooks/useAuditLog.ts` — fetch and filter audit events
- [ ] Create `components/audit/AuditTimeline.tsx` — timeline view of record changes
- [ ] Show on record detail views as a "History" tab
- [ ] Tests for audit log hook

**Estimated Time**: 2–3 days

### 13.3 Flow Visualization (Priority: 🟢 Low)

> `spec/automation` defines `FlowSchema`, `FlowNode`, `FlowEdge` for visual workflow builders. Mobile should at minimum allow viewing flow definitions.

**Deliverables:**
- [ ] Create `components/automation/FlowViewer.tsx` — read-only flow diagram
  - Render nodes and edges as a visual graph
  - Show node types (action, decision, loop) with icons
- [ ] Integrate with automation trigger status display
- [ ] Tests for flow viewer

**Estimated Time**: 3–4 days

### 13.4 State Machine Visualization (Priority: 🟢 Low)

> `spec/automation` defines `StateMachineConfig`, `StateNodeConfig`, `Transition`. Currently `useWorkflowState` shows runtime state but not the full state machine configuration.

**Deliverables:**
- [ ] Extend `useWorkflowState` or create `useStateMachine` hook
  - Fetch full state machine config via `client.workflow.getConfig()`
  - Display available states and transitions as a diagram
- [ ] Create `components/workflow/StateMachineViewer.tsx`
- [ ] Tests for state machine visualization

**Estimated Time**: 2 days

---

## Future Roadmap (Post v1.0)

### v1.1 — UX Refinements

- [ ] User-facing onboarding flow / feature tour
- [ ] Haptic feedback for key interactions
- [ ] Enhanced accessibility (VoiceOver / TalkBack audit)
- [ ] Widget support (iOS WidgetKit / Android App Widgets)

### v1.2 — Enhanced Notification Center & Activity Feed

- [ ] Notification categories, grouping, and smart filtering
- [ ] Inline notification actions (approve, reply, dismiss)
- [ ] Do Not Disturb scheduling
- [ ] Record-level activity feed (field changes, workflow, comments)
- [ ] Record comments with threaded replies and @mentions
- [ ] Emoji reactions on comments
- [ ] Global team activity feed on home screen

> See [MESSAGING-NOTIFICATION-CENTER-DESIGN.md](./MESSAGING-NOTIFICATION-CENTER-DESIGN.md) for full specification.

### v1.3 — Messaging & Channels

- [ ] Object-bound and custom channels (Slack/Teams pattern)
- [ ] Direct messages and group DMs
- [ ] Threaded replies on channel messages
- [ ] Typing indicators and read receipts
- [ ] File sharing and Markdown support in messages
- [ ] Message search integrated with GlobalSearch
- [ ] AI-powered message summarization

> See [MESSAGING-NOTIFICATION-CENTER-DESIGN.md](./MESSAGING-NOTIFICATION-CENTER-DESIGN.md) for full specification.

### v1.4 — Offline-First Enhancements

- [ ] Selective offline sync (choose which objects/views to cache)
- [ ] Conflict resolution improvements (three-way merge UI)
- [ ] Offline analytics (queue queries, sync results)
- [ ] Background data prefetching based on usage patterns

### v1.5 — Platform Integration

- [ ] iOS Shortcuts / Siri integration
- [ ] Android Quick Settings tiles
- [ ] Universal Links / App Links deep linking
- [ ] Share extension (share content into ObjectStack)
- [ ] Apple Watch companion (notifications + quick actions)

---

## Decision Matrix

| Task | Can Do Now? | Blocks v1.0? | Estimated Time | Priority |
|------|-------------|-------------|----------------|----------|
| E2E Testing (7.1) | ✅ Yes (needs backend) | ✅ Yes | 1–2 days | 🔴 High |
| Performance Profiling (7.2) | ✅ Yes (needs devices) | ⚠️ Recommended | 2–3 days | 🟡 Medium |
| Integration Smoke Test (7.3) | ✅ Yes (needs backend) | ⚠️ Recommended | 2–3 days | 🟡 Medium |
| App Store Assets (8.1) | ✅ Yes | ✅ Yes | 3–5 days | 🔴 High |
| Legal & Compliance (8.2) | ✅ Yes | ✅ Yes | 1–2 days | 🔴 High |
| Build & Submit (8.3) | ✅ Yes | ✅ Yes | 1–2 weeks | 🔴 High |
| AI Conversation Sessions (11.1) | ✅ Yes | No | 3–4 days | 🟡 Medium |
| RAG Integration (11.2) | ⚠️ Needs server RAG | No | 2–3 days | 🟡 Medium |
| MCP Awareness (11.3) | ⚠️ Needs server MCP | No | 2 days | 🟡 Medium |
| Agent Orchestration (11.4) | ⚠️ Needs server agents | No | 3–4 days | 🟡 Medium |
| AI Cost Management (11.5) | ✅ Yes | No | 2 days | 🟢 Low |
| Accessibility (11.6) | ✅ Yes | No | 3–4 days | 🟡 Medium |
| RLS Awareness (12.1) | ⚠️ Needs server RLS | No | 3–4 days | 🟡 Medium |
| Security Policies (12.2) | ✅ Yes | No | 2 days | 🟡 Medium |
| Sharing Rules (12.3) | ⚠️ Needs server sharing | No | 3 days | 🟡 Medium |
| Territory Management (12.4) | ⚠️ Needs server territory | No | 1–2 days | 🟢 Low |
| Collaboration/CRDT (13.1) | ⚠️ Needs server CRDT | No | 4–5 days | 🟡 Medium |
| Audit Log (13.2) | ✅ Yes | No | 2–3 days | 🟢 Low |
| Flow Visualization (13.3) | ✅ Yes | No | 3–4 days | 🟢 Low |
| State Machine Viz (13.4) | ✅ Yes | No | 2 days | 🟢 Low |

**Total estimated effort for Phase 11–13**: ~8–10 weeks (can overlap with Phases 7–8)

---

## Success Criteria for v1.0 GA

1. ✅ All 540+ unit/integration tests passing
2. ✅ All hooks and lib modules have test coverage
3. ☐ All 4 Maestro E2E flows passing on iOS and Android
4. ☐ Performance metrics within targets on real devices
5. ☐ Security audit passing with no critical issues
6. ☐ App Store readiness score ≥ 90/100
7. ☐ TestFlight / internal testing completed (minimum 1 week)
8. ☐ App Store / Play Store review approved

## Success Criteria for v1.1 (Spec v3.0.0 Full Compliance)

1. ☑ Phase 9 complete — Automation hook, package management, analytics explain
2. ☑ Phase 10 complete — Report views, SDUI pages, theme tokens, widget system
3. ☐ Phase 11 complete — AI sessions, RAG, MCP, agents, cost management, accessibility
4. ☐ Phase 12 complete — Security: RLS, policies, sharing, territory
5. ☐ Phase 13 complete — Collaboration, audit, flow viz, state machine
6. ☐ All new hooks exported from `hooks/useObjectStack.ts` barrel
7. ☐ All new hooks have unit tests
8. ☐ SDK-GAP-ANALYSIS.md updated to reflect v3.0.0 compliance

---

## For SDK Team — Feedback

The following hooks were built on the mobile side using `useClient()`. Consider upstreaming to `@objectstack/client-react` for consistency across platforms:

| Mobile Hook | SDK API | Notes |
|-------------|---------|-------|
| `usePermissions()` | `client.permissions.*` | RBAC enforcement in UI |
| `useWorkflowState()` | `client.workflow.*` | State machine + transition UI |
| `useSubscription()` | `client.realtime.*` | WebSocket subscription management |
| `useNotifications()` | `client.notifications.*` | Push notification lifecycle |
| `useAI()` | `client.ai.*` | NLQ, chat, suggest, insights |
| `useServerTranslations()` | `client.i18n.*` | Server-side translation loading |
| `useSavedViews()` | `client.views.*` | View CRUD with optimistic updates |
| `useAutomation()` | `client.automation.*` | 🆕 Trigger automation flows |
| `usePackageManagement()` | `client.packages.*` | 🆕 Package lifecycle (install/enable/disable) |
| `useRAG()` | `client.ai.rag?` | 🆕 Needs server-side RAG endpoint |
| `useCollaboration()` | `client.realtime.*` | 🆕 CRDT co-editing sessions |
| `useRLS()` | `client.security?` | 🆕 Row-Level Security awareness (v3.0.0) |
| `useSharing()` | `client.security?` | 🆕 Sharing rules management (v3.0.0) |
| `useAICost()` | `client.ai.cost?` | 🆕 AI cost tracking (v3.0.0) |

### Requested New Client-React Hooks

The following hooks would benefit all ObjectStack frontend implementations if upstreamed to `@objectstack/client-react`:

1. **`useAutomation()`** — Trigger and monitor automation flows
2. **`usePackages()`** — Package lifecycle management
3. **`useApprovals()`** — Pending approval list and actions
4. **`useConversation()`** — AI conversation session with persistence
5. **`useRAG()`** — RAG pipeline query with source citations
6. **`useCollaboration()`** — Real-time co-editing with cursor tracking
7. **`useAuditLog()`** — Audit event timeline for records
8. **`useReport()`** — Report query and rendering
9. **`useRLS()`** — Row-Level Security policy awareness (v3.0.0)
10. **`useSharing()`** — Record sharing management (v3.0.0)
11. **`useAICost()`** — AI cost and budget tracking (v3.0.0)
12. **`useMCPTools()`** — MCP tool discovery and invocation (v3.0.0)

---

*Last updated: 2026-02-12. See [ROADMAP.md](./ROADMAP.md) for full development history and [PROJECT-STATUS.md](./PROJECT-STATUS.md) for detailed status report.*
