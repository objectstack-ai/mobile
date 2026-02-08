# ObjectStack Mobile — Development Roadmap

> **Version**: 2.0 · **Last Updated**: 2026-02-08
>
> Comprehensive development plan for the ObjectStack Mobile client, restructured based on the [SDK Gap Analysis](./SDK-GAP-ANALYSIS.md) of `@objectstack/client@1.1.0`.

---

## Table of Contents

1. [Vision & Positioning](#vision--positioning)
2. [Current State (Phase 0–3 ✅)](#current-state-phase-03-)
3. [SDK API Availability Matrix](#sdk-api-availability-matrix)
4. [Development Phases](#development-phases)
   - [Phase 4A — SDK 可用功能完善（无阻塞）](#phase-4a--sdk-可用功能完善无阻塞)
   - [Phase 4B — ObjectOS 系统集成（等待 SDK）](#phase-4b--objectos-系统集成等待-sdk)
   - [Phase 5A — 高级功能·可立即开发](#phase-5a--高级功能可立即开发)
   - [Phase 5B — 高级功能·等待 SDK](#phase-5b--高级功能等待-sdk)
   - [Phase 6 — Production Readiness](#phase-6--production-readiness)
5. [Architecture Overview](#architecture-overview)
6. [Target Project Structure](#target-project-structure)
7. [Technology Decisions](#technology-decisions)
8. [Release Plan](#release-plan)

---

## Vision & Positioning

ObjectStack Mobile is the **end-user mobile runtime** for the ObjectStack platform. It serves as the native mobile projection layer for the ObjectStack three-layer protocol stack:

```
┌──────────────────────────────────────────────┐
│   ObjectUI (View Layer) ← Mobile Renders This│
├──────────────────────────────────────────────┤
│   ObjectOS (Control Layer) ← REST API        │
├──────────────────────────────────────────────┤
│   ObjectQL (Data Layer)                      │
└──────────────────────────────────────────────┘
```

**Core principle**: The mobile client is a **metadata-driven runtime** — it does not hardcode business logic. Instead, it interprets ObjectUI metadata (Views, Forms, Dashboards, Actions) fetched from an ObjectStack server and renders them as native mobile components.

---

## Current State (Phase 0–3 ✅)

Phase 0–3 已全部完成或大部分完成。以下为各阶段完成状态：

### Phase 0 — Foundation ✅

| Area | Status | Details |
|------|--------|---------|
| **Framework** | ✅ Done | Expo SDK 54, Expo Router, TypeScript strict |
| **Styling** | ✅ Done | NativeWind v4 + CSS variable design tokens (light/dark) |
| **UI Primitives** | ✅ Done | Button, Card, Input (shadcn/ui pattern in `components/ui/`) |
| **Authentication** | ✅ Done | better-auth with `@better-auth/expo`, email + social sign-in |
| **Navigation** | ✅ Done | Tab layout (Home, Apps, Notifications, Profile) + Auth stack |
| **State Management** | ✅ Done | Zustand + TanStack Query configured |
| **Common Components** | ✅ Done | EmptyState, ErrorBoundary, SearchBar, etc. in `components/common/` |

### Phase 1 — SDK Integration ✅

| Area | Status | Details |
|------|--------|---------|
| **SDK Install** | ✅ Done | `@objectstack/client@1.1.0` + `@objectstack/client-react@1.1.0` |
| **Client Init** | ✅ Done | `lib/objectstack.ts` with auth token injection |
| **Provider** | ✅ Done | `ObjectStackProvider` wraps root layout |
| **Metadata Layer** | ✅ Done | `useObject()`, `useView()`, `useFields()` integrated |
| **Metadata Cache** | ✅ Done | `lib/metadata-cache.ts` with react-native-mmkv ETag caching |
| **Data Layer** | ✅ Done | `useQuery()`, `useMutation()`, `usePagination()`, `useInfiniteQuery()` |
| **Error Handling** | ✅ Done | `lib/error-handling.ts` standardized error messages |
| **App Discovery** | ✅ Done | `hooks/useAppDiscovery.ts` via `client.packages.list()` |

### Phase 2 — ObjectUI Rendering Engine ✅ (大部分)

| Area | Status | Details |
|------|--------|---------|
| **ViewRenderer** | ✅ Done | Dispatcher + registry pattern in `components/renderers/` |
| **List View** | ✅ Done | Columns, sorting, pull-to-refresh, infinite scroll |
| **Form View** | ✅ Done | FieldRenderer, layout DSL, validation, conditional fields |
| **Detail View** | ✅ Done | Read-only sections, related lists, action bar |
| **Dashboard View** | ✅ Done | Widget types: card, chart, list, metric |
| **Action System** | ✅ Done | ActionExecutor, ActionBar, FloatingActionButton |
| **CRUD Routes** | ✅ Done | `app/(app)/[appName]/[objectName]/` list/detail/new/edit |
| Filter drawer | ⬜ Remaining | Dynamic filter UI from field definitions |
| Swipe actions | ⬜ Remaining | Edit/delete per row |
| Record navigation | ⬜ Remaining | Previous/next in detail view |
| Widget layout grid | ⬜ Remaining | Responsive dashboard grid |
| Live dashboard data | ⬜ Remaining | Wire widgets to live queries |

### Phase 3 — ObjectQL Data Layer ✅

| Area | Status | Details |
|------|--------|---------|
| **Query Builder** | ✅ Done | `lib/query-builder.ts`, filter AST, compound filters, global search |
| **Offline Storage** | ✅ Done | `expo-sqlite`, sync queue, background sync |
| **Conflict Resolution** | ✅ Done | `components/sync/ConflictResolutionDialog` |
| **Batch Operations** | ✅ Done | `hooks/useBatchOperations.ts`, multi-select UI, progress |
| **View Storage** | ✅ Done | `hooks/useViewStorage.ts`, save/share views (via `(client as any).views`) |
| **Network Status** | ✅ Done | `hooks/useNetworkStatus.ts`, offline indicator |

---

## SDK API Availability Matrix

基于 `@objectstack/client@1.1.0` 实际 API 分析（详见 [SDK-GAP-ANALYSIS.md](./SDK-GAP-ANALYSIS.md)）：

### ✅ 已有且可用的 SDK API

| Namespace | API | Mobile 使用状态 |
|-----------|-----|---------------|
| `client.meta.*` | getTypes, getItems, getObject, getItem, saveItem, getCached, getView | ✅ 已集成 |
| `client.data.*` | query, find, get, create, createMany, update, batch, updateMany, delete, deleteMany | ✅ 已集成 |
| `client.packages.*` | list, get, install, uninstall, enable, disable | ✅ 已集成 |
| `client.auth.*` | login, logout, me | ✅ 已集成 |
| `client.storage.*` | upload, getDownloadUrl | ⬜ 待使用（Phase 5A 文件功能） |
| `client.automation.*` | trigger | ✅ 已集成（ActionExecutor） |
| `client.analytics.*` | query, meta, explain | ⬜ 待使用（Phase 5A 图表功能） |
| `client.hub.*` | spaces.list, spaces.create, plugins.install | ⬜ 备用 |

### ❌ SDK 缺失·阻塞 Mobile 开发的 API

| 缺失 API | 阻塞的功能 | 上游预估工作量 | 详见 |
|----------|-----------|-------------|------|
| `client.views.*` 类型 | View Storage 类型安全 | 1–2 天 | [Gap 1](./SDK-GAP-ANALYSIS.md#gap-1--views-api-clientviews) |
| `client.permissions.*` | 权限系统 | 1–2 周 | [Gap 2](./SDK-GAP-ANALYSIS.md#gap-2--permission-system-api) |
| `client.workflows.*` | 工作流/审批 | 1–2 周 | [Gap 3](./SDK-GAP-ANALYSIS.md#gap-3--workflow--state-machine-api) |
| `client.realtime.*` | 实时 WebSocket | 2–3 周 | [Gap 4](./SDK-GAP-ANALYSIS.md#gap-4--real-time--websocket-api) |
| `client.notifications.*` | 推送通知 | 1 周 | [Gap 5](./SDK-GAP-ANALYSIS.md#gap-5--push-notification-registration-api) |
| `client.ai.*` | AI/NLQ 集成 | 2–3 周 | [Gap 6](./SDK-GAP-ANALYSIS.md#gap-6--ai--nlq-api) |
| `client.i18n.*` | 国际化翻译 | 1 周 | [Gap 9](./SDK-GAP-ANALYSIS.md#gap-9--i18n--localization-api) |

### ⚠️ SDK 已有但缺 React Hooks

| 缺失 Hook | Client API | Mobile 当前方案 |
|-----------|-----------|---------------|
| `useBatchMutation` | `client.data.batch()` ✅ | 自建 `useBatchOperations` 逐条调用 |
| `useFileUpload` | `client.storage.upload()` ✅ | 待实现 |
| `useAnalyticsQuery` | `client.analytics.query()` ✅ | 可通过 `useMetadata()` 包装 |
| `usePackages` | `client.packages.list()` ✅ | 自建 `useAppDiscovery` |
| `useSavedViews` | `client.views.*` ⚠️ untyped | 自建 `useViewStorage` + `as any` |

---

## Development Phases

> **核心策略**：将原 Phase 4–5 按 SDK 依赖拆分为 **A（可立即开发）** 和 **B（等待 SDK 上游）** 两个并行轨道，最大化开发效率。

### Phase 4A — SDK 可用功能完善（无阻塞）

> **Goal**: 利用现有 SDK API 完善渲染引擎、优化批量操作、接入文件和分析功能。
>
> **Duration**: 2–3 周
>
> **SDK 依赖**: 全部使用 `@objectstack/client@1.1.0` 已有 API，无阻塞。

#### 4A.1 渲染引擎补全（利用现有 `client.meta.*` + `client.data.*`）

- [ ] 列表视图：添加 filter drawer（动态 filter UI，基于 `useFields()` 字段定义）
- [ ] 列表视图：添加 swipe actions（编辑/删除），基于现有 `useMutation()`
- [ ] 列表视图：支持行选择（单选/多选）用于批量操作
- [ ] 详情视图：实现记录前后导航（previous/next）
- [ ] 仪表盘：实现 widget 响应式网格布局
- [ ] 仪表盘：将 widgets 接入实时数据查询（`useQuery()`）

#### 4A.2 批量操作优化（利用现有 `client.data.batch()` / `createMany()` / `deleteMany()`）

- [ ] 重构 `hooks/useBatchOperations.ts`，使用 SDK 原生 `client.data.batch()` 替代逐条请求
- [ ] 使用 `client.data.createMany()` 优化批量创建
- [ ] 使用 `client.data.deleteMany()` 优化批量删除
- [ ] 添加批量操作结果统计（成功/失败/跳过）

#### 4A.3 文件与媒体（利用现有 `client.storage.upload()` + `getDownloadUrl()`）

- [ ] 实现文件上传功能（集成 `expo-image-picker` + `expo-document-picker`）
- [ ] 调用 `client.storage.upload()` 上传文件到服务端
- [ ] 调用 `client.storage.getDownloadUrl()` 获取文件下载链接
- [ ] 构建图片预览与画廊组件
- [ ] 在记录表单中支持文件附件字段
- [ ] 集成相机拍照功能
- [ ] 实现文件下载与分享

#### 4A.4 分析与图表（利用现有 `client.analytics.*`）

- [ ] 封装 `useAnalyticsQuery()` hook（基于 `useClient()` + `client.analytics.query()`）
- [ ] 封装 `useAnalyticsMeta()` hook（基于 `client.analytics.meta()`）
- [ ] 实现 Chart view renderer（柱状图、折线图、饼图、漏斗图）
- [ ] 在 Dashboard widgets 中接入 analytics 数据

#### 4A.5 高级视图渲染器（纯前端，不依赖额外 SDK API）

- [ ] 添加 Kanban board view renderer（拖拽列，基于 `useQuery()` + `useMutation()` 更新状态字段）
- [ ] 添加 Calendar view renderer（事件显示，基于日期字段 `useQuery()` 过滤）
- [ ] 添加 Timeline view（活动历史记录）
- [ ] 添加 Map view（地理位置数据展示）

#### 4A.6 安全增强（纯客户端功能）

- [ ] 添加生物识别认证（Face ID / 指纹）via `expo-local-authentication`
- [ ] 实现后台超时锁屏
- [ ] 添加会话管理（查看活跃会话，远程登出）— 可利用 `client.auth.me()`
- [ ] 实现 API 通信 certificate pinning

---

### Phase 4B — ObjectOS 系统集成（等待 SDK）

> **Goal**: 接入 ObjectOS 系统能力，包括权限、工作流和实时功能。
>
> **Duration**: 3–4 周（SDK API 就绪后）
>
> **SDK 依赖**: ⛔ 需要上游先完成以下 API 开发（详见 [SDK-GAP-ANALYSIS.md](./SDK-GAP-ANALYSIS.md)）

```
⛔ 阻塞项：
  • client.views.*          类型化  → Gap 1  (预估 1-2 天)
  • client.permissions.*            → Gap 2  (预估 1-2 周)
  • client.workflows.*              → Gap 3  (预估 1-2 周)
  • client.realtime.*               → Gap 4  (预估 2-3 周)
  • client.notifications.*          → Gap 5  (预估 1 周)
```

#### 4B.1 Views API 类型修复（等待 Gap 1 修复）

- [ ] 移除 `hooks/useViewStorage.ts` 中的 `(client as any).views` workaround
- [ ] 使用 SDK 正式的 typed `client.views.*` API
- [ ] 补全 SavedView 类型定义

#### 4B.2 权限系统（等待 Gap 2: `client.permissions.*`）

- [ ] 创建 `hooks/usePermissions.ts`，调用 `client.permissions.getObjectPermissions()`
- [ ] 在列表视图中根据权限隐藏/禁用 create 按钮
- [ ] 在表单视图中根据字段权限设置只读
- [ ] 在详情视图中根据权限隐藏 edit/delete 操作
- [ ] 在 ActionBar 中过滤无权限的 actions

#### 4B.3 工作流 & 审批（等待 Gap 3: `client.workflows.*`）

- [ ] 创建 `hooks/useWorkflowState.ts`，调用 `client.workflows.getState()`
- [ ] 在记录详情页显示当前工作流状态（state badge）
- [ ] 渲染可用的状态转换按钮（调用 `client.workflows.transition()`）
- [ ] 实现审批流 UI（approve/reject，调用 `client.workflows.approve()` / `reject()`）
- [ ] 展示工作流历史记录

#### 4B.4 实时更新（等待 Gap 4: `client.realtime.*`）

- [ ] 创建 `hooks/useSubscription.ts`，建立 WebSocket 连接
- [ ] 订阅记录变更事件，实现列表实时刷新
- [ ] 实现协作指示器（谁正在查看/编辑同一记录）
- [ ] 利用 WebSocket 实现实时通知推送

#### 4B.5 推送通知（等待 Gap 5: `client.notifications.*`）

- [ ] 配置 `expo-notifications`，获取设备 push token
- [ ] 调用 `client.notifications.registerDevice()` 注册 token 到服务端
- [ ] 调用 `client.notifications.list()` 获取通知列表
- [ ] 构建通知列表 UI（已读/未读状态）
- [ ] 实现从通知 deep link 到对应记录/视图
- [ ] 调用 `client.notifications.updatePreferences()` 管理通知偏好

---

### Phase 5A — 高级功能·可立即开发

> **Goal**: 不依赖上游 SDK 的高级功能，可与 Phase 4A 并行或紧随其后开发。
>
> **Duration**: 2–3 周
>
> **SDK 依赖**: 无

#### 5A.1 国际化 — 客户端框架（不依赖 `client.i18n.*`）

> 注：客户端 i18n 框架可先搭建，内置静态翻译。服务端翻译拉取等 `client.i18n.*` 就绪后再接入。

- [x] 集成 `expo-localization` + `i18next`
- [x] 创建 `lib/i18n.ts` 配置文件
- [x] 内置 UI 框架的静态翻译（按钮文字、错误消息、提示等）
- [x] 支持 RTL 布局（阿拉伯语/希伯来语）
- [x] 本地化日期、数字、货币格式
- [x] 用户语言偏好选择

#### 5A.2 性能优化

- [x] 使用 `FlashList` 替换 FlatList 实现列表虚拟化
- [x] 添加图片缓存与懒加载
- [ ] Tree shaking 分析优化 bundle size
- [ ] 路由级别代码分割
- [ ] 内存泄漏 profiling 与修复

#### 5A.3 测试基础设施

- [x] 配置 Jest + React Native Testing Library
- [x] 为所有 renderers 和 utility 函数编写单元测试
- [ ] 为 data hooks 编写集成测试（MSW mocking via `@objectstack/plugin-msw`）
- [ ] 设置 Maestro 或 Detox E2E 测试
- [ ] UI 组件 snapshot tests
- [ ] 目标：≥80% code coverage

#### 5A.4 CI/CD Pipeline

- [x] 配置 GitHub Actions PR checks（type-check, lint, test）
- [x] 设置 EAS Build 自动构建（iOS + Android）
- [x] 配置 EAS Update OTA 更新
- [x] 设置 App Store / Google Play 部署 via EAS Submit
- [x] 添加版本号自动化（changesets 或 standard-version）

---

### Phase 5B — 高级功能·等待 SDK

> **Goal**: 依赖上游 SDK 新 API 的高级功能。
>
> **Duration**: 3–4 周（SDK API 就绪后）
>
> **SDK 依赖**: ⛔ 需要上游先完成以下 API 开发

```
⛔ 阻塞项：
  • client.ai.*                                                → Gap 6     (预估 2-3 周)
  • client.i18n.*                                              → Gap 9     (预估 1 周)
  • React hooks: useBatchMutation, useFileUpload, useAnalytics → Gap 7/8/10/11
```

#### 5B.1 AI Agent 集成（等待 Gap 6: `client.ai.*`）

- [ ] 构建对话式 AI 界面（自然语言查询）
- [ ] 调用 `client.ai.nlq()` 将自然语言转为 ObjectQL 查询
- [ ] 调用 `client.ai.chat()` 实现多轮对话
- [ ] 调用 `client.ai.suggest()` 实现智能搜索建议
- [ ] 调用 `client.ai.insights()` 在仪表盘展示 AI 洞察

#### 5B.2 服务端国际化（等待 Gap 9: `client.i18n.*`）

> 在 Phase 5A.1 客户端框架的基础上接入服务端翻译。

- [ ] 调用 `client.i18n.getLocales()` 获取可用语言列表
- [ ] 调用 `client.i18n.getTranslations()` 拉取翻译资源（支持 ETag 缓存）
- [ ] 调用 `client.i18n.getFieldLabels()` 获取字段标签翻译
- [ ] 实现翻译资源的离线缓存

#### 5B.3 SDK React Hooks 升级（等待 Gap 7/8/10/11）

> 当上游 `@objectstack/client-react` 提供以下 hooks 后，替换本地 workaround。

- [ ] 替换 `hooks/useBatchOperations.ts` → SDK `useBatchMutation()`
- [ ] 替换手动 `client.storage.upload()` 调用 → SDK `useFileUpload()`
- [ ] 替换手动 analytics 调用 → SDK `useAnalyticsQuery()` / `useAnalyticsMeta()`
- [ ] 替换 `hooks/useAppDiscovery.ts` → SDK `usePackages()`
- [ ] 替换 `hooks/useViewStorage.ts` → SDK `useSavedViews()`

---

### Phase 6 — Production Readiness

> **Goal**: 监控、分析与最终上线准备。
>
> **Duration**: 2–3 周
>
> **SDK 依赖**: 无（可在 Phase 4A/5A 完成后立即开始）

#### 6.1 监控 & 错误追踪

- [ ] 集成 Sentry crash reporting
- [ ] 添加性能监控（Sentry Performance）
- [ ] 实现 feature flags 渐进式发布
- [ ] 添加远程配置支持

#### 6.2 用户分析

- [ ] 添加页面浏览和关键操作的 analytics tracking
- [ ] 构建用户行为仪表板

#### 6.3 最终优化

- [ ] 全量 E2E 测试通过
- [ ] 安全审计与漏洞扫描
- [ ] 性能基准测试
- [ ] App Store / Google Play 审核准备

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      ObjectStack Mobile                         │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Expo Router (Navigation)                │  │
│  │   (auth) → sign-in / sign-up                             │  │
│  │   (tabs) → home / apps / notifications / profile         │  │
│  │   (app)  → [appName] / object / [objectName] / views     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │              ObjectUI Rendering Engine                    │  │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐  │  │
│  │  │ListView │ │FormView  │ │DetailView│ │DashboardView│  │  │
│  │  └─────────┘ └──────────┘ └──────────┘ └─────────────┘  │  │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐  │  │
│  │  │KanbanVw │ │CalendarVw│ │ChartView │ │WidgetSlots  │  │  │
│  │  └─────────┘ └──────────┘ └──────────┘ └─────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │                     Data Layer                            │  │
│  │  ┌──────────────────┐  ┌──────────────────────────────┐  │  │
│  │  │ @objectstack/    │  │ Zustand Store                │  │  │
│  │  │ client-react     │  │ (app state, ui state, cache) │  │  │
│  │  │ useQuery         │  │                              │  │  │
│  │  │ useMutation      │  └──────────────────────────────┘  │  │
│  │  │ usePagination    │                                    │  │
│  │  │ useInfiniteQuery │                                    │  │
│  │  └──────────────────┘                                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │                  @objectstack/client                      │  │
│  │   client.meta.*  client.data.*  client.storage.*         │  │
│  │   client.automation.*   client.analytics.*               │  │
│  │   ┌───────────────────────────────────────────────────┐   │  │
│  │   │  Offline Layer (SQLite + Sync Queue)              │   │  │
│  │   └───────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                    HTTP/REST API / WebSocket                    │
│                              │                                  │
└──────────────────────────────▼──────────────────────────────────┘
                     ObjectStack Server
```

---

## Target Project Structure

```
├── app/                            # Expo Router pages
│   ├── _layout.tsx                 # Root layout (providers, auth guard)
│   ├── (auth)/                     # Authentication stack
│   │   ├── _layout.tsx
│   │   ├── sign-in.tsx
│   │   └── sign-up.tsx
│   ├── (tabs)/                     # Main tab navigation
│   │   ├── _layout.tsx
│   │   ├── index.tsx               # Home / Dashboard
│   │   ├── apps.tsx                # App launcher
│   │   ├── notifications.tsx       # Notification center
│   │   └── profile.tsx             # User profile & settings
│   └── (app)/                      # Dynamic app screens
│       └── [appName]/
│           ├── _layout.tsx
│           ├── index.tsx            # App home
│           └── [objectName]/
│               ├── index.tsx        # Object list view
│               ├── [id].tsx         # Object detail view
│               ├── new.tsx          # Create record form
│               └── [id]/edit.tsx    # Edit record form
├── components/
│   ├── ui/                         # Design system primitives
│   ├── renderers/                  # ObjectUI rendering engine
│   │   ├── ViewRenderer.tsx        # Top-level view dispatcher
│   │   ├── ListViewRenderer.tsx
│   │   ├── FormViewRenderer.tsx
│   │   ├── DetailViewRenderer.tsx
│   │   ├── DashboardViewRenderer.tsx
│   │   ├── KanbanViewRenderer.tsx  # Phase 4A
│   │   ├── CalendarViewRenderer.tsx# Phase 4A
│   │   ├── ChartViewRenderer.tsx   # Phase 4A
│   │   └── fields/
│   ├── actions/                    # Action system
│   ├── query/                      # Query builder UI
│   ├── batch/                      # Batch operation UI
│   ├── views/                      # Saved views UI
│   ├── sync/                       # Offline sync UI
│   └── common/                     # Shared components
├── lib/
│   ├── utils.ts
│   ├── auth-client.ts
│   ├── objectstack.ts
│   ├── metadata-cache.ts
│   ├── query-builder.ts
│   ├── offline-storage.ts
│   ├── sync-queue.ts
│   ├── background-sync.ts
│   ├── error-handling.ts
│   └── i18n.ts                     # Phase 5A
├── stores/
│   ├── app-store.ts
│   ├── ui-store.ts
│   └── sync-store.ts
├── hooks/
│   ├── useObjectStack.ts
│   ├── useAppDiscovery.ts
│   ├── useOfflineSync.ts
│   ├── useNetworkStatus.ts
│   ├── useBatchOperations.ts
│   ├── useViewStorage.ts
│   ├── useQueryBuilder.ts
│   ├── usePermissions.ts           # Phase 4B
│   └── useWorkflowState.ts         # Phase 4B
├── global.css
├── tailwind.config.js
├── app.config.ts
└── eas.json
```

---

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Framework** | Expo SDK 54 (Managed) | Fastest iteration; EAS Build for native modules |
| **Navigation** | Expo Router v6 | File-based routing; deep linking; type-safe |
| **Styling** | NativeWind v4 | Tailwind-in-RN; consistent with web ObjectUI themes |
| **State** | Zustand | Lightweight; great for cross-component state |
| **Server State** | `@objectstack/client-react` | Protocol-aligned hooks; replaces raw TanStack Query |
| **Auth** | better-auth + `@better-auth/expo` | Already integrated; secure token storage |
| **Offline Storage** | expo-sqlite | Local-first; matches ObjectStack's local-first philosophy |
| **Lists** | FlashList | Performant virtualized lists for large datasets |
| **Charts** | react-native-svg + victory-native | Lightweight; customizable charting |
| **i18n** | i18next + expo-localization | Industry standard; ObjectOS i18n compatible |
| **Testing** | Jest + RNTL + Maestro | Unit + integration + E2E coverage |
| **CI/CD** | GitHub Actions + EAS | Automated builds, tests, and OTA updates |

---

## Release Plan

```
时间线（基于 SDK 依赖的双轨并行策略）：

          ┌─ Phase 4A (2-3w) ─┐ ┌─ Phase 5A (2-3w) ─┐ ┌ Phase 6 (2-3w) ┐
Mobile:   ████████████████████ → █████████████████████ → █████████████████
                                                                          
Upstream: ██████████████████████████ (Gap 1-5: ~6-9w)                     
SDK Dev:  ├─ views ─┤                                                     
          ├────── permissions ──────┤                                      
          ├────── workflows ────────┤                                      
          ├──────── realtime ──────────────┤                               
          ├──── notifications ─────┤                                       
                                                                          
          ┌────────────── Phase 4B (3-4w) ──────────────┐                 
Mobile:                    ██████████████████████████████ → (merge to v1.0)
(after SDK)                                                               
          ┌──────── Phase 5B (3-4w) ────────┐                             
          ████████████████████████████████████                             
```

| Milestone | Content | Prerequisites | 预估时间 |
|-----------|---------|---------------|---------|
| **v0.4-alpha** | Phase 4A：渲染引擎补全 + 文件功能 + 图表 + 高级视图 + 安全 | 无（现有 SDK 即可） | 2–3 周 |
| **v0.5-alpha** | Phase 5A：i18n 框架 + 性能优化 + 测试 + CI/CD | 无 | 2–3 周 |
| **v0.6-beta** | Phase 4B：权限 + 工作流 + 实时 + 推送通知 | ⛔ SDK Gap 1-5 完成 | 3–4 周 |
| **v0.7-beta** | Phase 5B：AI 集成 + 服务端 i18n + SDK hooks 升级 | ⛔ SDK Gap 6/9/7/8/10/11 | 3–4 周 |
| **v1.0-GA** | Phase 6：监控 + 分析 + 最终优化 | Phase 4A+5A 完成 | 2–3 周 |

### 关键路径

- **Mobile 独立开发**（4A → 5A → 6）：~6–9 周，**可立即开始**
- **等待 SDK 后开发**（4B + 5B）：~6–8 周，在上游 SDK 就绪后启动
- **总计到 v1.0 GA**：~12–17 周（取决于 SDK 上游交付节奏）

---

## Key Protocol Alignment

| Protocol Layer | Mobile Implementation | SDK 状态 |
|---------------|----------------------|---------|
| **ObjectQL — Objects** | `client.meta.getObject()` → form fields + list columns | ✅ Available |
| **ObjectQL — Fields** | `FieldRenderer` with type-specific native components | ✅ Available |
| **ObjectQL — Queries** | `client.data.find()` with filter AST, sort, pagination | ✅ Available |
| **ObjectQL — State Machine** | Workflow state badges + transition actions | ⛔ Needs `client.workflows.*` |
| **ObjectUI — Views** | `ViewRenderer` — list, form, detail, dashboard, kanban, calendar | ✅ Available |
| **ObjectUI — Layout DSL** | `FormViewRenderer` for sections, rows, columns, tabs | ✅ Available |
| **ObjectUI — Actions** | `ActionExecutor` — navigate, create, update, delete, callFlow | ✅ Available |
| **ObjectUI — Dashboards** | `DashboardViewRenderer` with widget grid | ✅ Available |
| **ObjectOS — Auth** | better-auth token → `ObjectStackClient` | ✅ Available |
| **ObjectOS — Permissions** | UI-level enforcement via `usePermissions()` | ⛔ Needs `client.permissions.*` |
| **ObjectOS — Real-Time** | WebSocket subscription for live updates | ⛔ Needs `client.realtime.*` |
| **ObjectOS — i18n** | Labels + formatting localized per ObjectOS standard | ⛔ Needs `client.i18n.*` |
| **ObjectOS — Storage** | File upload/download via `client.storage.*` | ✅ Available |
| **ObjectOS — Analytics** | Charts + dashboards via `client.analytics.*` | ✅ Available |
| **ObjectOS — Automation** | Flow triggers via `client.automation.trigger()` | ✅ Available |
| **ObjectOS — HTTP Protocol** | REST API via `@objectstack/client`, error code contract | ✅ Available |

---

*This document is a living plan. Last restructured on 2026-02-08 based on SDK Gap Analysis. See [SDK-GAP-ANALYSIS.md](./SDK-GAP-ANALYSIS.md) for detailed API requirements.*
