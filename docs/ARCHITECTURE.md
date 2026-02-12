# ObjectStack Mobile — Architecture Design Document

> **Version**: 1.0 · **Last Updated**: 2026-02-08
>
> Complete system architecture specification for the ObjectStack Mobile client.

---

## Table of Contents

1. [Overview](#overview)
2. [Design Philosophy](#design-philosophy)
3. [System Architecture](#system-architecture)
4. [Layer Architecture](#layer-architecture)
5. [Navigation Architecture](#navigation-architecture)
6. [Rendering Engine](#rendering-engine)
7. [State Management](#state-management)
8. [Data Flow](#data-flow)
9. [Offline Architecture](#offline-architecture)
10. [Provider Hierarchy](#provider-hierarchy)
11. [Module Dependency Graph](#module-dependency-graph)
12. [Key Design Decisions](#key-design-decisions)

---

## Overview

ObjectStack Mobile is the **native mobile runtime** for the ObjectStack enterprise platform. It functions as a **metadata-driven runtime** that interprets ObjectUI metadata (Views, Forms, Dashboards, Actions) fetched from an ObjectStack server and renders them as native mobile components.

### Core Characteristics

| Characteristic | Description |
|---------------|-------------|
| **Metadata-driven** | No hardcoded business logic; all UI is driven by server metadata |
| **Offline-first** | Full CRUD capabilities offline with background sync |
| **Protocol-aligned** | Mirrors the ObjectStack three-layer protocol stack (ObjectQL / ObjectOS / ObjectUI) |
| **Cross-platform** | Single codebase for iOS, Android, and Web via Expo |

---

## Design Philosophy

### 1. Metadata Over Code

The mobile client does **not** contain any application-specific business logic. Instead:

- **Views** are defined by ObjectUI metadata and rendered by a pluggable `ViewRenderer`.
- **Forms** are generated from field definitions with layout DSL support.
- **Actions** are declared in metadata and executed by `ActionExecutor`.
- **Dashboards** are composed from widget metadata with data-driven rendering.

### 2. Offline-First

All data operations go through a local-first pipeline:

```
User Action → Local SQLite → UI Update → Sync Queue → Server
```

This guarantees instant UI responsiveness regardless of network conditions.

### 3. Layered Abstraction

Each layer has a clear responsibility boundary:

```
Presentation  →  Renderers interpret metadata, render native components
Data Hooks    →  React hooks abstract SDK calls and caching
SDK Client    →  @objectstack/client handles HTTP, auth, serialization
Offline       →  SQLite + sync queue handle persistence and conflict resolution
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ObjectStack Mobile                           │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Expo Router (Navigation)                   │  │
│  │   (auth) → sign-in / sign-up                                 │  │
│  │   (tabs) → home / apps / notifications / profile             │  │
│  │   (app)  → [appName] / [objectName] / CRUD views             │  │
│  └─────────────────────────┬─────────────────────────────────────┘  │
│                            │                                        │
│  ┌─────────────────────────▼─────────────────────────────────────┐  │
│  │               ObjectUI Rendering Engine                       │  │
│  │  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌────────────────┐  │  │
│  │  │ ListView │ │ FormView │ │DetailView │ │ DashboardView  │  │  │
│  │  └──────────┘ └──────────┘ └───────────┘ └────────────────┘  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌────────────────┐  │  │
│  │  │ Kanban   │ │ Calendar │ │ Chart     │ │ Timeline / Map │  │  │
│  │  └──────────┘ └──────────┘ └───────────┘ └────────────────┘  │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │ FieldRenderer · ActionBar · FilterDrawer · SwipeableRow │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  └─────────────────────────┬─────────────────────────────────────┘  │
│                            │                                        │
│  ┌─────────────────────────▼─────────────────────────────────────┐  │
│  │                      Hook Layer                               │  │
│  │  ┌──────────────────┐  ┌───────────────────────────────────┐  │  │
│  │  │ @objectstack/    │  │ Custom Hooks                      │  │  │
│  │  │ client-react     │  │  useAppDiscovery · useViewStorage │  │  │
│  │  │  useQuery        │  │  useBatchOperations · useFileUpload│ │  │
│  │  │  useMutation     │  │  useAnalyticsQuery · useOfflineSync│ │  │
│  │  │  usePagination   │  │  useNetworkStatus · useQueryBuilder│ │  │
│  │  │  useInfiniteQuery│  │  useDashboardData                 │  │  │
│  │  └──────────────────┘  └───────────────────────────────────┘  │  │
│  └─────────────────────────┬─────────────────────────────────────┘  │
│                            │                                        │
│  ┌─────────────────────────▼─────────────────────────────────────┐  │
│  │                    State Management                           │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐  │  │
│  │  │ Zustand      │ │ TanStack     │ │ MMKV Metadata Cache  │  │  │
│  │  │ app-store    │ │ React Query  │ │ (ETag-based)         │  │  │
│  │  │ ui-store     │ │ (server      │ │                      │  │  │
│  │  │ sync-store   │ │  state)      │ │                      │  │  │
│  │  └──────────────┘ └──────────────┘ └──────────────────────┘  │  │
│  └─────────────────────────┬─────────────────────────────────────┘  │
│                            │                                        │
│  ┌─────────────────────────▼─────────────────────────────────────┐  │
│  │                  @objectstack/client                          │  │
│  │   client.meta.*  ·  client.data.*  ·  client.storage.*       │  │
│  │   client.automation.*  ·  client.analytics.*                  │  │
│  │   client.packages.*  ·  client.auth.*                         │  │
│  └─────────────────────────┬─────────────────────────────────────┘  │
│                            │                                        │
│  ┌─────────────────────────▼─────────────────────────────────────┐  │
│  │                    Offline Layer                               │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐  │  │
│  │  │ expo-sqlite  │ │ Sync Queue   │ │ Background Sync      │  │  │
│  │  │ (offline     │ │ (write-ahead │ │ (expo-background-    │  │  │
│  │  │  records)    │ │  log)        │ │  fetch)              │  │  │
│  │  └──────────────┘ └──────────────┘ └──────────────────────┘  │  │
│  └─────────────────────────┬─────────────────────────────────────┘  │
│                            │                                        │
│                  HTTP / REST API / WebSocket                        │
│                            │                                        │
└────────────────────────────▼────────────────────────────────────────┘
                     ObjectStack Server
```

---

## Layer Architecture

### Layer 1: Navigation (Expo Router)

File-based routing with three route groups:

| Route Group | Purpose | Auth Required |
|-------------|---------|---------------|
| `(auth)/` | Sign-in, sign-up screens | No |
| `(tabs)/` | Main tab navigation (Home, Apps, Notifications, Profile) | Yes |
| `(app)/` | Dynamic app screens with CRUD views | Yes |

**Dynamic routes** follow the pattern:

```
app/(app)/[appName]/[objectName]/index.tsx    → List view
app/(app)/[appName]/[objectName]/[id].tsx     → Detail view
app/(app)/[appName]/[objectName]/new.tsx      → Create form
app/(app)/[appName]/[objectName]/[id]/edit.tsx → Edit form
```

**Auth guard** is implemented in `_layout.tsx` via `useProtectedRoute()` — if no session exists, the user is redirected to `(auth)/sign-in`.

### Layer 2: Rendering Engine

The rendering engine is a **registry-based dispatcher** pattern:

```typescript
// ViewRenderer.tsx — dispatcher
const rendererMap: Record<string, React.ComponentType<any>> = {
  list:      ListViewRenderer,
  form:      FormViewRenderer,
  detail:    DetailViewRenderer,
  dashboard: DashboardViewRenderer,
  kanban:    KanbanViewRenderer,
  calendar:  CalendarViewRenderer,
  chart:     ChartViewRenderer,
  timeline:  TimelineViewRenderer,
  map:       MapViewRenderer,
};

// Extensible via:
registerRenderer(viewType, component);
```

Each renderer receives typed props and is responsible for:
- Interpreting view metadata (columns, sections, widgets)
- Rendering native UI components
- Handling user interactions (tap, swipe, filter, sort)
- Delegating data operations to hooks

### Layer 3: Data Hooks

Two categories of hooks:

**SDK Hooks** (re-exported from `@objectstack/client-react`):
- `useQuery()`, `useMutation()`, `usePagination()`, `useInfiniteQuery()`
- `useObject()`, `useView()`, `useFields()`, `useMetadata()`
- `useClient()` — access the raw ObjectStack client

**Custom Hooks** (built on top of SDK):
- `useAppDiscovery` — package/app listing
- `useViewStorage` — saved view CRUD
- `useBatchOperations` — multi-record operations
- `useFileUpload` — file upload with progress
- `useAnalyticsQuery` / `useAnalyticsMeta` — analytics data
- `useOfflineSync` — offline sync management
- `useNetworkStatus` — connectivity monitoring
- `useQueryBuilder` — filter construction
- `useDashboardData` — dashboard widget data

### Layer 4: State Management

| Store | Library | Scope |
|-------|---------|-------|
| **App State** | Zustand (`app-store`) | Current app ID, offline mode flag |
| **UI State** | Zustand (`ui-store`) | Theme (light/dark/system) |
| **Sync State** | Zustand (`sync-store`) | Sync status, pending count, conflicts |
| **Server State** | TanStack Query | Remote data caching, refetching, pagination |
| **Metadata Cache** | MMKV (`metadata-cache`) | ETag-based metadata caching with TTL |

### Layer 5: SDK Client

`@objectstack/client@1.1.0` provides the typed HTTP client:

```typescript
// lib/objectstack.ts
export function createObjectStackClient(token?: string): ObjectStackClient {
  return new ObjectStackClient({ baseUrl: API_URL, token });
}
```

The client is created with the auth token from `better-auth` and injected via `ObjectStackProvider` at the root layout.

### Layer 6: Offline Layer

Three components work together:

| Component | File | Responsibility |
|-----------|------|---------------|
| **Offline Storage** | `lib/offline-storage.ts` | SQLite-based local record cache (CRUD) |
| **Sync Queue** | `lib/sync-queue.ts` | Write-ahead log for offline mutations |
| **Background Sync** | `lib/background-sync.ts` | Periodic background drain via `expo-background-fetch` |

---

## Navigation Architecture

```
RootLayout (_layout.tsx)
├── (auth)/_layout.tsx          ← Stack navigator
│   ├── sign-in.tsx
│   └── sign-up.tsx
├── (tabs)/_layout.tsx          ← Tab navigator
│   ├── index.tsx               ← Home
│   ├── apps.tsx                ← App launcher
│   ├── notifications.tsx       ← Notification center
│   └── profile.tsx             ← User profile
└── (app)/_layout.tsx           ← Stack navigator
    └── [appName]/_layout.tsx
        ├── index.tsx           ← App home
        └── [objectName]/
            ├── index.tsx       ← List view
            ├── [id].tsx        ← Detail view
            ├── new.tsx         ← Create form
            └── [id]/edit.tsx   ← Edit form
```

**Deep linking** is supported via the `objectstack://` URL scheme configured in `app.config.ts`.

---

## Rendering Engine

### Registry Pattern

The `ViewRenderer` component acts as a **dispatcher** that routes to the correct renderer based on `viewType`. New renderers can be registered at runtime without modifying the core.

```
ViewRenderer
  ├── viewType="list"      → ListViewRenderer
  ├── viewType="form"      → FormViewRenderer
  ├── viewType="detail"    → DetailViewRenderer
  ├── viewType="dashboard" → DashboardViewRenderer
  ├── viewType="kanban"    → KanbanViewRenderer
  ├── viewType="calendar"  → CalendarViewRenderer
  ├── viewType="chart"     → ChartViewRenderer
  ├── viewType="timeline"  → TimelineViewRenderer
  └── viewType="map"       → MapViewRenderer
```

### Type System

All renderers are coded against well-defined local interfaces (`components/renderers/types.ts`):

- `FieldDefinition` — 55+ field types (text, number, date, lookup, file, etc.)
- `ListViewMeta` — columns, sorting, filtering, selection
- `FormViewMeta` — sections, field layout DSL, conditional visibility
- `DashboardMeta` — widget definitions, spans, chart configs
- `ActionMeta` — action definitions with location constraints
- `ViewMeta` — unified view type discriminator

### Field Renderer

`FieldRenderer` resolves the correct input/display widget based on `FieldType`:

```
FieldRenderer(field: FieldDefinition)
  ├── text / email / url / phone    → TextInput
  ├── textarea / markdown / richtext → MultilineInput
  ├── number / currency / percent    → NumberInput
  ├── date / datetime / time         → DatePicker
  ├── boolean / toggle               → Switch
  ├── select / radio                 → Picker / RadioGroup
  ├── multiselect / checkboxes       → MultiPicker
  ├── lookup / master_detail         → RelationPicker
  ├── image / file / video / audio   → FileField
  ├── location / address             → LocationPicker
  └── ... (55+ types)
```

---

## State Management

### State Flow Diagram

```
┌──────────────────────────────────────────────────────┐
│                    User Interface                     │
│  (Renderers, Common Components, Navigation)           │
└────────────┬───────────────────────────┬─────────────┘
             │                           │
             ▼                           ▼
┌────────────────────┐     ┌────────────────────────┐
│   Zustand Stores   │     │   TanStack React Query │
│                    │     │                        │
│  useAppStore       │     │  Server data cache     │
│  • currentAppId    │     │  • Automatic refetch   │
│  • isOffline       │     │  • Pagination state    │
│                    │     │  • Infinite query cache │
│  useUIStore        │     │                        │
│  • theme           │     │  Integrated via SDK:   │
│                    │     │  useQuery()            │
│  useSyncStore      │     │  useMutation()         │
│  • isSyncing       │     │  usePagination()       │
│  • pendingCount    │     │  useInfiniteQuery()    │
│  • lastSyncedAt    │     │                        │
│  • conflicts       │     │                        │
└────────────────────┘     └────────────────────────┘
```

### Store Responsibilities

| Store | When to Use |
|-------|-------------|
| `useAppStore` | App-level context (which app is selected, offline mode) |
| `useUIStore` | UI preferences (theme mode) |
| `useSyncStore` | Sync status display (badge counts, progress indicators) |
| TanStack Query | Any data from the ObjectStack server (records, metadata, analytics) |
| MMKV Cache | Metadata that rarely changes (object schemas, view definitions) |

---

## Data Flow

### Read Flow (Online)

```
Component → useQuery(object, filter) → @objectstack/client → HTTP GET → Server
                                            ↓
                                     TanStack Query Cache
                                            ↓
                                   Component re-renders
```

### Write Flow (Online)

```
Component → useMutation(object) → @objectstack/client → HTTP POST/PUT → Server
                                            ↓
                                  Invalidate Query Cache
                                            ↓
                                   Component re-renders
```

### Write Flow (Offline)

```
Component → useMutation(object)
              ↓
    ┌─── Network Check ───┐
    │                      │
    ▼ (online)             ▼ (offline)
 HTTP → Server        upsertLocalRecord()
                      enqueueMutation()
                           ↓
                    useSyncStore.setPendingCount()
                           ↓
                   [Background Sync Task]
                           ↓
                   getPendingEntries() → HTTP → Server
                           ↓
                   markCompleted() / markConflict()
```

### Metadata Fetch Flow

```
useObject(name) / useView(object, type)
        ↓
  MMKV Cache Check (isCacheFresh?)
        ↓
  ┌── fresh ──┐  ┌── stale/miss ──┐
  │           │  │                │
  ▼           │  ▼                │
 Return       │  HTTP GET         │
 cached       │  (with ETag)      │
              │       ↓           │
              │  304 Not Modified │
              │  → return cached  │
              │       ↓           │
              │  200 OK           │
              │  → setCachedMetadata()
              │  → return fresh   │
              └───────────────────┘
```

---

## Offline Architecture

### Data Stores

| Store | Technology | Purpose |
|-------|-----------|---------|
| `offline_records` | expo-sqlite | Cached records (JSON blobs, keyed by object+id) |
| `offline_schema_versions` | expo-sqlite | Schema version tracking for migration |
| `sync_queue` | expo-sqlite | Write-ahead log for pending mutations |
| Metadata | react-native-mmkv | Object definitions, view metadata (ETag-cached) |
| Auth tokens | expo-secure-store | Encrypted auth session storage |

### Sync Queue States

```
           enqueue
  ┌──────────────────┐
  │                  ▼
  │            ┌──────────┐
  │            │ pending  │
  │            └────┬─────┘
  │                 │ process
  │                 ▼
  │         ┌─────────────┐
  │         │ in_progress │
  │         └──┬──────┬───┘
  │            │      │
  │    success │      │ error
  │            ▼      ▼
  │      ┌─────────┐ ┌────────┐
  │      │ DELETE  │ │ failed │──── retries < max ──→ pending
  │      │ (done) │ │        │
  │      └────────┘ └───┬────┘
  │                     │ conflict detected
  │                     ▼
  │              ┌───────────┐
  │              │ conflict  │
  │              └─────┬─────┘
  │                    │ user resolves
  └────────────────────┘
```

### Background Sync

- Registered via `expo-background-fetch` + `expo-task-manager`
- Runs every 15 minutes (OS minimum) when device has connectivity
- Drains sync queue in FIFO order
- Detects conflicts via server-side version checking

---

## Provider Hierarchy

```tsx
// app/_layout.tsx
<ObjectStackProvider client={client}>     // SDK context
  <QueryClientProvider client={queryClient}> // TanStack Query
    <SafeAreaProvider>                       // Safe area insets
      <StatusBar style="auto" />
      <Stack>                                // Expo Router
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </SafeAreaProvider>
  </QueryClientProvider>
</ObjectStackProvider>
```

The `ObjectStackProvider` is the outermost data provider, ensuring all child components can access the SDK client via `useClient()`.

---

## Module Dependency Graph

```
app/_layout.tsx
  ├── lib/auth-client.ts          (better-auth session)
  ├── lib/objectstack.ts          (ObjectStackClient factory)
  └── @objectstack/client-react   (ObjectStackProvider)

app/(app)/[appName]/[objectName]/index.tsx
  ├── hooks/useObjectStack.ts     (re-exported SDK hooks)
  ├── components/renderers/ViewRenderer.tsx
  │   └── components/renderers/ListViewRenderer.tsx
  │       ├── components/renderers/SwipeableRow.tsx
  │       ├── components/renderers/FilterDrawer.tsx
  │       └── components/renderers/fields/FieldRenderer.tsx
  └── components/actions/ActionBar.tsx

lib/offline-storage.ts
  └── expo-sqlite

lib/sync-queue.ts
  └── lib/offline-storage.ts (getDatabase)

lib/background-sync.ts
  ├── lib/sync-queue.ts
  ├── lib/offline-storage.ts
  ├── expo-background-fetch
  └── expo-task-manager

lib/metadata-cache.ts
  └── react-native-mmkv

hooks/useAppDiscovery.ts
  └── @objectstack/client-react (useClient)

hooks/useBatchOperations.ts
  └── @objectstack/client-react (useClient)

hooks/useFileUpload.ts
  ├── expo-image-picker
  ├── expo-document-picker
  └── @objectstack/client-react (useClient)

stores/app-store.ts
  └── zustand

stores/sync-store.ts
  ├── zustand
  └── lib/sync-queue.ts (SyncQueueEntry type)
```

---

## Key Design Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | **Framework** | Expo SDK 54 (Managed) | Fastest iteration cycle; EAS Build for native modules; OTA updates |
| 2 | **Navigation** | Expo Router v6 | File-based routing; type-safe; deep linking support |
| 3 | **Styling** | NativeWind v4 | Tailwind-in-RN; consistent with web ObjectUI themes; CSS variable tokens |
| 4 | **Client State** | Zustand | Lightweight (<1KB); no boilerplate; great for cross-component state |
| 5 | **Server State** | @objectstack/client-react | Protocol-aligned hooks; built-in caching via TanStack Query |
| 6 | **Auth** | better-auth + @better-auth/expo | Already integrated; secure token storage via expo-secure-store |
| 7 | **Offline Storage** | expo-sqlite | Local-first; relational queries; matches ObjectStack philosophy |
| 8 | **Metadata Cache** | react-native-mmkv | Sub-millisecond reads; ETag-based invalidation |
| 9 | **View Rendering** | Registry pattern | Open-closed principle; new view types without core changes |
| 10 | **Background Sync** | expo-background-fetch | OS-managed scheduling; battery-efficient |

---

*This document describes the architecture as implemented through Phase 0–3 with Phase 4A enhancements. See [ROADMAP.md](../ROADMAP.md) for future phases and SDK dependencies.*
