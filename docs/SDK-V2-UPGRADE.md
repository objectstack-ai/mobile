# @objectstack/client v2.0.1 Upgrade Guide

> **Date**: 2026-02-09
> **Previous Version**: v2.0.0
> **Current Version**: v2.0.1

---

## Overview

The mobile application has been successfully upgraded to `@objectstack/client@2.0.1` and `@objectstack/client-react@2.0.1`. This upgrade is **fully backward compatible** with no breaking API changes. All 346 existing tests pass without modification.

## What's New in v2.0.1

### ✅ ALL SDK Gaps Resolved

**v2.0.1** completes the implementation of all 13 API namespaces with full TypeScript type exports. This resolves **all previously blocked development phases (4B, 5B)**.

**Newly Available APIs:**

| Namespace | Methods | Phase Unblocked |
|-----------|---------|-----------------|
| `client.views.*` | list, get, create, update, delete | Phase 4B.1 |
| `client.permissions.*` | check, getObjectPermissions, getEffectivePermissions | Phase 4B.2 |
| `client.workflow.*` | getConfig, getState, transition, approve, reject | Phase 4B.3 |
| `client.realtime.*` | connect, disconnect, subscribe, unsubscribe, setPresence, getPresence | Phase 4B.4 |
| `client.notifications.*` | registerDevice, unregisterDevice, getPreferences, updatePreferences, list, markRead, markAllRead | Phase 4B.5 |
| `client.ai.*` | nlq, chat, suggest, insights | Phase 5B.1 |
| `client.i18n.*` | getLocales, getTranslations, getFieldLabels | Phase 5B.2 |

**Previously Available (v2.0.0):**
- Enhanced batch operations with `atomic`, `returnRecords`, `continueOnError`, `validateOnly` options
- ETag-based metadata caching via `client.meta.getCached()`
- Type-safe query builders: `createQuery<T>()`, `createFilter<T>()`
- Improved error handling with retry guidance

### 🚀 Enhanced Batch Operations

The `client.data.batch()` method now supports more options:

```typescript
const result = await client.data.batch('todo_task', {
  operation: 'update',
  records: [
    { id: '1', data: { status: 'active' } },
    { id: '2', data: { status: 'active' } }
  ],
  options: {
    atomic: true,        // Rollback on any failure
    returnRecords: true, // Include full records in response
    continueOnError: false,
    validateOnly: false  // Dry-run mode
  }
});

console.log(`Updated ${result.succeeded} records`);
console.log(`Failed ${result.failed} records`);
```

### 📦 ETag-Based Metadata Caching

Efficient metadata caching with conditional requests:

```typescript
const cachedObject = await client.meta.getCached('todo_task', {
  ifNoneMatch: '"686897696a7c876b7e"'  // ETag from previous request
});

if (cachedObject.notModified) {
  console.log('Using cached metadata');
} else {
  console.log('Metadata updated:', cachedObject.data);
  // Store new ETag for next request
  const newETag = cachedObject.etag;
}
```

### 🔍 Type-Safe Query Builder

New fluent query builder with compile-time type checking:

```typescript
import { createQuery, createFilter } from '@objectstack/client';

// Type-safe query building
const query = createQuery<Task>('todo_task')
  .select('id', 'subject', 'priority', 'status')
  .where(filter => filter
    .greaterThanOrEqual('priority', 2)
    .equals('status', 'active')
  )
  .orderBy('priority', 'desc')
  .limit(20)
  .build();

const result = await client.data.query('todo_task', query);

// Type-safe filter building
const filter = createFilter<Task>()
  .in('status', ['active', 'pending'])
  .greaterThan('created_at', '2026-01-01')
  .build();
```

### 📊 Improved Error Handling

Standardized error codes with retry guidance:

```typescript
try {
  await client.data.create('todo_task', { subject: '' });
} catch (error) {
  console.error('Error code:', error.code);        // e.g., 'validation_error'
  console.error('Category:', error.category);      // e.g., 'validation'
  console.error('HTTP status:', error.httpStatus); // e.g., 400
  console.error('Retryable:', error.retryable);    // e.g., false
  console.error('Details:', error.details);        // Additional error info
}
```

## Migration Checklist

### Completed

- [x] **Upgrade to v2.0.1** — packages installed and tested
- [x] **All 346 tests pass** — backward compatible
- [x] **TypeScript types available** — all namespaces properly typed

### High Priority (Phase 4B Implementation)

- [ ] **Refactor `hooks/useViewStorage.ts`** to align with SDK view data types
- [ ] **Create `hooks/usePermissions.ts`** using `client.permissions.*`
- [ ] **Create `hooks/useWorkflowState.ts`** using `client.workflow.*`
- [ ] **Create `hooks/useSubscription.ts`** using `client.realtime.*`
- [ ] **Create notification hooks** using `client.notifications.*`

### Medium Priority (Phase 5B Implementation)

- [ ] **Create AI chat UI** using `client.ai.*`
- [ ] **Integrate server i18n** using `client.i18n.*`
- [ ] **Consider using `createQuery()` and `createFilter()`** in `lib/query-builder.ts`

## Impact on Development Roadmap

### All Phases Unblocked ✅

With v2.0.1, **all previously blocked phases are now unblocked**:

- **Phase 4B.1**: Views API — ✅ Fully typed and available
- **Phase 4B.2**: Permissions — ✅ `client.permissions.*` available
- **Phase 4B.3**: Workflows — ✅ `client.workflow.*` available
- **Phase 4B.4**: Real-time — ✅ `client.realtime.*` available
- **Phase 4B.5**: Notifications — ✅ `client.notifications.*` available
- **Phase 5B.1**: AI/NLQ — ✅ `client.ai.*` available
- **Phase 5B.2**: Server i18n — ✅ `client.i18n.*` available

### Timeline Impact

The v2.0.1 upgrade **eliminates all upstream SDK dependencies**:
- **Before (v2.0.0)**: ~11-14 weeks remaining (blocked by SDK)
- **After (v2.0.1)**: ~6-8 weeks remaining (no blockers, Mobile-side implementation only)

## Testing Status

✅ **All tests pass**: 34 test suites, 346 tests
- No breaking changes detected
- Backward compatibility confirmed
- Existing workarounds still functional

## Next Steps

1. **Immediate (This Week)**:
   - Begin Phase 4B.2 — Permissions hook implementation
   - Refactor `useViewStorage.ts` to align with SDK types

2. **Short Term (Next 2-4 Weeks)**:
   - Complete Phase 4B (Permissions, Workflows, Real-time, Notifications)
   - Begin Phase 5B (AI, Server i18n)

3. **Medium Term (Next 4-8 Weeks)**:
   - Complete Phase 5B
   - Full E2E testing
   - App Store submission preparation

## References

- [SDK Gap Analysis](./SDK-GAP-ANALYSIS.md)
- [Development Roadmap](./ROADMAP.md)

---

**Document Version**: 2.0
**Last Updated**: 2026-02-09
**Status**: ✅ Upgrade Complete — All SDK Gaps Resolved
