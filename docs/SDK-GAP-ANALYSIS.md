# @objectstack/client SDK — Gap Analysis Report

> **Version analyzed**: `@objectstack/client@2.0.4`, `@objectstack/client-react@2.0.4`, `@objectstack/spec@2.0.4`
>
> **Date**: 2026-02-10 (Updated after spec v2.0.4 protocol audit)
>
> **Purpose**: 列出 Mobile 客户端完成全部开发所需但 SDK 目前尚未提供（或未完善）的 API 与功能，供上游项目排期开发。

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [v2.0.4 Spec Audit — New Findings](#v204-spec-audit--new-findings)
3. [Current SDK Coverage](#current-sdk-coverage)
4. [Gap 1 — Views API (client.views)](#gap-1--views-api-clientviews)
5. [Gap 2 — Permission System API](#gap-2--permission-system-api)
6. [Gap 3 — Workflow & State Machine API](#gap-3--workflow--state-machine-api)
7. [Gap 4 — Real-Time / WebSocket API](#gap-4--real-time--websocket-api)
8. [Gap 5 — Push Notification Registration API](#gap-5--push-notification-registration-api)
9. [Gap 6 — AI / NLQ API](#gap-6--ai--nlq-api)
10. [Gap 7 — Batch Operations Optimization](#gap-7--batch-operations-optimization)
11. [Gap 8 — File & Storage React Hooks](#gap-8--file--storage-react-hooks)
12. [Gap 9 — i18n / Localization API](#gap-9--i18n--localization-api)
13. [Gap 10 — Analytics React Hooks](#gap-10--analytics-react-hooks)
14. [Gap 11 — client-react Hook Gaps](#gap-11--client-react-hook-gaps)
15. [Priority Summary](#priority-summary)
16. [Appendix: SDK API Surface Inventory](#appendix-sdk-api-surface-inventory)

---

## Executive Summary

ObjectStack Mobile 客户端目前已完成 Phase 0–6.2（基础框架、SDK 集成、渲染引擎、数据层、高级功能、生产监控）。**v2.0.4 已升级，所有 v2.0.1 Gap 已解决，Phase 4B 和 5B 已完成开发。**

### v2.0.4 协议审计摘要 (2026-02-10)

在对 `@objectstack/spec@2.0.4` 的 **15 个模块**（root, driver, data, system, auth, kernel, hub, ai, automation, api, ui, contracts, integration, studio, permission）进行完整审计后，发现以下新的协议合规差距：

**新发现的合规差距** (spec v2.0.4):

| Category | Spec Module | Client API | Mobile Status | Priority |
|----------|-------------|-----------|---------------|----------|
| **Automation Trigger Hook** | `spec/automation` | `client.automation.trigger()` | ⚠️ 仅在 ActionExecutor 中使用，无专用 hook | 🔴 High |
| **Package Management UI** | `spec/api` → packages | `client.packages.*` (6个方法) | ⚠️ 仅 `useAppDiscovery` 使用 `list()` | 🔴 High |
| **Analytics SQL Explain** | `spec/api` → analytics | `client.analytics.explain()` | ❌ 未使用 | 🟡 Medium |
| **Report View** | `spec/ui` → `ReportSchema` | — | ❌ 无报表视图渲染器 | 🟡 Medium |
| **SDUI Page Composition** | `spec/ui` → `PageSchema` | — | ❌ 无服务端驱动页面 | 🟡 Medium |
| **Widget System** | `spec/ui` → `WidgetManifest` | — | ❌ 无 Widget 注册系统 | 🟢 Low |
| **Theme Tokens** | `spec/ui` → `ThemeSchema` | — | ⚠️ NativeWind 未映射 spec 令牌 | 🟢 Low |
| **AI Conversation Session** | `spec/ai` → `ConversationSession` | — | ⚠️ useAI 无会话持久化 | 🟡 Medium |
| **RAG Pipeline** | `spec/ai` → `RAGPipelineConfig` | — | ❌ 未实现 | 🟡 Medium |
| **MCP Integration** | `spec/ai` → `MCPServerConfig` | — | ❌ 未实现 | 🟢 Low |
| **Agent Orchestration** | `spec/ai` → `AgentSchema` | — | ❌ 未实现 | 🟢 Low |
| **Approval Process UI** | `spec/automation` → `ApprovalProcess` | `client.workflow.approve/reject` | ⚠️ 无审批列表 UI | 🔴 High |
| **Collaboration/CRDT** | `spec/system` → `CollaborationSession` | — | ❌ 未实现 | 🟡 Medium |
| **Audit Log** | `spec/system` → `AuditEvent` | — | ❌ 未实现 | 🟢 Low |
| **Flow Visualization** | `spec/automation` → `FlowSchema` | — | ❌ 未实现 | 🟢 Low |

> **详细改进方案**: 见 [NEXT-PHASE.md](./NEXT-PHASE.md) Phase 9–12

### v2.0.1 更新摘要 (2026-02-09)

✅ **所有核心 Gap 已解决**: SDK v2.0.1 完整实现了全部 13 个 API 命名空间，并导出了 TypeScript 类型定义。

**新增已解决 API**:
- `client.views.*` — 完整类型化的 Views API (create/get/list/update/delete)
- `client.permissions.*` — 权限检查 API (check/getObjectPermissions/getEffectivePermissions)
- `client.workflow.*` — 工作流 API (getConfig/getState/transition/approve/reject)
- `client.realtime.*` — 实时 WebSocket API (connect/disconnect/subscribe/unsubscribe/setPresence/getPresence)
- `client.notifications.*` — 推送通知 API (registerDevice/unregisterDevice/getPreferences/updatePreferences/list/markRead/markAllRead)
- `client.ai.*` — AI/NLQ API (nlq/chat/suggest/insights)
- `client.i18n.*` — 国际化 API (getLocales/getTranslations/getFieldLabels)

### 改进项总览

| Category | Status | Impact |
|----------|--------|--------|
| **Views API** | ✅ **已解决 (v2.0.1)** | Phase 4B.1 完全解除阻塞 |
| **Permission API** | ✅ **已解决 (v2.0.1)** | Phase 4B.2 解除阻塞 |
| **Workflow/State Machine API** | ✅ **已解决 (v2.0.1)** | Phase 4B.3 解除阻塞 |
| **Real-Time WebSocket API** | ✅ **已解决 (v2.0.1)** | Phase 4B.4 解除阻塞 |
| **Push Notification API** | ✅ **已解决 (v2.0.1)** | Phase 4B.5 解除阻塞 |
| **AI/NLQ API** | ✅ **已解决 (v2.0.1)** | Phase 5B.1 解除阻塞 |
| **Batch 优化** | ✅ **已改进 (v2.0.0)** | 性能可继续优化 |
| **Storage React Hooks** | ⚠️ client-react 缺失 | 已自建 `useFileUpload` hook |
| **i18n API** | ✅ **已解决 (v2.0.1)** | Phase 5B.2 解除阻塞 |
| **Analytics React Hooks** | ⚠️ client-react 缺失 | 已自建 `useAnalyticsQuery/Meta` hooks |
| **Automation Hook** | 🆕 **需要新 hook (v2.0.4)** | Phase 9.1 |
| **Package Management** | 🆕 **需要扩展 (v2.0.4)** | Phase 9.2 |
| **Report View** | 🆕 **需要新渲染器 (v2.0.4)** | Phase 10.1 |
| **SDUI Page Renderer** | 🆕 **需要新能力 (v2.0.4)** | Phase 10.2 |
| **AI Sessions/RAG/MCP** | 🆕 **需要新 hooks (v2.0.4)** | Phase 11 |
| **Collaboration** | 🆕 **需要新能力 (v2.0.4)** | Phase 12.1 |

---

## v2.0.4 Spec Audit — New Findings

### 审计方法

对 `@objectstack/spec@2.0.4` 的全部 15 个导出模块进行了完整协议扫描，比对 `@objectstack/client@2.0.4` 的 API surface 和 Mobile App 的现有实现。

### Spec 模块覆盖率

| Spec Module | Schemas | Client Exposed | Mobile Implemented | Coverage |
|-------------|---------|---------------|-------------------|----------|
| `spec/api` | ~200+ types | ✅ 完整 | ✅ 95%+ | 🟢 |
| `spec/data` | ~60 types (Field, Query, Filter, Driver) | ✅ 通过 client.data | ✅ 完整 | 🟢 |
| `spec/ui` | ~60 types (View, Form, Dashboard, Report, Page, Widget, Theme) | ⚠️ 部分 (通过 meta) | ⚠️ 80% (缺 Report, Page, Widget) | 🟡 |
| `spec/system` | ~200+ types (Cache, Storage, Logging, Audit, Collaboration, CRDT) | ⚠️ 部分 | ⚠️ 50% (缺 Collaboration, Audit) | 🟡 |
| `spec/ai` | ~100+ types (Agent, RAG, MCP, Conversation, Cost) | ⚠️ 仅 NLQ/Chat/Suggest/Insights | ⚠️ 30% (缺 RAG, MCP, Agent, Session) | 🔴 |
| `spec/automation` | ~50 types (Flow, ETL, Approval, StateMachine, Connector) | ⚠️ 仅 trigger() | ⚠️ 20% (仅 trigger in ActionExecutor) | 🔴 |
| `spec/kernel` | ~150+ types (Plugin, Event, FeatureFlag, Metadata) | ❌ 不适用 (服务端) | — | — |
| `spec/hub` | ~30 types (Tenant, Registry, Plans) | ⚠️ 部分 | ❌ 未实现 | 🔴 |
| `spec/contracts` | ~15 interfaces (IDataEngine, IHttpServer, IServiceRegistry) | ❌ 不适用 (服务端接口) | — | — |
| `spec/integration` | ~80 types (Connectors, FileStorage, MessageQueue, GitHub, Vercel) | ❌ 不适用 (服务端) | — | — |
| `spec/studio` | ~15 types (StudioPlugin, Contributions) | ❌ 不适用 (桌面端) | — | — |
| `spec/permission` | (通过 api 模块) | ✅ 通过 client.permissions | ✅ 完整 | 🟢 |

### 关键协议合规要求

根据 `@objectstack/spec/prompts/implement-objectui.md`，Mobile 端必须遵循以下规则:

1. **Rule #1: Server-Driven UI (SDUI)** — UI 必须根据 `PageSchema` 和 `ViewSchema` 动态渲染，不可硬编码页面布局
2. **Rule #2: Metadata-Aware Components** — 组件必须接受 `ViewSchema` 作为 props
3. **Rule #3: Action Abstraction** — 按钮执行 `ActionSchema` 定义，非任意代码
4. **Rule #4: Global Theming** — 样式基于 `ThemeSchema` 令牌

**当前合规状态:**
- Rule #1: ⚠️ 部分合规 (视图渲染器接受 metadata，但缺少 PageSchema 页面组合)
- Rule #2: ✅ 合规 (所有渲染器接受 metadata 配置)
- Rule #3: ✅ 合规 (`ActionExecutor` 执行 ActionSchema)
- Rule #4: ⚠️ 部分合规 (使用 NativeWind，但未映射 spec ThemeSchema 令牌)

---

## Current SDK Coverage

### `@objectstack/client@2.0.4` — 已有 API

以下 API 在 SDK 中有完整类型定义且 Mobile 端已成功集成：

```
client.connect()                        ✅ Discovery & capabilities
client.meta.getTypes()                  ✅ Metadata types
client.meta.getItems(type, options?)    ✅ Metadata items
client.meta.getObject(name)             ✅ Object schema (deprecated)
client.meta.getItem(type, name)         ✅ Metadata item by type & name
client.meta.saveItem(type, name, item)  ✅ Save metadata
client.meta.getCached(name, opts?)      ✅ ETag-based caching (v2.0.0 新增)
client.meta.getView(object, type?)      ✅ View metadata (list/form)
client.data.query(object, ast)          ✅ Full QueryAST query
client.data.find(object, options?)      ✅ Simplified query
client.data.get(object, id)             ✅ Get single record
client.data.create(object, data)        ✅ Create record
client.data.createMany(object, data[])  ✅ Batch create
client.data.update(object, id, data)    ✅ Update record
client.data.batch(object, request)      ✅ Batch update (typed, v2.0.0 增强)
client.data.updateMany(object, recs)    ✅ Simplified batch update
client.data.delete(object, id)          ✅ Delete record
client.data.deleteMany(object, ids)     ✅ Batch delete
client.views.create(request)            ✅ Create saved view (v2.0.0 新增)
client.views.get(id)                    ✅ Get saved view (v2.0.0 新增)
client.views.list(request?)             ✅ List saved views (v2.0.0 新增)
client.views.update(request)            ✅ Update saved view (v2.0.0 新增)
client.views.delete(id)                 ✅ Delete saved view (v2.0.0 新增)
client.views.share(id, userIds)         ✅ Share view (v2.0.0 新增)
client.views.setDefault(id, object)     ✅ Set default view (v2.0.0 新增)
client.packages.list(filters?)          ✅ List packages
client.packages.get(id)                 ✅ Get package
client.packages.install(manifest)       ✅ Install package
client.packages.uninstall(id)           ✅ Uninstall package
client.packages.enable(id)              ✅ Enable package
client.packages.disable(id)             ✅ Disable package
client.auth.login(request)              ✅ Login
client.auth.logout()                    ✅ Logout
client.auth.me()                        ✅ Current session
client.storage.upload(file, scope?)     ✅ File upload
client.storage.getDownloadUrl(fileId)   ✅ Download URL
client.automation.trigger(name, data)   ✅ Trigger automation
client.analytics.query(payload)         ✅ Analytics query
client.analytics.meta(cube)             ✅ Analytics metadata
client.analytics.explain(payload)       ✅ Analytics explain
client.hub.spaces.list()                ✅ List spaces
client.hub.spaces.create(payload)       ✅ Create space
client.hub.plugins.install(pkg, ver?)   ✅ Install hub plugin
client.permissions.check(params)        ✅ Check permission (v2.0.1 新增)
client.permissions.getObjectPermissions(obj) ✅ Object permissions (v2.0.1 新增)
client.permissions.getEffectivePermissions() ✅ Effective permissions (v2.0.1 新增)
client.workflow.getConfig(obj)          ✅ Workflow config (v2.0.1 新增)
client.workflow.getState(obj, recordId) ✅ Workflow state (v2.0.1 新增)
client.workflow.transition(params)      ✅ Workflow transition (v2.0.1 新增)
client.workflow.approve(params)         ✅ Workflow approve (v2.0.1 新增)
client.workflow.reject(params)          ✅ Workflow reject (v2.0.1 新增)
client.realtime.connect(options?)       ✅ Realtime connect (v2.0.1 新增)
client.realtime.disconnect()            ✅ Realtime disconnect (v2.0.1 新增)
client.realtime.subscribe(params)       ✅ Realtime subscribe (v2.0.1 新增)
client.realtime.unsubscribe(params)     ✅ Realtime unsubscribe (v2.0.1 新增)
client.realtime.setPresence(params)     ✅ Set presence (v2.0.1 新增)
client.realtime.getPresence(params)     ✅ Get presence (v2.0.1 新增)
client.notifications.registerDevice(p)  ✅ Register device (v2.0.1 新增)
client.notifications.unregisterDevice(id) ✅ Unregister device (v2.0.1 新增)
client.notifications.getPreferences()   ✅ Get preferences (v2.0.1 新增)
client.notifications.updatePreferences(p) ✅ Update preferences (v2.0.1 新增)
client.notifications.list(options?)     ✅ List notifications (v2.0.1 新增)
client.notifications.markRead(ids)      ✅ Mark read (v2.0.1 新增)
client.notifications.markAllRead()      ✅ Mark all read (v2.0.1 新增)
client.ai.nlq(params)                  ✅ Natural language query (v2.0.1 新增)
client.ai.chat(params)                 ✅ AI chat (v2.0.1 新增)
client.ai.suggest(params)              ✅ AI suggestions (v2.0.1 新增)
client.ai.insights(params)             ✅ AI insights (v2.0.1 新增)
client.i18n.getLocales()               ✅ Get locales (v2.0.1 新增)
client.i18n.getTranslations(locale, opts?) ✅ Get translations (v2.0.1 新增)
client.i18n.getFieldLabels(obj, locale) ✅ Get field labels (v2.0.1 新增)
```

### v2.0.0 新增工具

```
createQuery<T>(object)                  ✅ 类型安全查询构建器
createFilter<T>()                       ✅ 类型安全过滤器构建器
QueryBuilder<T>                         ✅ 链式查询构建器类
FilterBuilder<T>                        ✅ 链式过滤器构建器类
```

### `@objectstack/client-react@2.0.4` — 已有 Hooks

```
ObjectStackProvider                     ✅ Context provider
useClient()                             ✅ Get client instance
useQuery(object, options?)              ✅ Data query hook
useMutation(object, operation, opts?)   ✅ CRUD mutation hook
usePagination(object, options?)         ✅ Paginated query hook
useInfiniteQuery(object, options?)      ✅ Infinite scroll hook
useObject(objectName, options?)         ✅ Object schema hook
useView(objectName, viewType?, opts?)   ✅ View config hook
useFields(objectName, options?)         ✅ Field definitions hook
useMetadata(fetcher, options?)          ✅ Generic metadata hook
```

---

## Gap 1 — Views API (client.views)

### 状态：✅ **已解决 (v2.0.1)**

### 问题描述

Mobile 端的 `hooks/useViewStorage.ts` 需要通过 `client.views` 命名空间进行 Saved Views 的 CRUD 操作。在 v1.1.0 中，`ObjectStackClient` 类型定义中不包含 `views` 属性，当前通过 unsafe cast 绕过。

### v2.0.1 解决方案

SDK v2.0.1 已完全实现 `client.views` API，包括运行时功能和 TypeScript 类型定义导出。

```typescript
client.views: {
  /** Create a new saved view */
  create(request: {
    name: string;
    label: string;
    object: string;
    type: 'list' | 'form' | 'detail' | 'dashboard';
    visibility: 'public' | 'private' | 'shared';
    query?: QueryAST;
    layout?: Record<string, any>;
  }): Promise<SavedView>;

  /** Get a saved view by ID */
  get(id: string): Promise<SavedView>;

  /** List saved views with optional filters */
  list(request?: {
    object?: string;
    type?: string;
    visibility?: string;
  }): Promise<{ views: SavedView[]; total: number }>;

  /** Update an existing saved view */
  update(request: {
    id: string;
    name?: string;
    label?: string;
    visibility?: string;
    query?: QueryAST;
    layout?: Record<string, any>;
  }): Promise<SavedView>;

  /** Delete a saved view */
  delete(id: string): Promise<{ deleted: boolean }>;

  /** Share a view with users/teams */
  share(id: string, userIds: string[]): Promise<void>;

  /** Set a view as default for an object */
  setDefault(id: string, object: string): Promise<void>;
}
```

### Mobile 端行动项

- [x] SDK 已升级至 v2.0.1
- [x] TypeScript 类型定义已在 .d.ts 文件中导出
- [ ] 重构 `hooks/useViewStorage.ts` 对齐 SDK 正式类型
- [ ] 补全 SavedView 类型定义以匹配 v2.0.1 API

### 影响范围

- ✅ API 已实现（运行时可用）
- ✅ TypeScript 类型定义已导出
- ✅ Phase 4B.1 完全解除阻塞

### 优先级：✅ **已解决 (v2.0.1)**

---

## Gap 2 — Permission System API

### 状态：✅ **已解决 (v2.0.1)**

### 问题描述

Phase 4.1 需要在 UI 层实施权限控制：
- 根据用户权限隐藏/禁用按钮和表单字段
- 在列表中隐藏无权访问的记录操作
- 在表单中将无写入权限的字段设为只读

`@objectstack/spec` 中已定义相关类型（`Permission`, `PermissionSet`, `PermissionAction`, `PermissionScope`, `ResourceType`），但 `@objectstack/client` 未暴露任何权限 API。

### 期望 SDK 提供

#### Client API

```typescript
client.permissions: {
  /** Check if current user has a specific permission */
  check(params: {
    action: 'read' | 'create' | 'update' | 'delete';
    resource: string;        // object name
    resourceId?: string;     // specific record ID
    field?: string;          // specific field name
  }): Promise<{ allowed: boolean; reason?: string }>;

  /** Get all permissions for current user on an object */
  getObjectPermissions(objectName: string): Promise<{
    read: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
    fields: Record<string, {
      visible: boolean;
      editable: boolean;
    }>;
  }>;

  /** Get effective permission set for current user */
  getEffective(): Promise<{
    permissions: PermissionSet[];
  }>;
}
```

#### React Hook

```typescript
// @objectstack/client-react
function usePermissions(objectName: string, options?: {
  recordId?: string;
  enabled?: boolean;
}): {
  data: ObjectPermissions | null;
  isLoading: boolean;
  error: Error | null;
  can: (action: 'read' | 'create' | 'update' | 'delete', field?: string) => boolean;
  refetch: () => Promise<void>;
};
```

### 优先级：✅ **已解决 (v2.0.1)** — `client.permissions.check()`, `getObjectPermissions()`, `getEffectivePermissions()`

---

## Gap 3 — Workflow & State Machine API

### 状态：✅ **已解决 (v2.0.1)**

### 问题描述

Phase 4.2 需要在记录详情页显示工作流状态并提供状态转换操作。`@objectstack/spec` 已定义 State Machine 类型（`StateMachineConfig`, `StateNodeConfig`, `Transition`, `ApprovalProcess`, `ApprovalStep`），但 Client SDK 未暴露任何工作流 API。

### 期望 SDK 提供

#### Client API

```typescript
client.workflows: {
  /** Get workflow/state machine config for an object */
  getConfig(objectName: string): Promise<{
    stateMachine: StateMachineConfig;
  }>;

  /** Get current state and available transitions for a record */
  getState(objectName: string, recordId: string): Promise<{
    currentState: string;
    availableTransitions: Array<{
      name: string;
      label: string;
      targetState: string;
      guards?: string[];         // conditions that must be met
      requiresApproval?: boolean;
      requiresComment?: boolean;
    }>;
    history?: Array<{
      fromState: string;
      toState: string;
      triggeredBy: string;
      triggeredAt: string;
      comment?: string;
    }>;
  }>;

  /** Execute a state transition */
  transition(objectName: string, recordId: string, params: {
    transition: string;     // transition name
    comment?: string;
    data?: Record<string, unknown>;  // additional data for the transition
  }): Promise<{
    success: boolean;
    newState: string;
    record: Record<string, unknown>;
  }>;

  /** Approval-specific operations */
  approve(objectName: string, recordId: string, params: {
    comment?: string;
  }): Promise<{ success: boolean; newState: string }>;

  reject(objectName: string, recordId: string, params: {
    comment?: string;
    reason?: string;
  }): Promise<{ success: boolean; newState: string }>;
}
```

#### React Hooks

```typescript
function useWorkflowState(objectName: string, recordId: string, options?: {
  enabled?: boolean;
}): {
  currentState: string | null;
  availableTransitions: Transition[];
  history: TransitionHistory[];
  isLoading: boolean;
  error: Error | null;
  transition: (name: string, params?: TransitionParams) => Promise<void>;
  approve: (comment?: string) => Promise<void>;
  reject: (reason?: string) => Promise<void>;
};
```

### 优先级：✅ **已解决 (v2.0.1)** — `client.workflow.getConfig()`, `getState()`, `transition()`, `approve()`, `reject()`

---

## Gap 4 — Real-Time / WebSocket API

### 状态：✅ **已解决 (v2.0.1)**

### 问题描述

Phase 4.3 需要 WebSocket 实时连接以实现：
- 记录变更的实时推送（其他用户修改了当前查看的记录）
- 协作指示器（谁正在查看/编辑同一记录）
- 实时通知投递

`@objectstack/spec` 已定义完整的 WebSocket 和实时类型（`RealtimeConfig`, `RealtimeEvent`, `WebSocketConfig`, `WebSocketMessage`, `Presence`, `PresenceState`, `Subscription` 等），`@objectstack/spec/api` 也导出了 `SubscribeMessage`, `UnsubscribeMessage`, `PresenceMessage`, `EventMessage`, `CursorMessage` 等协议消息，但 Client SDK 中没有任何 WebSocket 连接或订阅 API。

### 期望 SDK 提供

#### Client API

```typescript
client.realtime: {
  /** Establish WebSocket connection */
  connect(options?: {
    reconnect?: boolean;
    reconnectInterval?: number;
  }): Promise<void>;

  /** Disconnect WebSocket */
  disconnect(): void;

  /** Connection state */
  readonly connected: boolean;

  /** Subscribe to record changes */
  subscribe(channel: string, options?: {
    object?: string;
    recordId?: string;
    filter?: FilterCondition;
    events?: ('create' | 'update' | 'delete')[];
  }): Subscription;

  /** Unsubscribe from a channel */
  unsubscribe(subscriptionId: string): void;

  /** Presence: announce current user is viewing/editing */
  setPresence(channel: string, state: {
    status: 'viewing' | 'editing' | 'idle';
    metadata?: Record<string, unknown>;
  }): void;

  /** Get presence info for a channel */
  getPresence(channel: string): Promise<PresenceState[]>;

  /** Listen for events */
  on(event: 'message' | 'presence' | 'error' | 'reconnect', handler: Function): void;
  off(event: string, handler: Function): void;
}

interface Subscription {
  id: string;
  unsubscribe(): void;
  on(event: 'change', handler: (event: RealtimeEvent) => void): void;
}
```

#### React Hooks

```typescript
/** Subscribe to real-time record changes */
function useSubscription(channel: string, options?: {
  object?: string;
  recordId?: string;
  events?: string[];
  onEvent?: (event: RealtimeEvent) => void;
  enabled?: boolean;
}): {
  lastEvent: RealtimeEvent | null;
  connected: boolean;
};

/** Track presence on a channel (who is viewing/editing) */
function usePresence(channel: string, options?: {
  status?: 'viewing' | 'editing';
  enabled?: boolean;
}): {
  users: PresenceState[];
  setStatus: (status: string) => void;
};
```

### 优先级：✅ **已解决 (v2.0.1)** — `client.realtime.connect()`, `subscribe()`, `unsubscribe()`, `setPresence()`, `getPresence()`

---

## Gap 5 — Push Notification Registration API

### 状态：✅ **已解决 (v2.0.1)**

### 问题描述

Phase 4.4 需要将设备的推送 token 注册到服务端，并管理通知偏好设置。`@objectstack/spec/system` 中存在 `NotificationChannel`, `NotificationConfig`, `InAppNotification`, `PushNotification` 等类型，但 Client SDK 无对应 API。

### 期望 SDK 提供

#### Client API

```typescript
client.notifications: {
  /** Register device push token */
  registerDevice(params: {
    token: string;
    platform: 'ios' | 'android' | 'web';
    deviceId?: string;
  }): Promise<{ registered: boolean }>;

  /** Unregister device */
  unregisterDevice(deviceId: string): Promise<void>;

  /** Get notification preferences */
  getPreferences(): Promise<{
    preferences: Array<{
      category: string;         // e.g., 'record_update', 'approval_request'
      objectName?: string;
      enabled: boolean;
      channels: ('push' | 'email' | 'in_app')[];
    }>;
  }>;

  /** Update notification preferences */
  updatePreferences(preferences: Array<{
    category: string;
    objectName?: string;
    enabled: boolean;
    channels: ('push' | 'email' | 'in_app')[];
  }>): Promise<void>;

  /** List in-app notifications */
  list(options?: {
    read?: boolean;
    category?: string;
    top?: number;
    skip?: number;
  }): Promise<{
    notifications: InAppNotification[];
    total: number;
    unreadCount: number;
  }>;

  /** Mark notification(s) as read */
  markRead(notificationIds: string[]): Promise<void>;

  /** Mark all as read */
  markAllRead(): Promise<void>;
}
```

#### React Hooks

```typescript
function useNotifications(options?: {
  category?: string;
  pageSize?: number;
}): {
  notifications: InAppNotification[];
  unreadCount: number;
  isLoading: boolean;
  markRead: (ids: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
  fetchMore: () => Promise<void>;
  hasMore: boolean;
};
```

### 优先级：✅ **已解决 (v2.0.1)** — `client.notifications.registerDevice()`, `list()`, `markRead()`, etc.

---

## Gap 6 — AI / NLQ API

### 状态：✅ **已解决 (v2.0.1)**

### 问题描述

Phase 5.1 需要 AI 集成以实现自然语言查询、AI 辅助记录创建和智能搜索。`@objectstack/spec/ai` 中已定义了丰富的 AI 类型（`Agent`, `NLQRequest`, `NLQResponse`, `NLQParseResult`, `ConversationSession`, `ConversationMessage`, `RAGQueryRequest`, `RAGQueryResponse` 等），但 Client SDK 无对应 API。

### 期望 SDK 提供

#### Client API

```typescript
client.ai: {
  /** Natural Language Query — 将自然语言转换为 ObjectQL 查询 */
  nlq(params: {
    query: string;              // e.g., "show me all high priority tasks due this week"
    context?: {
      objectName?: string;
      currentFilters?: FilterCondition;
    };
  }): Promise<{
    parsedQuery: QueryAST;
    confidence: number;
    explanation: string;        // human-readable explanation of the parsed query
    suggestions?: string[];     // alternative interpretations
  }>;

  /** Conversation — 多轮对话式交互 */
  chat(params: {
    message: string;
    sessionId?: string;
    context?: {
      objectName?: string;
      recordId?: string;
      record?: Record<string, unknown>;
    };
  }): Promise<{
    sessionId: string;
    response: string;
    actions?: Array<{
      type: 'navigate' | 'create' | 'update' | 'query';
      params: Record<string, unknown>;
    }>;
  }>;

  /** Smart suggestions — 基于上下文的智能建议 */
  suggest(params: {
    objectName: string;
    field: string;
    partialValue?: string;
    context?: Record<string, unknown>;
  }): Promise<{
    suggestions: Array<{
      value: unknown;
      label: string;
      confidence: number;
    }>;
  }>;

  /** Insights — AI 生成的数据洞察 */
  insights(params: {
    objectName: string;
    query?: Partial<QueryAST>;
  }): Promise<{
    insights: Array<{
      type: 'trend' | 'anomaly' | 'summary' | 'recommendation';
      title: string;
      description: string;
      data?: Record<string, unknown>;
    }>;
  }>;
}
```

#### React Hooks

```typescript
function useNLQ(options?: {
  objectName?: string;
}): {
  query: (text: string) => Promise<NLQResponse>;
  result: NLQResponse | null;
  isLoading: boolean;
  error: Error | null;
};

function useAIChat(options?: {
  sessionId?: string;
}): {
  messages: ConversationMessage[];
  send: (message: string) => Promise<void>;
  isLoading: boolean;
  sessionId: string;
};
```

### 优先级：✅ **已解决 (v2.0.1)** — `client.ai.nlq()`, `chat()`, `suggest()`, `insights()`

---

## Gap 7 — Batch Operations Optimization

### 状态：⚠️ SDK 有 API 但 Mobile 端未能直接使用

### 问题描述

SDK 已提供 `client.data.batch()`, `client.data.updateMany()`, `client.data.deleteMany()`, `client.data.createMany()` 等批量 API，且类型完整（`BatchUpdateRequest`, `BatchUpdateResponse`, `BatchOptions` 等）。

然而 Mobile 端的 `hooks/useBatchOperations.ts` **没有使用这些批量 API**，而是逐条发送请求（sequential loop），原因可能是：
1. `client-react` 未提供批量操作的 React hook
2. 批量操作的进度回调机制不明确

### 期望 SDK 改进

#### client-react 新增 Hook

```typescript
function useBatchMutation(object: string, options?: {
  onProgress?: (progress: { total: number; completed: number; failed: number }) => void;
  onSuccess?: (result: BatchUpdateResponse) => void;
  onError?: (error: Error) => void;
}): {
  batchCreate: (records: Record<string, unknown>[]) => Promise<BatchUpdateResponse>;
  batchUpdate: (records: Array<{ id: string; data: Record<string, unknown> }>) => Promise<BatchUpdateResponse>;
  batchDelete: (ids: string[]) => Promise<BatchUpdateResponse>;
  batch: (request: BatchUpdateRequest) => Promise<BatchUpdateResponse>;
  isLoading: boolean;
  progress: BatchProgress | null;
  error: Error | null;
};
```

### 优先级：🟢 Medium（性能优化，当前有 workaround）

---

## Gap 8 — File & Storage React Hooks

### 状态：❌ client-react 缺失

### 问题描述

SDK `client.storage.upload()` 和 `client.storage.getDownloadUrl()` 已有类型定义，但 `@objectstack/client-react` 没有对应的 React hooks，Mobile 端 Phase 5.4（文件与媒体）需要更方便的 React 集成。

### 期望 client-react 新增

```typescript
function useFileUpload(options?: {
  scope?: string;
  onProgress?: (progress: number) => void;
  onSuccess?: (result: FileUploadResponse) => void;
  onError?: (error: Error) => void;
}): {
  upload: (file: File | Blob | { uri: string; type: string; name: string }) => Promise<FileUploadResponse>;
  isUploading: boolean;
  progress: number;        // 0-100
  error: Error | null;
  reset: () => void;
};

function useFileDownload(fileId: string, options?: {
  enabled?: boolean;
}): {
  url: string | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};
```

### 上传进度 API（client 层）

当前 `client.storage.upload()` 缺少上传进度回调，移动端大文件上传需要进度指示：

```typescript
client.storage.upload(file, {
  scope?: string;
  onProgress?: (event: { loaded: number; total: number }) => void;
}): Promise<FileUploadResponse>;
```

### 优先级：🟡 High（Phase 5.4 阻塞）

---

## Gap 9 — i18n / Localization API

### 状态：✅ **已解决 (v2.0.1)**

### 问题描述

Phase 5.2 需要国际化支持。ObjectStack 协议中定义了 i18n 标准（`@objectstack/spec/system` 中有 `TranslationBundle`, `TranslationDataSchema`, `LocaleSchema`），Mobile 端需要从服务端获取翻译资源。

### 期望 SDK 提供

#### Client API

```typescript
client.i18n: {
  /** Get available locales */
  getLocales(): Promise<{
    locales: Array<{
      code: string;          // e.g., 'en-US', 'zh-CN'
      name: string;          // e.g., 'English (US)', '简体中文'
      direction: 'ltr' | 'rtl';
    }>;
    defaultLocale: string;
  }>;

  /** Get translations for a specific locale */
  getTranslations(locale: string, options?: {
    namespace?: string;       // e.g., 'labels', 'messages', 'errors'
    objectName?: string;      // scoped to specific object
    ifNoneMatch?: string;     // ETag for caching
  }): Promise<{
    translations: Record<string, string>;
    etag?: string;
  }>;

  /** Get localized labels for object fields */
  getFieldLabels(objectName: string, locale: string): Promise<{
    labels: Record<string, string>;   // field_name -> localized label
  }>;
}
```

#### React Hook

```typescript
function useTranslations(locale: string, options?: {
  namespace?: string;
  objectName?: string;
}): {
  t: (key: string, params?: Record<string, string>) => string;
  isLoading: boolean;
  error: Error | null;
};
```

### 优先级：✅ **已解决 (v2.0.1)** — `client.i18n.getLocales()`, `getTranslations()`, `getFieldLabels()`

---

## Gap 10 — Analytics React Hooks

### 状态：⚠️ Client API 已有但 React hooks 缺失

### 问题描述

`client.analytics.query()`, `client.analytics.meta()`, `client.analytics.explain()` 已有类型定义，但 `@objectstack/client-react` 没有对应的 React hooks。Phase 5.3（高级可视化）和 Phase 6.4（监控分析）需要方便的 React 集成。

### 期望 client-react 新增

```typescript
function useAnalyticsQuery(payload: AnalyticsQueryRequest, options?: {
  enabled?: boolean;
  refetchInterval?: number;
}): {
  data: AnalyticsResultResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

function useAnalyticsMeta(cube: string, options?: {
  enabled?: boolean;
}): {
  data: AnalyticsMetadataResponse | null;
  isLoading: boolean;
  error: Error | null;
};
```

### 优先级：🟢 Medium（Phase 5.3/6.4，有 workaround via useMetadata）

---

## Gap 11 — client-react Hook Gaps

### 状态：⚠️ 部分功能缺 React hook 封装

### 11.1 usePackages Hook

`client.packages.*` 已在 client 层完整实现，但 React 层无对应 hook。Mobile 端在 `hooks/useAppDiscovery.ts` 中自行封装了基于 `useClient()` + `useState` 的实现。

```typescript
function usePackages(filters?: {
  status?: string;
  enabled?: boolean;
}): {
  packages: Package[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};
```

### 11.2 useViewStorage Hook（对应 Gap 1）

当 `client.views` 类型化后，client-react 应提供：

```typescript
function useSavedViews(objectName: string, options?: {
  visibility?: 'private' | 'shared';
}): {
  views: SavedView[];
  isLoading: boolean;
  error: Error | null;
  saveView: (data: SaveViewInput) => Promise<void>;
  updateView: (viewId: string, data: Partial<SaveViewInput>) => Promise<void>;
  deleteView: (viewId: string) => Promise<void>;
  refetch: () => Promise<void>;
};
```

### 11.3 useMutation 缺少 `batch` 操作类型

当前 `useMutation` 支持的 operation 为 `'create' | 'update' | 'delete' | 'createMany' | 'updateMany' | 'deleteMany'`，建议增加 `'batch'` 操作类型。

### 优先级：🟢 Medium（有 workaround，但影响开发效率和代码一致性）

---

## Priority Summary

### ✅ v2.0.1 已解决

| # | Gap | 涉及 Phase | 状态 |
|---|-----|-----------|------|
| 1 | Views API 类型化 | Phase 4B.1 | ✅ 完全解决 |
| 2 | Permission System API | Phase 4B.2 | ✅ 完全解决 |
| 3 | Workflow / State Machine API | Phase 4B.3 | ✅ 完全解决 |
| 4 | Real-Time / WebSocket API | Phase 4B.4 | ✅ 完全解决 |
| 5 | Push Notification API | Phase 4B.5 | ✅ 完全解决 |
| 6 | AI / NLQ API | Phase 5B.1 | ✅ 完全解决 |
| 9 | i18n API | Phase 5B.2 | ✅ 完全解决 |

### 🟢 Medium — 有 workaround 或已改进，可后续优化

| # | Gap | 涉及 Phase | Spec 类型就绪 | v2.0.1 状态 |
|---|-----|-----------|-------------|------------|
| 7 | Batch React Hook | Phase 3.3 | ✅ Client 已有 | ✅ 已改进 |
| 8 | File/Storage React Hooks | Phase 5B.3 | ✅ Client 已有 | 可自建 hooks |
| 10 | Analytics React Hooks | Phase 5.3/6 | ✅ Client 已有 | 可用 hooks wrapper |
| 11 | 其他 React Hook 补全 | 多个 | ✅ | 可自建 hooks |

### 总预估 (v2.0.1 更新后)

- **Phase 4B (权限+工作流+实时+通知)**: ~3-4 周（Mobile 端实现）
- **Phase 5B (AI+i18n+hooks)**: ~3-4 周（Mobile 端实现）
- **总计**: ~6-8 周（无上游阻塞）
- **总计**: ~6-8 周（无上游阻塞，可并行开发缩短周期）

---

## Appendix: SDK API Surface Inventory

### `@objectstack/client@2.0.1` 完整类型树

```
ObjectStackClient
├── connect()                                    ✅ Available
├── meta
│   ├── getTypes()                               ✅ Available
│   ├── getItems(type, options?)                  ✅ Available
│   ├── getObject(name)                          ✅ Available (deprecated)
│   ├── getItem(type, name)                      ✅ Available
│   ├── saveItem(type, name, item)               ✅ Available
│   ├── getCached(name, cacheOptions?)           ✅ Available
│   └── getView(object, type?)                   ✅ Available
├── data
│   ├── query(object, ast)                       ✅ Available
│   ├── find(object, options?)                   ✅ Available
│   ├── get(object, id)                          ✅ Available
│   ├── create(object, data)                     ✅ Available
│   ├── createMany(object, data[])               ✅ Available
│   ├── update(object, id, data)                 ✅ Available
│   ├── batch(object, request)                   ✅ Available
│   ├── updateMany(object, records, options?)     ✅ Available
│   ├── delete(object, id)                       ✅ Available
│   └── deleteMany(object, ids, options?)        ✅ Available
├── packages
│   ├── list(filters?)                           ✅ Available
│   ├── get(id)                                  ✅ Available
│   ├── install(manifest, options?)              ✅ Available
│   ├── uninstall(id)                            ✅ Available
│   ├── enable(id)                               ✅ Available
│   └── disable(id)                              ✅ Available
├── auth
│   ├── login(request)                           ✅ Available
│   ├── logout()                                 ✅ Available
│   └── me()                                     ✅ Available
├── storage
│   ├── upload(file, scope?)                     ✅ Available
│   └── getDownloadUrl(fileId)                   ✅ Available
├── automation
│   └── trigger(name, payload)                   ✅ Available
├── analytics
│   ├── query(payload)                           ✅ Available
│   ├── meta(cube)                               ✅ Available
│   └── explain(payload)                         ✅ Available
├── hub
│   ├── spaces.list()                            ✅ Available
│   ├── spaces.create(payload)                   ✅ Available
│   └── plugins.install(pkg, ver?)               ✅ Available
├── views                                        ✅ Available (v2.0.1)
│   ├── list(object, type?)                      ✅ Typed
│   ├── get(object, viewId)                      ✅ Typed
│   ├── create(object, data)                     ✅ Typed
│   ├── update(object, viewId, data)             ✅ Typed
│   └── delete(object, viewId)                   ✅ Typed
├── permissions                                  ✅ Available (v2.0.1)
│   ├── check(params)                            ✅ Typed
│   ├── getObjectPermissions(objectName)         ✅ Typed
│   └── getEffectivePermissions()                ✅ Typed
├── workflow                                     ✅ Available (v2.0.1)
│   ├── getConfig(objectName)                    ✅ Typed
│   ├── getState(objectName, recordId)           ✅ Typed
│   ├── transition(params)                       ✅ Typed
│   ├── approve(params)                          ✅ Typed
│   └── reject(params)                           ✅ Typed
├── realtime                                     ✅ Available (v2.0.1)
│   ├── connect(options?)                        ✅ Typed
│   ├── disconnect()                             ✅ Typed
│   ├── subscribe(params)                        ✅ Typed
│   ├── unsubscribe(params)                      ✅ Typed
│   ├── setPresence(params)                      ✅ Typed
│   └── getPresence(params)                      ✅ Typed
├── notifications                                ✅ Available (v2.0.1)
│   ├── registerDevice(params)                   ✅ Typed
│   ├── unregisterDevice(deviceId)               ✅ Typed
│   ├── getPreferences()                         ✅ Typed
│   ├── updatePreferences(prefs)                 ✅ Typed
│   ├── list(options?)                           ✅ Typed
│   ├── markRead(ids)                            ✅ Typed
│   └── markAllRead()                            ✅ Typed
├── ai                                           ✅ Available (v2.0.1)
│   ├── nlq(params)                              ✅ Typed
│   ├── chat(params)                             ✅ Typed
│   ├── suggest(params)                          ✅ Typed
│   └── insights(params)                         ✅ Typed
└── i18n                                         ✅ Available (v2.0.1)
    ├── getLocales()                             ✅ Typed
    ├── getTranslations(locale, options?)         ✅ Typed
    └── getFieldLabels(objectName, locale)        ✅ Typed
```

### `@objectstack/client-react@2.0.1` 完整导出

```
Providers
├── ObjectStackProvider                          ✅ Available
└── ObjectStackContext                           ✅ Available

Hooks
├── useClient()                                  ✅ Available
├── useQuery(object, options?)                   ✅ Available
├── useMutation(object, op, options?)            ✅ Available
├── usePagination(object, options?)              ✅ Available
├── useInfiniteQuery(object, options?)           ✅ Available
├── useObject(objectName, options?)              ✅ Available
├── useView(objectName, viewType?, options?)     ✅ Available
├── useFields(objectName, options?)              ✅ Available
├── useMetadata(fetcher, options?)               ✅ Available
│
│  ────── MISSING HOOKS (可基于 useClient() 自建) ──────
│
├── usePermissions(objectName, options?)          ❌ Missing (client API ✅)
├── useWorkflowState(objectName, recordId)        ❌ Missing (client API ✅)
├── useSubscription(channel, options?)            ❌ Missing (client API ✅)
├── usePresence(channel, options?)                ❌ Missing (client API ✅)
├── useNotifications(options?)                    ❌ Missing (client API ✅)
├── useNLQ(options?)                              ❌ Missing (client API ✅)
├── useAIChat(options?)                           ❌ Missing (client API ✅)
├── useSavedViews(objectName, options?)           ❌ Missing (client API ✅)
├── usePackages(filters?)                         ❌ Missing (client API ✅)
├── useBatchMutation(object, options?)            ❌ Missing (client API ✅)
├── useFileUpload(options?)                       ❌ Missing (client API ✅)
├── useFileDownload(fileId, options?)             ❌ Missing (client API ✅)
├── useAnalyticsQuery(payload, options?)          ❌ Missing (client API ✅)
├── useAnalyticsMeta(cube, options?)              ❌ Missing (client API ✅)
└── useTranslations(locale, options?)             ❌ Missing (client API ✅)
```

---

*This report is based on the SDK versions installed in the ObjectStack Mobile project as of 2026-02-09. All client API gaps have been resolved in v2.0.1. Remaining work is Mobile-side hook implementation.*
