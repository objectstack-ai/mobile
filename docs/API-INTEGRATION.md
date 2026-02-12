# ObjectStack Mobile — API Integration Guide

> **Version**: 1.0 · **Last Updated**: 2026-02-08
>
> Complete guide for ObjectStack SDK integration, API usage patterns, and authentication.

---

## Table of Contents

1. [SDK Overview](#sdk-overview)
2. [Client Initialization](#client-initialization)
3. [Authentication](#authentication)
4. [Provider Setup](#provider-setup)
5. [Metadata API](#metadata-api)
6. [Data API](#data-api)
7. [Package API](#package-api)
8. [Storage API](#storage-api)
9. [Analytics API](#analytics-api)
10. [Automation API](#automation-api)
11. [React Hook Usage](#react-hook-usage)
12. [Error Handling](#error-handling)
13. [SDK Gap Workarounds](#sdk-gap-workarounds)

---

## SDK Overview

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@objectstack/client` | `^1.1.0` | Core HTTP client |
| `@objectstack/client-react` | `^1.1.0` | React hooks and provider |
| `better-auth` | `^1.4.18` | Authentication framework |
| `@better-auth/expo` | `^1.4.18` | Expo-specific auth adapter |

### API Surface

```
ObjectStackClient
├── .meta.*           ← Metadata (objects, fields, views)
├── .data.*           ← CRUD operations (query, create, update, delete)
├── .packages.*       ← App/package management
├── .storage.*        ← File upload/download
├── .analytics.*      ← Analytics queries
├── .automation.*     ← Workflow triggers
├── .auth.*           ← Authentication
└── .hub.*            ← Hub/space management
```

---

## Client Initialization

### Factory Function

```typescript
// lib/objectstack.ts
import { ObjectStackClient } from "@objectstack/client";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export function createObjectStackClient(token?: string): ObjectStackClient {
  return new ObjectStackClient({
    baseUrl: API_URL,
    token,
  });
}

// Singleton for unauthenticated requests
export const objectStackClient = new ObjectStackClient({
  baseUrl: API_URL,
});
```

### Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `EXPO_PUBLIC_API_URL` | `http://localhost:3000` | ObjectStack server URL |
| `EXPO_PUBLIC_APP_SCHEME` | `objectstack` | Deep link URL scheme |

### Token Injection

The client is recreated with the auth token whenever the session changes:

```typescript
// app/_layout.tsx
const { data: session } = authClient.useSession();
const token = (session as any)?.token ?? (session as any)?.accessToken;
const client = useMemo(() => createObjectStackClient(token), [token]);
```

---

## Authentication

### Auth Client Setup

```typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8081",
  plugins: [
    expoClient({
      scheme: "objectstack",   // Deep link scheme for OAuth callbacks
      storage: SecureStore,    // Encrypted token storage
    }),
  ],
});
```

### Auth Flow

```
1. User opens app → useProtectedRoute() checks session
2. No session → redirect to (auth)/sign-in
3. User enters credentials → authClient.signIn.email()
4. Token stored in expo-secure-store (encrypted)
5. Client recreated with token → ObjectStackProvider updated
6. User redirected to (tabs)/ main app
```

### Auth Guard

```typescript
// app/_layout.tsx
function useProtectedRoute() {
  const { data: session, isPending } = authClient.useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isPending) return;
    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, isPending, segments]);
}
```

### Session Management

| Operation | Method |
|-----------|--------|
| Sign in (email) | `authClient.signIn.email({ email, password })` |
| Sign up | `authClient.signUp.email({ email, password, name })` |
| Sign out | `authClient.signOut()` |
| Get session | `authClient.useSession()` |
| Social login | `authClient.signIn.social({ provider })` |

---

## Provider Setup

The root layout wraps the app with necessary providers:

```tsx
// app/_layout.tsx
export default function RootLayout() {
  useProtectedRoute();

  const { data: session } = authClient.useSession();
  const token = (session as any)?.token ?? (session as any)?.accessToken;
  const client = useMemo(() => createObjectStackClient(token), [token]);

  return (
    <ObjectStackProvider client={client}>      {/* SDK context */}
      <QueryClientProvider client={queryClient}> {/* TanStack Query */}
        <SafeAreaProvider>                       {/* Safe areas */}
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(app)" />
          </Stack>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ObjectStackProvider>
  );
}
```

### Provider Order (outermost to innermost)

1. `ObjectStackProvider` — SDK client context
2. `QueryClientProvider` — TanStack Query cache
3. `SafeAreaProvider` — Safe area insets
4. `Stack` — Expo Router navigation

---

## Metadata API

### Object Schema

```typescript
// Get object definition (fields, relationships)
const { data: object } = useObject("contacts");
// object.fields: FieldDefinition[]
// object.name, object.label, etc.
```

### View Metadata

```typescript
// Get view for an object
const { data: view } = useView("contacts", "list");
// view.viewType: "list" | "form" | "detail" | "dashboard" | ...
// view.listView: { columns, filter, sort, pagination }
// view.formView: { sections, type }
// view.actions: ActionMeta[]
```

### Field Definitions

```typescript
// Get fields for an object
const { data: fields } = useFields("contacts");
// fields: FieldDefinition[]
// Each field: { name, label, type, required, options, ... }
```

### Generic Metadata

```typescript
// Fetch any metadata type
const { data } = useMetadata("custom_type", "custom_name");
```

### Direct Client Calls

```typescript
const client = useClient();

// List metadata types
const types = await client.meta.getTypes();

// Get items of a type
const items = await client.meta.getItems("object", { cached: true });

// Get single item
const item = await client.meta.getItem("object", "contacts");

// Save metadata
await client.meta.saveItem("view", "contacts_list", viewData);

// ETag-cached fetch
const cached = await client.meta.getCached("contacts", { type: "object" });
```

---

## Data API

### Query (Read)

```typescript
// Simple query with SDK hook
const { data, isLoading, error, refetch } = useQuery("contacts", {
  filter: ["status", "eq", "active"],
  sort: ["-created_at"],
  limit: 20,
  offset: 0,
  fields: ["id", "name", "email", "status"],
});
```

### Pagination

```typescript
// Paginated query
const { data, page, nextPage, prevPage, isLoading } = usePagination("contacts", {
  pageSize: 20,
  filter: ["status", "eq", "active"],
});
```

### Infinite Scroll

```typescript
// Infinite scroll query
const { data, fetchNextPage, hasNextPage, isLoading } = useInfiniteQuery("contacts", {
  pageSize: 20,
});
```

### Mutations (Create / Update / Delete)

```typescript
// CRUD mutations
const { create, update, remove } = useMutation("contacts");

// Create
await create({ name: "John Doe", email: "john@example.com" });

// Update
await update("rec_abc123", { status: "active" });

// Delete
await remove("rec_abc123");
```

### Direct Client Calls

```typescript
const client = useClient();

// Full QueryAST query
const results = await client.data.query("contacts", {
  filter: ["AND", ["status", "eq", "active"], ["amount", "gte", 1000]],
  sort: ["-created_at"],
  limit: 50,
  offset: 0,
  fields: ["id", "name", "status", "amount"],
});

// Simplified find
const records = await client.data.find("contacts", {
  filter: { status: "active" },
  limit: 10,
});

// Get single record
const record = await client.data.get("contacts", "rec_abc123");

// Create
const created = await client.data.create("contacts", {
  name: "Jane Doe",
  email: "jane@example.com",
});

// Batch create
const batchResult = await client.data.createMany("contacts", [
  { name: "User 1" },
  { name: "User 2" },
]);

// Update
const updated = await client.data.update("contacts", "rec_abc123", {
  status: "inactive",
});

// Batch update
await client.data.batch("contacts", {
  updates: [
    { id: "rec_1", data: { status: "active" } },
    { id: "rec_2", data: { status: "active" } },
  ],
});

// Simplified batch update
await client.data.updateMany("contacts", [
  { id: "rec_1", status: "active" },
  { id: "rec_2", status: "active" },
]);

// Delete
await client.data.delete("contacts", "rec_abc123");

// Batch delete
await client.data.deleteMany("contacts", ["rec_1", "rec_2", "rec_3"]);
```

---

## Package API

```typescript
const client = useClient();

// List installed packages (apps)
const { packages } = await client.packages.list({ enabled: true });

// Get specific package
const pkg = await client.packages.get("pkg_abc123");

// Install package
await client.packages.install(manifest);

// Uninstall package
await client.packages.uninstall("pkg_abc123");
```

### App Discovery Hook

```typescript
import { useAppDiscovery } from "~/hooks/useAppDiscovery";

const { apps, isLoading, error, refetch } = useAppDiscovery();
// apps: AppManifest[] — id, name, label, description, icon, version, enabled
```

---

## Storage API

```typescript
const client = useClient();

// Upload file
const result = await client.storage.upload(file);
// result: { id, url, filename, size, mimeType }

// Get download URL
const url = await client.storage.getDownloadUrl(fileId);
```

### File Upload Hook

```typescript
import { useFileUpload } from "~/hooks/useFileUpload";

const { pickImage, pickDocument, upload, isUploading, progress } = useFileUpload();

// Pick image from gallery
const image = await pickImage();

// Pick document
const doc = await pickDocument();

// Upload to server
const result = await upload(image);
```

---

## Analytics API

```typescript
const client = useClient();

// Run analytics query
const data = await client.analytics.query({
  object: "orders",
  measures: [{ field: "amount", aggregate: "sum" }],
  dimensions: ["status"],
  filter: ["created_at", "gte", "2026-01-01"],
});

// Get analytics metadata
const meta = await client.analytics.meta("orders");

// Explain query plan
const explanation = await client.analytics.explain(queryPlan);
```

### Analytics Hooks

```typescript
import { useAnalyticsQuery } from "~/hooks/useAnalyticsQuery";
import { useAnalyticsMeta } from "~/hooks/useAnalyticsMeta";

const { data, isLoading, error } = useAnalyticsQuery({
  object: "orders",
  measures: [{ field: "amount", aggregate: "sum" }],
  dimensions: ["status"],
});

const { meta, isLoading: metaLoading } = useAnalyticsMeta("orders");
```

---

## Automation API

```typescript
const client = useClient();

// Trigger an automation flow
await client.automation.trigger("flow_name", {
  recordId: "rec_abc123",
  action: "approve",
  params: { comment: "Approved by mobile" },
});
```

---

## React Hook Usage

### Re-exported Hooks

All SDK hooks are re-exported via `hooks/useObjectStack.ts` for convenience:

```typescript
// Import from local hooks (preferred)
import { useClient, useQuery, useMutation } from "~/hooks/useObjectStack";

// Available hooks:
// useClient, useQuery, useMutation, usePagination,
// useInfiniteQuery, useObject, useView, useFields, useMetadata
```

### Usage Pattern

```typescript
// Typical list view data loading
function ContactList() {
  const { data: fields } = useFields("contacts");
  const { data: view } = useView("contacts", "list");
  const { data: records, isLoading, fetchNextPage } = useInfiniteQuery("contacts", {
    pageSize: view?.listView?.pagination?.pageSize ?? 20,
    sort: view?.listView?.sort,
  });

  if (isLoading) return <LoadingScreen />;

  return (
    <ViewRenderer
      viewType="list"
      props={{ records, fields, view, onLoadMore: fetchNextPage }}
    />
  );
}
```

---

## Error Handling

### Error Types

```typescript
// lib/error-handling.ts
type ObjectStackErrorCode =
  | "UNAUTHORIZED"      // 401 — Session expired
  | "FORBIDDEN"         // 403 — No permission
  | "NOT_FOUND"         // 404 — Resource not found
  | "VALIDATION_ERROR"  // 422 — Invalid input
  | "CONFLICT"          // 409 — Data conflict
  | "RATE_LIMITED"      // 429 — Too many requests
  | "INTERNAL_ERROR"    // 500 — Server error
  | "NETWORK_ERROR"     // No connectivity
  | "TIMEOUT";          // Request timeout
```

### Error Parsing

```typescript
import { parseError, getUserErrorMessage } from "~/lib/error-handling";

try {
  await client.data.create("contacts", data);
} catch (err) {
  const parsed = parseError(err);
  // parsed: { code, message, details? }

  // User-friendly message
  const message = getUserErrorMessage(err);
  // → "Please check your input and try again."
}
```

### User-Friendly Messages

| Code | Message |
|------|---------|
| `UNAUTHORIZED` | Your session has expired. Please sign in again. |
| `FORBIDDEN` | You don't have permission to perform this action. |
| `NOT_FOUND` | The requested resource was not found. |
| `VALIDATION_ERROR` | Please check your input and try again. |
| `CONFLICT` | A conflict occurred. The data may have been modified by someone else. |
| `RATE_LIMITED` | Too many requests. Please wait a moment and try again. |
| `INTERNAL_ERROR` | Something went wrong on the server. Please try again later. |
| `NETWORK_ERROR` | Unable to connect to the server. Please check your internet connection. |
| `TIMEOUT` | The request timed out. Please try again. |

---

## SDK Gap Workarounds

### Views API (Untyped)

The `client.views.*` API exists at runtime but lacks TypeScript types:

```typescript
// hooks/useViewStorage.ts
function viewsApi() {
  return (client as any).views;
}

// Usage:
const views = await viewsApi().list(objectName);
await viewsApi().save(objectName, viewName, viewData);
await viewsApi().delete(objectName, viewName);
```

**Status**: Workaround using `(client as any).views`. Will be replaced when SDK provides typed API (see [ROADMAP.md](../ROADMAP.md)).

### Missing SDK APIs

The following APIs are not yet available in the SDK and are tracked in [ROADMAP.md](../ROADMAP.md):

| Missing API | Blocker For | Workaround |
|------------|-------------|-----------|
| `client.permissions.*` | Permission-based UI | None (feature blocked) |
| `client.workflows.*` | Workflow/approval UI | None (feature blocked) |
| `client.realtime.*` | Real-time updates | Polling via `refetch` |
| `client.notifications.*` | Push notifications | None (feature blocked) |
| `client.ai.*` | AI/NLQ features | None (feature blocked) |
| `client.i18n.*` | Server translations | Static client-side i18n |

---

*This document covers API integration as of `@objectstack/client@1.1.0`. See [ROADMAP.md](../ROADMAP.md) for gap analysis and [DATA-LAYER.md](./DATA-LAYER.md) for offline data architecture.*
