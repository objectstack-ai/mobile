# ObjectStack Mobile — Development Roadmap

> **Version**: 1.0 · **Last Updated**: February 2026
>
> Comprehensive development plan for the ObjectStack Mobile client, aligned with the [@objectstack/spec](https://github.com/objectstack-ai/spec) protocol.

---

## Table of Contents

1. [Vision & Positioning](#vision--positioning)
2. [Current State](#current-state)
3. [Architecture Overview](#architecture-overview)
4. [Development Phases](#development-phases)
   - [Phase 0 — Foundation Consolidation](#phase-0--foundation-consolidation)
   - [Phase 1 — SDK Integration](#phase-1--sdk-integration)
   - [Phase 2 — ObjectUI Rendering Engine](#phase-2--objectui-rendering-engine)
   - [Phase 3 — ObjectQL Data Layer](#phase-3--objectql-data-layer)
   - [Phase 4 — ObjectOS System Integration](#phase-4--objectos-system-integration)
   - [Phase 5 — Advanced Features](#phase-5--advanced-features)
   - [Phase 6 — Production Readiness](#phase-6--production-readiness)
5. [Target Project Structure](#target-project-structure)
6. [Technology Decisions](#technology-decisions)
7. [Release Plan](#release-plan)

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

## Current State

### What Exists

| Area | Status | Details |
|------|--------|---------|
| **Framework** | ✅ Done | Expo SDK 54, Expo Router, TypeScript strict |
| **Styling** | ✅ Done | NativeWind v4 + CSS variable design tokens (light/dark) |
| **UI Primitives** | ✅ Done | Button, Card, Input (shadcn/ui pattern in `components/ui/`) |
| **Authentication** | ✅ Done | better-auth with `@better-auth/expo`, email + social sign-in |
| **Navigation** | ✅ Done | Tab layout (Home, Apps, Notifications, Profile) + Auth stack |
| **State Management** | ✅ Done | Zustand (installed), TanStack Query (configured) |
| **Dashboard** | ✅ Done | Static metadata-driven card rendering (proof of concept) |

### What Is Missing

| Area | Priority | Description |
|------|----------|-------------|
| **ObjectStack SDK** | 🔴 Critical | `@objectstack/client` and `@objectstack/client-react` not integrated |
| **Metadata-driven UI** | 🔴 Critical | No ObjectUI rendering engine; screens are hardcoded |
| **Data Operations** | 🔴 Critical | No CRUD operations against ObjectStack server |
| **Offline Support** | 🟡 High | No local-first data layer or sync mechanism |
| **View Rendering** | 🟡 High | No list/form/detail/dashboard view renderers |
| **i18n** | 🟡 High | No internationalization support |
| **Push Notifications** | 🟡 High | Notifications tab is a placeholder |
| **Testing** | 🟡 High | No test infrastructure |
| **CI/CD** | 🟡 High | No build pipelines or OTA updates |

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
│  │   client.meta.*   client.data.*   client.views.*         │  │
│  │                                                           │  │
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

## Development Phases

### Phase 0 — Foundation Consolidation

> **Goal**: Solidify the project base, establish development standards, and prepare for SDK integration.
>
> **Duration**: 1–2 weeks

#### 0.1 Development Environment

- [ ] Set up ESLint + Prettier with project conventions
- [ ] Configure Jest with React Native Testing Library
- [ ] Add Husky pre-commit hooks (lint + type-check)
- [ ] Set up GitHub Actions CI (type-check, lint, test)

#### 0.2 Project Configuration

- [ ] Create `.env.example` with required environment variables (`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_APP_SCHEME`)
- [ ] Configure EAS Build profiles (development, preview, production)
- [ ] Set up EAS Update for OTA updates
- [ ] Configure `app.config.ts` for dynamic app configuration

#### 0.3 Expand UI Primitives

- [ ] Add remaining shadcn/ui-pattern components: `Badge`, `Avatar`, `Switch`, `Checkbox`, `Select`, `Tabs`, `Dialog`, `BottomSheet`, `Toast`, `Skeleton`
- [ ] Create `EmptyState` and `ErrorBoundary` components
- [ ] Build `SearchBar` component with debounced input
- [ ] Implement `PullToRefresh` wrapper component
- [ ] Add `InfiniteScrollList` component (FlatList-based)

#### 0.4 Navigation Enhancement

- [ ] Add deep linking configuration for `objectstack://` scheme
- [ ] Implement nested stack navigators inside each tab for drill-down
- [ ] Add modal presentation routes for create/edit forms

---

### Phase 1 — SDK Integration

> **Goal**: Integrate `@objectstack/client` and `@objectstack/client-react` as the primary data layer.
>
> **Duration**: 2–3 weeks

#### 1.1 Install and Configure SDK

- [ ] Install `@objectstack/client` and `@objectstack/client-react`
- [ ] Create `lib/objectstack.ts` — client initialization with auth token injection
- [ ] Wrap app root with `ObjectStackProvider` in `app/_layout.tsx`
- [ ] Implement token bridge between `better-auth` session and `ObjectStackClient`

```typescript
// lib/objectstack.ts
import { ObjectStackClient } from '@objectstack/client';

export function createObjectStackClient(token?: string) {
  return new ObjectStackClient({
    baseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
    token,
  });
}
```

#### 1.2 Metadata Layer

- [ ] Implement `useObject()` hook integration for fetching object schemas
- [ ] Implement `useView()` hook for fetching view configurations
- [ ] Implement `useFields()` hook for retrieving field definitions
- [ ] Build metadata caching with `react-native-mmkv` for ETag persistence (reserve `expo-secure-store` for auth tokens only)
- [ ] Create `lib/metadata-cache.ts` for offline metadata storage

#### 1.3 Data Layer

- [ ] Wire up `useQuery()` for data fetching on list screens
- [ ] Wire up `useMutation()` for create/update/delete operations
- [ ] Wire up `usePagination()` for paginated list views
- [ ] Wire up `useInfiniteQuery()` for infinite scroll lists
- [ ] Implement optimistic updates for common operations
- [ ] Create standardized error handling with user-facing error messages

#### 1.4 App Discovery

- [ ] Implement app manifest fetching via `client.connect()`
- [ ] Build app launcher on the "Apps" tab using fetched manifests
- [ ] Create dynamic route `app/(app)/[appName]/index.tsx` for each app

---

### Phase 2 — ObjectUI Rendering Engine

> **Goal**: Build a metadata-driven rendering engine that interprets ObjectUI schemas and renders native mobile components.
>
> **Duration**: 4–6 weeks

#### 2.1 View Renderer Architecture

- [x] Create `components/renderers/` directory structure
- [x] Build `ViewRenderer` — top-level dispatcher that routes to the correct view type renderer
- [x] Implement view-type-to-renderer mapping registry

```typescript
// components/renderers/ViewRenderer.tsx
const rendererMap = {
  list: ListViewRenderer,
  form: FormViewRenderer,
  detail: DetailViewRenderer,
  dashboard: DashboardViewRenderer,
  kanban: KanbanViewRenderer,
  calendar: CalendarViewRenderer,
};
```

#### 2.2 List View Renderer

- [x] Render columns from view metadata as a mobile-optimized list
- [x] Support field type formatting (text, number, date, currency, boolean, lookup)
- [x] Implement column-based sorting via header taps
- [ ] Add filter drawer with dynamic filter UI from field definitions
- [x] Implement pull-to-refresh and infinite scroll
- [ ] Add swipe actions (edit, delete) per row
- [ ] Support row selection (single/multi) for batch operations

#### 2.3 Form View Renderer

- [x] Build `FieldRenderer` that maps ObjectQL field types to native input components:
  - `text` → TextInput
  - `number` / `currency` / `percent` → Numeric TextInput
  - `boolean` → Switch
  - `date` / `datetime` → DateTimePicker
  - `select` → Picker / BottomSheet selector
  - `lookup` → Search + select modal
  - `textarea` → Multi-line TextInput
  - `url` / `email` / `phone` → Typed TextInput with keyboard hints
  - `image` / `file` → File picker with preview
- [x] Implement layout DSL rendering (sections, rows, columns, tabs)
- [x] Apply validation rules from field metadata (required, minLength, maxLength, pattern)
- [x] Support conditional field visibility based on form state
- [x] Wire up form submission to `useMutation()`

#### 2.4 Detail View Renderer

- [x] Render record detail as a read-only form with sections
- [x] Support related lists (child records) display
- [x] Add action bar with edit/delete/custom actions
- [ ] Implement record navigation (previous/next)

#### 2.5 Dashboard View Renderer

- [x] Evolve current static dashboard into a metadata-driven one
- [x] Support dashboard widget types: card, chart, list, metric
- [ ] Implement widget layout grid (responsive)
- [ ] Wire widgets to live data queries

#### 2.6 Action System

- [x] Implement ObjectUI Action protocol (`navigate`, `create`, `update`, `delete`, `callFlow`, `openUrl`)
- [x] Build action executor that handles each action type
- [x] Support toolbar actions, row actions, and floating action buttons
- [x] Wire up button/action taps to the action executor

---

### Phase 3 — ObjectQL Data Layer

> **Goal**: Implement advanced data features including offline support, real-time sync, and complex queries.
>
> **Duration**: 3–4 weeks

#### 3.1 Advanced Query Support

- [ ] Build a query builder UI for user-created filters
- [ ] Support ObjectQL filter AST syntax (`['field', 'op', 'value']`)
- [ ] Implement compound filters (AND/OR groups)
- [ ] Add global search with full-text filtering across objects
- [ ] Support field selection (projections) for optimized payloads

#### 3.2 Offline-First Architecture

- [ ] Integrate `expo-sqlite` as local storage backend
- [ ] Design local schema migration strategy based on object metadata
- [ ] Implement write-ahead sync queue for offline mutations
- [ ] Build conflict resolution UI (last-write-wins with manual override option)
- [ ] Add network status detection and offline indicator
- [ ] Implement background sync with expo-background-fetch

#### 3.3 Batch Operations

- [ ] Support batch create/update/delete via `client.data.batch()`
- [ ] Build multi-select UI in list views for bulk actions
- [ ] Implement progress indicator for batch operations
- [ ] Handle partial failure scenarios with user notification

#### 3.4 View Storage

- [ ] Integrate `client.views.*` for saving custom user views
- [ ] Build "Save View" UI (name, visibility, filters, sort, columns)
- [ ] Display saved views as tabs/chips above list views
- [ ] Support sharing views between users

---

### Phase 4 — ObjectOS System Integration

> **Goal**: Integrate ObjectOS system capabilities including permissions, workflows, and real-time features.
>
> **Duration**: 3–4 weeks

#### 4.1 Permission System

- [ ] Fetch and enforce object-level permissions (read, create, edit, delete)
- [ ] Fetch and enforce field-level permissions (visible, editable, read-only)
- [ ] Conditionally render UI elements based on user permissions
- [ ] Hide/disable actions the user doesn't have permission for

#### 4.2 Workflow & Automation

- [ ] Display workflow state on records (state-machine visualization)
- [ ] Render available state transitions as actionable buttons
- [ ] Implement approval flow UI (approve/reject with comments)
- [ ] Support triggering flows via `callFlow` action

#### 4.3 Real-Time

- [ ] Implement WebSocket connection to ObjectStack server
- [ ] Subscribe to record change events for live updates
- [ ] Add real-time notification delivery
- [ ] Implement collaborative indicators (who is viewing/editing)

#### 4.4 Push Notifications

- [ ] Configure `expo-notifications` with push token registration
- [ ] Implement notification categories and handling
- [ ] Build notification list UI with read/unread states
- [ ] Deep link from notifications to relevant records/views
- [ ] Support notification preferences per object/event type

---

### Phase 5 — Advanced Features

> **Goal**: Implement differentiating features including AI integration, multi-language, and advanced visualizations.
>
> **Duration**: 4–6 weeks

#### 5.1 AI Agent Integration

- [ ] Build conversational AI interface for natural language queries
- [ ] Support AI-powered record creation via voice/text
- [ ] Implement smart search with AI suggestions
- [ ] Display AI-generated insights on dashboards

#### 5.2 Internationalization (i18n)

- [ ] Integrate `expo-localization` + i18n library (e.g., `i18next`)
- [ ] Implement ObjectOS i18n standard for label translation
- [ ] Support RTL layout for Arabic/Hebrew
- [ ] Localize date, number, and currency formatting
- [ ] Allow user language preference selection

#### 5.3 Advanced Visualizations

- [ ] Add Kanban board view renderer (drag-and-drop columns)
- [ ] Add Calendar view renderer with event display
- [ ] Add Chart view renderer (bar, line, pie, funnel)
- [ ] Add Timeline view for activity history
- [ ] Add Map view for geolocation data

#### 5.4 File & Media

- [ ] Implement file upload with `expo-image-picker` and `expo-document-picker`
- [ ] Build image preview and gallery component
- [ ] Support file attachment on records
- [ ] Add camera capture integration
- [ ] Implement file download and sharing

#### 5.5 Biometric & Security

- [ ] Add biometric authentication (Face ID / fingerprint) via `expo-local-authentication`
- [ ] Implement app lock screen after background timeout
- [ ] Add session management (view active sessions, remote logout)
- [ ] Implement certificate pinning for API communication

---

### Phase 6 — Production Readiness

> **Goal**: Performance optimization, comprehensive testing, and deployment infrastructure.
>
> **Duration**: 3–4 weeks

#### 6.1 Performance

- [ ] Implement list virtualization with `FlashList` for large datasets
- [ ] Add image caching and lazy loading
- [ ] Optimize bundle size with tree shaking analysis
- [ ] Implement route-based code splitting
- [ ] Profile and fix memory leaks
- [ ] Add performance monitoring (Sentry, or similar)

#### 6.2 Testing

- [ ] Write unit tests for all renderers and utility functions
- [ ] Write integration tests for data hooks (with MSW mocking via `@objectstack/plugin-msw`)
- [ ] Set up E2E testing with Maestro or Detox
- [ ] Add snapshot tests for UI components
- [ ] Achieve ≥80% code coverage target

#### 6.3 CI/CD Pipeline

- [ ] Configure GitHub Actions for PR checks (type-check, lint, test)
- [ ] Set up EAS Build for automated builds (iOS + Android)
- [ ] Configure EAS Update for OTA updates on preview/production
- [ ] Set up App Store and Google Play deployment via EAS Submit
- [ ] Add release versioning automation (changesets or standard-version)

#### 6.4 Monitoring & Analytics

- [ ] Integrate crash reporting (Sentry)
- [ ] Add analytics for screen views and key user actions
- [ ] Implement feature flags for gradual rollouts
- [ ] Add remote configuration support

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
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── Avatar.tsx
│   │   ├── Switch.tsx
│   │   ├── Select.tsx
│   │   ├── Dialog.tsx
│   │   ├── BottomSheet.tsx
│   │   ├── Toast.tsx
│   │   ├── Skeleton.tsx
│   │   └── ...
│   ├── renderers/                  # ObjectUI rendering engine
│   │   ├── ViewRenderer.tsx        # Top-level view dispatcher
│   │   ├── ListViewRenderer.tsx
│   │   ├── FormViewRenderer.tsx
│   │   ├── DetailViewRenderer.tsx
│   │   ├── DashboardViewRenderer.tsx
│   │   ├── KanbanViewRenderer.tsx
│   │   ├── CalendarViewRenderer.tsx
│   │   ├── ChartViewRenderer.tsx
│   │   └── fields/                 # Field-type renderers
│   │       ├── FieldRenderer.tsx   # Field type dispatcher
│   │       ├── TextField.tsx
│   │       ├── NumberField.tsx
│   │       ├── BooleanField.tsx
│   │       ├── DateField.tsx
│   │       ├── SelectField.tsx
│   │       ├── LookupField.tsx
│   │       ├── FileField.tsx
│   │       └── ...
│   ├── actions/                    # Action system
│   │   ├── ActionExecutor.ts
│   │   ├── ActionBar.tsx
│   │   └── FloatingActionButton.tsx
│   └── common/                     # Shared components
│       ├── EmptyState.tsx
│       ├── ErrorBoundary.tsx
│       ├── SearchBar.tsx
│       ├── PullToRefresh.tsx
│       ├── InfiniteScrollList.tsx
│       ├── OfflineIndicator.tsx
│       └── LoadingScreen.tsx
├── lib/
│   ├── utils.ts                    # cn() utility
│   ├── auth-client.ts              # better-auth client
│   ├── objectstack.ts              # ObjectStack client initialization
│   ├── metadata-cache.ts           # Offline metadata storage
│   └── i18n.ts                     # Internationalization setup
├── stores/
│   ├── app-store.ts                # Global app state (Zustand)
│   ├── ui-store.ts                 # UI state (theme, locale)
│   └── sync-store.ts               # Offline sync queue state
├── hooks/
│   ├── useObjectStack.ts           # Client access hook
│   ├── usePermissions.ts           # Permission-aware hook
│   ├── useOfflineSync.ts           # Offline sync management
│   └── useNetworkStatus.ts         # Network connectivity
├── global.css                      # Design tokens (light/dark)
├── tailwind.config.js
├── app.config.ts                   # Dynamic Expo config
└── eas.json                        # EAS Build profiles
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

| Milestone | Target | Deliverables |
|-----------|--------|-------------|
| **v0.1 — Alpha** | Phase 0 + 1 | SDK integrated, app discovery, basic data fetching |
| **v0.2 — Alpha** | Phase 2 | List/Form/Detail view renderers, action system |
| **v0.3 — Beta** | Phase 3 | Offline support, batch operations, saved views |
| **v0.4 — Beta** | Phase 4 | Permissions, workflows, push notifications, real-time |
| **v0.5 — RC** | Phase 5 | AI, i18n, advanced views (kanban, calendar, charts) |
| **v1.0 — GA** | Phase 6 | Production-ready, full test coverage, CI/CD, monitoring |

---

## Key Protocol Alignment

This roadmap ensures the mobile client implements the complete ObjectStack protocol surface:

| Protocol Layer | Mobile Implementation |
|---------------|----------------------|
| **ObjectQL — Objects** | Fetched via `client.meta.getObject()`, drives form fields and list columns |
| **ObjectQL — Fields** | Rendered by `FieldRenderer` with type-specific native components |
| **ObjectQL — Queries** | Executed via `client.data.find()` with filter AST, sort, pagination |
| **ObjectQL — State Machine** | Displayed as workflow state badges with transition actions |
| **ObjectUI — Views** | Rendered by `ViewRenderer` — list, form, detail, dashboard, kanban, calendar |
| **ObjectUI — Layout DSL** | Interpreted by `FormViewRenderer` for sections, rows, columns, tabs |
| **ObjectUI — Actions** | Executed by `ActionExecutor` — navigate, create, update, delete, callFlow |
| **ObjectUI — Dashboards** | Rendered by `DashboardViewRenderer` with widget grid layout |
| **ObjectOS — Auth** | Handled by better-auth; token passed to `ObjectStackClient` |
| **ObjectOS — Permissions** | Enforced at UI level via `usePermissions()` hook |
| **ObjectOS — Real-Time** | WebSocket subscription for live record updates and notifications |
| **ObjectOS — i18n** | Labels and formatting localized per ObjectOS i18n standard |
| **ObjectOS — HTTP Protocol** | REST API via `@objectstack/client`, follows error code contract |

---

*This document is a living plan. It will be updated as the ObjectStack protocol evolves and as development progresses.*
