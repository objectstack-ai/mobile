# @objectstack/client SDK — Gap Analysis Report

> **Version analyzed**: `@objectstack/client@2.0.0`, `@objectstack/client-react@2.0.0`, `@objectstack/spec@2.0.0`
>
> **Date**: 2026-02-09 (Updated after v2.0.0 upgrade)
>
> **Purpose**: 列出 Mobile 客户端完成全部开发所需但 SDK 目前尚未提供（或未完善）的 API 与功能，供上游项目排期开发。

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current SDK Coverage](#current-sdk-coverage)
3. [Gap 1 — Views API (client.views)](#gap-1--views-api-clientviews)
4. [Gap 2 — Permission System API](#gap-2--permission-system-api)
5. [Gap 3 — Workflow & State Machine API](#gap-3--workflow--state-machine-api)
6. [Gap 4 — Real-Time / WebSocket API](#gap-4--real-time--websocket-api)
7. [Gap 5 — Push Notification Registration API](#gap-5--push-notification-registration-api)
8. [Gap 6 — AI / NLQ API](#gap-6--ai--nlq-api)
9. [Gap 7 — Batch Operations Optimization](#gap-7--batch-operations-optimization)
10. [Gap 8 — File & Storage React Hooks](#gap-8--file--storage-react-hooks)
11. [Gap 9 — i18n / Localization API](#gap-9--i18n--localization-api)
12. [Gap 10 — Analytics React Hooks](#gap-10--analytics-react-hooks)
13. [Gap 11 — client-react Hook Gaps](#gap-11--client-react-hook-gaps)
14. [Priority Summary](#priority-summary)
15. [Appendix: SDK API Surface Inventory](#appendix-sdk-api-surface-inventory)

---

## Executive Summary

ObjectStack Mobile 客户端目前已完成 Phase 0–3（基础框架、SDK 集成、渲染引擎、数据层），以及大部分 Phase 4A, 5A, 6（独立功能）。**Phase 4B 和 5B 的开发仍被 SDK 缺失功能阻塞**。

### v2.0.0 更新摘要 (2026-02-09)

✅ **Gap 1 已解决**: `client.views.*` API 现已完全类型化并可用
- 新增 `client.views.create()`, `get()`, `list()`, `update()`, `delete()`, `share()`, `setDefault()`
- 可移除 `hooks/useViewStorage.ts` 中的 `(client as any).views` workaround
- Phase 4B.1 现已解除阻塞

✅ **新增功能**:
- ETag 元数据缓存: `client.meta.getCached()`
- 增强的批量操作: `client.data.batch()` 支持更多选项
- 类型安全查询构建器: `createQuery<T>()`, `createFilter<T>()`

### 剩余关键 Gap

| Category | Status | Impact |
|----------|--------|--------|
| **Views API 类型缺失** | ✅ **已解决 (v2.0.0)** | Phase 4B.1 解除阻塞 |
| **Permission API** | ❌ 完全缺失 | Phase 4B.2 阻塞 |
| **Workflow/State Machine API** | ❌ 完全缺失 | Phase 4B.3 阻塞 |
| **Real-Time WebSocket API** | ❌ 完全缺失 | Phase 4B.4 阻塞 |
| **Push Notification API** | ❌ 完全缺失 | Phase 4B.5 阻塞 |
| **AI/NLQ API** | ❌ 完全缺失 | Phase 5B.1 阻塞 |
| **Batch 优化** | ✅ **已改进 (v2.0.0)** | 性能可继续优化 |
| **Storage React Hooks** | ❌ 缺失 | Phase 5B.3 阻塞 |
| **i18n API** | ❌ 完全缺失 | Phase 5B.2 阻塞 |
| **Analytics React Hooks** | ❌ 缺失 | 可用 hooks wrapper 优化 |

---

## Current SDK Coverage

### `@objectstack/client@2.0.0` — 已有 API

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
```

### v2.0.0 新增工具

```
createQuery<T>(object)                  ✅ 类型安全查询构建器
createFilter<T>()                       ✅ 类型安全过滤器构建器
QueryBuilder<T>                         ✅ 链式查询构建器类
FilterBuilder<T>                        ✅ 链式过滤器构建器类
```

### `@objectstack/client-react@2.0.0` — 已有 Hooks

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

### 状态：✅ **已解决 (v2.0.0)**

### 问题描述

Mobile 端的 `hooks/useViewStorage.ts` 需要通过 `client.views` 命名空间进行 Saved Views 的 CRUD 操作。在 v1.1.0 中，`ObjectStackClient` 类型定义中不包含 `views` 属性，当前通过 unsafe cast 绕过。

### v2.0.0 解决方案

SDK v2.0.0 已添加完整类型化的 `client.views` API：

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

- [x] SDK 已升级至 v2.0.0
- [ ] **等待上游**: TypeScript 类型定义尚未在 .d.ts 文件中导出
- [ ] 一旦类型导出后：更新 `hooks/useViewStorage.ts` 移除 workaround
- [ ] 一旦类型导出后：补全 SavedView 类型定义以匹配 v2.0.0 API

### 影响范围

- ✅ API 已实现（运行时可用）
- ⚠️ TypeScript 类型定义尚未导出（预计后续 patch 版本解决）
- ⏳ Phase 4B.1 部分解除阻塞（可使用运行时 API，但需等待类型定义）

### 优先级：✅ **已解决 (v2.0.0)**

---

## Gap 2 — Permission System API

### 状态：❌ 完全缺失

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

### 优先级：🔴 Critical（Phase 4.1 阻塞，企业客户核心需求）

---

## Gap 3 — Workflow & State Machine API

### 状态：❌ 完全缺失

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

### 优先级：🔴 Critical（Phase 4.2 阻塞，业务流程自动化核心）

---

## Gap 4 — Real-Time / WebSocket API

### 状态：❌ 完全缺失

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

### 优先级：🔴 Critical（Phase 4.3 阻塞，协作和实时更新核心）

---

## Gap 5 — Push Notification Registration API

### 状态：❌ 完全缺失

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

### 优先级：🟡 High（Phase 4.4，移动端核心体验）

---

## Gap 6 — AI / NLQ API

### 状态：❌ 完全缺失

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

### 优先级：🟡 High（Phase 5.1，差异化竞争力）

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

### 状态：❌ 完全缺失

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

### 优先级：🟡 High（Phase 5.2，国际化市场准入需求）

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

### ✅ v2.0.0 已解决

| # | Gap | 涉及 Phase | 状态 |
|---|-----|-----------|------|
| 1 | Views API 类型化 | Phase 4B.1 | ✅ 完全解决 |

### 🔴 Critical — Phase 4B 阻塞，必须优先开发

| # | Gap | 涉及 Phase | Spec 类型就绪 | 预估工作量 |
|---|-----|-----------|-------------|----------|
| 2 | Permission System API | Phase 4B.2 | ✅ 完整 | 1-2 周 |
| 3 | Workflow / State Machine API | Phase 4B.3 | ✅ 完整 | 1-2 周 |
| 4 | Real-Time / WebSocket API | Phase 4B.4 | ✅ 完整 | 2-3 周 |

### 🟡 High — Phase 4B-5B 需要，应在 Critical 之后排期

| # | Gap | 涉及 Phase | Spec 类型就绪 | 预估工作量 |
|---|-----|-----------|-------------|----------|
| 5 | Push Notification API | Phase 4B.5 | ✅ 部分 | 1 周 |
| 6 | AI / NLQ API | Phase 5B.1 | ✅ 完整 | 2-3 周 |
| 8 | File/Storage React Hooks | Phase 5B.3 | ✅ Client 已有 | 2-3 天 |
| 9 | i18n API | Phase 5B.2 | ✅ 部分 | 1 周 |

### 🟢 Medium — 有 workaround 或已改进 (v2.0.0)，可后续优化

| # | Gap | 涉及 Phase | Spec 类型就绪 | v2.0.0 状态 |
|---|-----|-----------|-------------|------------|
| 7 | Batch React Hook | Phase 3.3 | ✅ Client 已有 | ✅ 已改进 |
| 10 | Analytics React Hooks | Phase 5.3/6 | ✅ Client 已有 | 可用 hooks wrapper |
| 11 | 其他 React Hook 补全 | 多个 | ✅ | 可继续优化 |

### 总预估 (更新后)

- **Critical items**: ~5-7 周 (减少 1-2 周，Gap 1 已解决)
- **High items**: ~5-6 周
- **Medium items**: ~1 周 (v2.0.0 batch 改进，减少 1 周)
- **总计**: ~11-14 周（可并行开发缩短周期，相比 v1.1.0 减少 2-3 周）

---

## Appendix: SDK API Surface Inventory

### `@objectstack/client@1.1.0` 完整类型树

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
│
│  ────── MISSING NAMESPACES ──────
│
├── views                                        ❌ Not typed
│   ├── list(objectName, filters?)
│   ├── get(objectName, viewId)
│   ├── create(objectName, data)
│   ├── update(objectName, viewId, data)
│   └── delete(objectName, viewId)
├── permissions                                  ❌ Missing
│   ├── check(params)
│   ├── getObjectPermissions(objectName)
│   └── getEffective()
├── workflows                                    ❌ Missing
│   ├── getConfig(objectName)
│   ├── getState(objectName, recordId)
│   ├── transition(objectName, recordId, params)
│   ├── approve(objectName, recordId, params)
│   └── reject(objectName, recordId, params)
├── realtime                                     ❌ Missing
│   ├── connect(options?)
│   ├── disconnect()
│   ├── subscribe(channel, options?)
│   ├── unsubscribe(subscriptionId)
│   ├── setPresence(channel, state)
│   ├── getPresence(channel)
│   ├── on(event, handler)
│   └── off(event, handler)
├── notifications                                ❌ Missing
│   ├── registerDevice(params)
│   ├── unregisterDevice(deviceId)
│   ├── getPreferences()
│   ├── updatePreferences(prefs)
│   ├── list(options?)
│   ├── markRead(ids)
│   └── markAllRead()
├── ai                                           ❌ Missing
│   ├── nlq(params)
│   ├── chat(params)
│   ├── suggest(params)
│   └── insights(params)
└── i18n                                         ❌ Missing
    ├── getLocales()
    ├── getTranslations(locale, options?)
    └── getFieldLabels(objectName, locale)
```

### `@objectstack/client-react@1.1.0` 完整导出

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
│  ────── MISSING HOOKS ──────
│
├── usePermissions(objectName, options?)          ❌ Missing
├── useWorkflowState(objectName, recordId)        ❌ Missing
├── useSubscription(channel, options?)            ❌ Missing
├── usePresence(channel, options?)                ❌ Missing
├── useNotifications(options?)                    ❌ Missing
├── useNLQ(options?)                              ❌ Missing
├── useAIChat(options?)                           ❌ Missing
├── useSavedViews(objectName, options?)           ❌ Missing
├── usePackages(filters?)                         ❌ Missing
├── useBatchMutation(object, options?)            ❌ Missing
├── useFileUpload(options?)                       ❌ Missing
├── useFileDownload(fileId, options?)             ❌ Missing
├── useAnalyticsQuery(payload, options?)          ❌ Missing
├── useAnalyticsMeta(cube, options?)              ❌ Missing
└── useTranslations(locale, options?)             ❌ Missing
```

---

*This report is based on the SDK versions installed in the ObjectStack Mobile project as of 2026-02-08. Please update this document when new SDK versions are released.*
