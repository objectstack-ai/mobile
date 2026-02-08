# ObjectStack Mobile — Data Layer & Offline Architecture

> **Version**: 1.0 · **Last Updated**: 2026-02-08
>
> Technical specification for the data layer, offline-first architecture, and sync strategy.

---

## Table of Contents

1. [Overview](#overview)
2. [Data Layer Stack](#data-layer-stack)
3. [ObjectQL Query Builder](#objectql-query-builder)
4. [Offline Storage](#offline-storage)
5. [Sync Queue](#sync-queue)
6. [Background Sync](#background-sync)
7. [Conflict Resolution](#conflict-resolution)
8. [Metadata Caching](#metadata-caching)
9. [Data Hook Reference](#data-hook-reference)
10. [Performance Considerations](#performance-considerations)

---

## Overview

The ObjectStack Mobile data layer implements an **offline-first architecture** where:

1. All data reads prefer local cache, falling back to server
2. All writes are persisted locally first, then synced to the server
3. Metadata is cached with ETag-based invalidation
4. Background sync ensures eventual consistency

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│   React UI  │────▶│  Data Hooks  │────▶│ ObjectStack   │
│  Components │     │ (useQuery,   │     │ Client SDK    │
│             │◀────│  useMutation)│◀────│               │
└─────────────┘     └──────┬───────┘     └───────┬───────┘
                           │                     │
                    ┌──────▼───────┐     ┌───────▼───────┐
                    │  Zustand     │     │  expo-sqlite   │
                    │  Stores      │     │  (offline DB)  │
                    └──────────────┘     └───────────────┘
```

---

## Data Layer Stack

### Layer Responsibilities

| Layer | Module | Responsibility |
|-------|--------|---------------|
| **SDK Hooks** | `@objectstack/client-react` | Server data fetching, caching, pagination |
| **Custom Hooks** | `hooks/*.ts` | Business logic composition, offline fallback |
| **ObjectStack Client** | `@objectstack/client` | HTTP transport, auth, serialization |
| **Query Builder** | `lib/query-builder.ts` | Filter AST construction and serialization |
| **Offline Storage** | `lib/offline-storage.ts` | SQLite local record cache |
| **Sync Queue** | `lib/sync-queue.ts` | Write-ahead log for mutations |
| **Background Sync** | `lib/background-sync.ts` | Periodic queue drain |
| **Metadata Cache** | `lib/metadata-cache.ts` | MMKV-based metadata caching |
| **State Stores** | `stores/*.ts` | App state, sync state, UI state |

---

## ObjectQL Query Builder

### Filter AST Format

ObjectQL uses a compact array-based AST for filter expressions:

```
Simple filter:   ['field', 'operator', 'value']
Compound filter: ['AND', filter1, filter2, ...]
                 ['OR', filter1, filter2, ...]
```

### Filter Operators

| Operator | Label | Value Count | Applicable Types |
|----------|-------|------------|-----------------|
| `eq` | equals | 1 | All |
| `neq` | not equals | 1 | All |
| `gt` | greater than | 1 | number, date |
| `gte` | greater or equal | 1 | number, date |
| `lt` | less than | 1 | number, date |
| `lte` | less or equal | 1 | number, date |
| `contains` | contains | 1 | text, multiselect |
| `not_contains` | does not contain | 1 | text, multiselect |
| `starts_with` | starts with | 1 | text |
| `ends_with` | ends with | 1 | text |
| `in` | is any of | 1 | text, number, select, lookup |
| `not_in` | is none of | 1 | text, number, select, lookup |
| `is_null` | is empty | 0 | All |
| `is_not_null` | is not empty | 0 | All |
| `between` | is between | 2 | number, date |

### Filter Builder API

```typescript
import {
  createSimpleFilter,
  createCompoundFilter,
  serializeFilterTree,
  operatorsForFieldType,
} from "~/lib/query-builder";

// Create a filter
const filter = createCompoundFilter("AND", [
  createSimpleFilter("status", "eq"),   // → ['status', 'eq', value]
  createSimpleFilter("amount", "gte"),  // → ['amount', 'gte', value]
]);

// Serialize to ObjectQL wire format
const ast = serializeFilterTree(filter);
// → ['AND', ['status', 'eq', 'active'], ['amount', 'gte', 1000]]

// Get valid operators for a field type
const ops = operatorsForFieldType("number");
// → ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'in', 'not_in', 'is_null', 'is_not_null']
```

### Local Filter Types

```typescript
interface SimpleFilter {
  id: string;              // Unique node ID
  field: string;           // Field name
  operator: FilterOperator;
  value: unknown;
  value2?: unknown;        // For 'between' operator
}

interface CompoundFilter {
  id: string;
  logic: "AND" | "OR";
  filters: FilterNode[];
}

type FilterNode = SimpleFilter | CompoundFilter;
```

---

## Offline Storage

### Database Schema

```sql
-- Local record cache
CREATE TABLE offline_records (
  object_name TEXT NOT NULL,
  record_id   TEXT NOT NULL,
  data        TEXT NOT NULL,          -- JSON blob
  updated_at  INTEGER NOT NULL,       -- Unix timestamp (ms)
  PRIMARY KEY (object_name, record_id)
);

-- Schema version tracking
CREATE TABLE offline_schema_versions (
  object_name TEXT PRIMARY KEY,
  version     INTEGER NOT NULL DEFAULT 1,
  fields_json TEXT NOT NULL,          -- JSON field definitions
  updated_at  INTEGER NOT NULL
);
```

### Storage API

| Function | Signature | Description |
|----------|-----------|-------------|
| `getDatabase()` | `() → SQLiteDatabase` | Get/create database singleton (WAL mode) |
| `bootstrapOfflineDatabase()` | `() → void` | Create system tables (call at startup) |
| `upsertLocalRecord()` | `(object, id, data) → void` | Upsert single record |
| `upsertLocalRecords()` | `(object, records[]) → void` | Batch upsert in transaction |
| `getLocalRecord()` | `(object, id) → Record \| null` | Get single cached record |
| `getLocalRecords()` | `(object) → Record[]` | Get all records for an object |
| `deleteLocalRecord()` | `(object, id) → void` | Delete single record |
| `clearLocalRecords()` | `(object) → void` | Clear all records for object |
| `clearAllLocalData()` | `() → void` | Wipe entire offline database |
| `needsSchemaMigration()` | `(object, fieldsJson) → boolean` | Check if schema changed |
| `applySchemaVersion()` | `(object, fieldsJson) → void` | Save new schema version |

### Data Format

Records are stored as JSON blobs, making the schema tolerant of field changes:

```json
{
  "id": "rec_abc123",
  "name": "Acme Corp",
  "status": "active",
  "amount": 50000,
  "created_at": "2026-01-15T10:30:00Z"
}
```

### Database Configuration

- **Engine**: expo-sqlite (SQLite 3)
- **Journal mode**: WAL (Write-Ahead Logging) for concurrent reads/writes
- **Database file**: `objectstack_offline.db`
- **Storage pattern**: Document store (JSON blobs in TEXT columns)

---

## Sync Queue

### Queue Table Schema

```sql
CREATE TABLE sync_queue (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  object_name   TEXT    NOT NULL,
  record_id     TEXT    NOT NULL,
  operation     TEXT    NOT NULL CHECK (operation IN ('create','update','delete')),
  payload       TEXT    NOT NULL DEFAULT '{}',   -- JSON mutation data
  status        TEXT    NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','in_progress','failed','conflict')),
  retries       INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
```

### Queue Entry Lifecycle

```
enqueueMutation()           → status: 'pending'
    ↓
markInProgress(id)          → status: 'in_progress'
    ↓
  ┌─── success ───┐  ┌─── error ────┐  ┌─── conflict ──┐
  ↓                ↓                ↓
markCompleted(id)  markFailed(id)   markConflict(id)
  (DELETE row)       ↓                ↓
               resetEntry(id)    User resolves →
               → back to 'pending'   resetEntry(id)
                                      or discardEntry(id)
```

### Queue API

| Function | Description |
|----------|-------------|
| `bootstrapSyncQueue()` | Create queue table (call at startup) |
| `enqueueMutation(object, id, op, payload)` | Add mutation to queue |
| `getPendingEntries()` | Get pending entries (FIFO order) |
| `getAllQueueEntries()` | Get all entries (for UI display) |
| `getConflictEntries()` | Get entries needing conflict resolution |
| `getPendingCount()` | Count pending + failed entries |
| `markInProgress(id)` | Mark entry as being processed |
| `markCompleted(id)` | Delete entry on success |
| `markFailed(id, error)` | Mark as failed, increment retry count |
| `markConflict(id, error)` | Mark as conflict, need user input |
| `resetEntry(id)` | Reset to pending for retry |
| `discardEntry(id)` | Drop entry (user chose to abandon) |
| `clearSyncQueue()` | Clear entire queue |

### Sync State Store

```typescript
// stores/sync-store.ts
interface SyncState {
  isSyncing: boolean;      // Is a sync cycle running?
  pendingCount: number;    // Badge count for UI
  lastSyncedAt: number | null;  // Last successful sync timestamp
  conflicts: SyncQueueEntry[];  // Entries needing user resolution
}
```

---

## Background Sync

### Task Registration

```typescript
// lib/background-sync.ts
const BACKGROUND_SYNC_TASK = "objectstack-background-sync";

// Registered via expo-task-manager
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  // 1. Check connectivity
  // 2. Get pending entries
  // 3. Signal OS there is work to do
  // 4. Foreground sync hook drains on next launch
});

// Register at app startup
await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
  minimumInterval: 15 * 60,  // 15 minutes (OS minimum)
  stopOnTerminate: false,
  startOnBoot: true,
});
```

### Sync Strategy

```
App Launch
    ↓
bootstrapOfflineDatabase()
bootstrapSyncQueue()
registerBackgroundSync()
    ↓
useOfflineSync() hook activates
    ↓
┌── Online? ──┐
│             │
▼ Yes         ▼ No
│             │
│  Drain      │  Queue mutations
│  sync queue │  locally
│  (FIFO)     │
│             │
│  For each entry:
│    1. markInProgress
│    2. Send to server
│    3. markCompleted / markFailed / markConflict
│             │
└─────────────┘
    ↓
Background task periodically wakes
    ↓
Check connectivity → drain if online
```

### Error Handling in Sync

| Error Type | Action |
|-----------|--------|
| Network error | Leave as `pending`, retry next cycle |
| 4xx Validation | Mark `failed`, increment retries |
| 409 Conflict | Mark `conflict`, show in UI |
| 5xx Server | Mark `failed`, retry with backoff |
| Max retries exceeded | Mark `failed`, require manual action |

---

## Conflict Resolution

### Detection

Conflicts are detected when the server returns a `409 Conflict` response, indicating the record was modified since the client last fetched it.

### Resolution UI

The `ConflictResolutionDialog` (`components/sync/ConflictResolutionDialog.tsx`) presents:

```
┌──────────────────────────────────┐
│  Conflict Detected               │
│                                  │
│  This record was modified by     │
│  someone else since your change. │
│                                  │
│  ┌──────────┐ ┌──────────────┐   │
│  │ Your     │ │ Server       │   │
│  │ Version  │ │ Version      │   │
│  │          │ │              │   │
│  │ field: A │ │ field: B     │   │
│  └──────────┘ └──────────────┘   │
│                                  │
│  [Keep Mine] [Keep Theirs] [Skip]│
└──────────────────────────────────┘
```

### Resolution Options

| Option | Action |
|--------|--------|
| **Keep Mine** | Force-push local changes (overwrite server) |
| **Keep Theirs** | Discard local changes (accept server version) |
| **Skip** | Leave in conflict state for later resolution |

---

## Metadata Caching

### Cache Storage

Uses `react-native-mmkv` for sub-millisecond key-value access:

```typescript
// lib/metadata-cache.ts
const storage = createMMKV({ id: "objectstack-metadata" });

interface CacheEntry {
  data: unknown;
  etag?: string;
  timestamp: number;
}
```

### Cache TTL

Default TTL: **5 minutes**. After expiration, the next access triggers a conditional request with the stored ETag.

### Cache API

| Function | Description |
|----------|-------------|
| `getCachedMetadata(key)` | Get cached entry |
| `setCachedMetadata(key, data, etag?)` | Store entry with optional ETag |
| `isCacheFresh(key, ttl?)` | Check if entry is within TTL |
| `getCachedETag(key)` | Get stored ETag for conditional request |
| `clearMetadataCache()` | Clear all cached metadata |
| `removeCachedMetadata(key)` | Remove specific entry |

### ETag-Based Invalidation Flow

```
1. Client requests metadata
2. Cache hit + fresh → return cached
3. Cache hit + stale → send request with If-None-Match: <etag>
   a. 304 Not Modified → refresh TTL, return cached
   b. 200 OK → update cache with new data + etag
4. Cache miss → send request without etag
   → store response in cache
```

---

## Data Hook Reference

### SDK Hooks (from `@objectstack/client-react`)

| Hook | Purpose | Returns |
|------|---------|---------|
| `useClient()` | Access raw ObjectStack client | `ObjectStackClient` |
| `useQuery(object, options?)` | Fetch records with filters | `{ data, isLoading, error, refetch }` |
| `useMutation(object)` | Create/update/delete mutations | `{ create, update, remove }` |
| `usePagination(object, options?)` | Paginated record fetching | `{ data, page, nextPage, prevPage }` |
| `useInfiniteQuery(object, options?)` | Infinite scroll loading | `{ data, fetchNextPage, hasNextPage }` |
| `useObject(name)` | Fetch object schema | `{ data: ObjectDefinition }` |
| `useView(object, type?)` | Fetch view metadata | `{ data: ViewMeta }` |
| `useFields(object)` | Fetch field definitions | `{ data: FieldDefinition[] }` |
| `useMetadata(type, name)` | Generic metadata fetch | `{ data }` |

### Custom Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useAppDiscovery()` | `hooks/useAppDiscovery.ts` | Discover installed apps via `client.packages.list()` |
| `useViewStorage()` | `hooks/useViewStorage.ts` | CRUD for saved views via `client.views.*` |
| `useBatchOperations()` | `hooks/useBatchOperations.ts` | Multi-record batch operations |
| `useFileUpload()` | `hooks/useFileUpload.ts` | File upload with progress tracking |
| `useAnalyticsQuery()` | `hooks/useAnalyticsQuery.ts` | Analytics data via `client.analytics.query()` |
| `useAnalyticsMeta()` | `hooks/useAnalyticsMeta.ts` | Analytics metadata via `client.analytics.meta()` |
| `useOfflineSync()` | `hooks/useOfflineSync.ts` | Offline sync management |
| `useNetworkStatus()` | `hooks/useNetworkStatus.ts` | Real-time network connectivity |
| `useQueryBuilder()` | `hooks/useQueryBuilder.ts` | Filter construction state management |
| `useDashboardData()` | `hooks/useDashboardData.ts` | Dashboard widget data loading |

---

## Performance Considerations

### Query Optimization

| Strategy | Implementation |
|----------|---------------|
| **Pagination** | Default page size from view metadata; infinite scroll |
| **Field projection** | Only fetch fields needed for the current view |
| **ETag caching** | Avoid re-fetching unchanged metadata |
| **Batch operations** | Use SDK `batch()` / `createMany()` / `deleteMany()` |
| **Query deduplication** | TanStack Query deduplicates concurrent identical requests |

### Storage Optimization

| Strategy | Implementation |
|----------|---------------|
| **WAL journal mode** | Concurrent reads during writes |
| **Transaction batching** | `upsertLocalRecords()` wraps in transaction |
| **JSON storage** | Schema-tolerant; no ALTER TABLE needed |
| **TTL-based cache** | Auto-expire stale metadata |
| **MMKV for metadata** | Sub-millisecond reads for hot metadata |

### Network Optimization

| Strategy | Implementation |
|----------|---------------|
| **Conditional requests** | ETag / If-None-Match headers |
| **Background sync** | Battery-efficient periodic sync |
| **Offline queue** | No blocking on network; immediate local writes |
| **Retry backoff** | Exponential backoff for failed sync entries |

---

*This document details the data layer as implemented through Phase 3. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the overall system architecture and [SDK-GAP-ANALYSIS.md](./SDK-GAP-ANALYSIS.md) for upstream SDK dependencies.*
