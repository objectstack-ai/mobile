# @objectstack/client v2.0.0 Upgrade Guide

> **Date**: 2026-02-09
> **Previous Version**: v1.1.0
> **Current Version**: v2.0.0

---

## Overview

The mobile application has been successfully upgraded to `@objectstack/client@2.0.0` and `@objectstack/client-react@2.0.0`. This upgrade is **fully backward compatible** with no breaking API changes. All 346 existing tests pass without modification.

## What's New in v2.0.0

### ✅ Gap 1 Resolved: Typed Views API (Partially)

The most significant addition in v2.0.0 is the `client.views.*` API namespace. While the API is documented and functionally available at runtime, **the TypeScript type definitions have not yet been exported** in the package's `.d.ts` files. This means the `(client as any).views` workaround must remain until a future patch release exports the types.

**New API Methods:**

```typescript
// Create a saved view
const view = await client.views.create({
  name: 'active_tasks',
  label: 'Active Tasks',
  object: 'todo_task',
  type: 'list',
  visibility: 'public',
  query: {
    object: 'todo_task',
    where: { status: 'active' },
    orderBy: [{ field: 'priority', order: 'desc' }],
    limit: 50
  },
  layout: {
    columns: [
      { field: 'subject', label: 'Task', width: 200 },
      { field: 'priority', label: 'Priority', width: 100 }
    ]
  }
});

// Get a saved view
const view = await client.views.get('view-id');

// List saved views
const { views, total } = await client.views.list({
  object: 'todo_task',
  visibility: 'public'
});

// Update a saved view
await client.views.update({
  id: 'view-id',
  name: 'Updated Name',
  visibility: 'private'
});

// Delete a saved view
await client.views.delete('view-id');

// Share a view with users
await client.views.share('view-id', ['user-1', 'user-2']);

// Set as default view for an object
await client.views.setDefault('view-id', 'todo_task');
```

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

### Status Update (2026-02-09)

**Important**: While the Views API is documented in the v2.0.0 README and appears to be functionally available at runtime, the TypeScript type definitions have not yet been exported in the package's `.d.ts` files. This means we cannot yet remove the `(client as any).views` workaround without TypeScript compilation errors.

**Next Steps**: We are tracking this with the upstream @objectstack/client team and expect the type definitions to be exported in an upcoming patch release (e.g., v2.0.1).

### High Priority (Blocked by Type Exports)

- [ ] **Wait for type exports in upstream @objectstack/client**
  - Currently: API is runtime-available but types not exported
  - Expected: Future patch release (v2.0.1+)
- [ ] **Update `hooks/useViewStorage.ts`** once types are available
  - Remove `viewsApi(client: any)` helper function
  - Use properly typed `client.views.*` API
  - Update SavedView types to match v2.0.0 schema
- [ ] **Add tests for new Views API** to ensure proper integration
- [ ] **Document new query builder** usage patterns for the team

### Medium Priority

- [ ] **Consider using `createQuery()` and `createFilter()`** in `lib/query-builder.ts`
  - Provides better type safety
  - Improves developer experience with auto-completion
- [ ] **Leverage ETag caching** in `lib/metadata-cache.ts`
  - Reduce unnecessary API calls
  - Improve offline experience
- [ ] **Update batch operations** to use new `batch()` options
  - Set `atomic: true` for critical operations
  - Use `validateOnly: true` for validation before commit

### Low Priority

- [ ] **Explore new error handling** for better user feedback
- [ ] **Update documentation** with v2.0.0 examples
- [ ] **Store memory** about new v2.0.0 features for future reference

## Impact on Development Roadmap

### Phase 4B.1 — Partially Unblocked ⚠️

With the Views API now runtime-available in v2.0.0, **Phase 4B.1 can partially proceed**:

**Current State**:
1. ✅ Runtime API is functional and can be used
2. ⚠️ TypeScript types not yet exported (awaiting v2.0.1+)
3. ⏳ Can proceed with runtime implementation using type casts
4. ⏳ Full type safety pending upstream type export

**Once Types Exported**:
1. Remove `(client as any).views` workaround
2. Use proper TypeScript types
3. Improve code quality and maintainability
4. Fully complete Phase 4B.1

### Remaining Blocked Phases

Phase 4B still has blocking dependencies:
- **4B.2**: Permissions API (Gap 2)
- **4B.3**: Workflows API (Gap 3)
- **4B.4**: Real-time API (Gap 4)
- **4B.5**: Notifications API (Gap 5)

### Timeline Impact

The v2.0.0 upgrade reduces the overall timeline by **2-3 weeks**:
- **Before**: ~13-17 weeks to complete all gaps
- **After**: ~11-14 weeks (Gap 1 resolved, batch operations improved)

## Testing Status

✅ **All tests pass**: 34 test suites, 346 tests
- No breaking changes detected
- Backward compatibility confirmed
- Existing workarounds still functional

## Next Steps

1. **Immediate (This Week)**:
   - Update `useViewStorage.ts` to use typed Views API
   - Update related tests
   - Document migration for team

2. **Short Term (Next 2 Weeks)**:
   - Explore query builder in new features
   - Implement ETag caching optimizations
   - Update batch operations to use new options

3. **Long Term**:
   - Monitor upstream SDK for remaining gaps (2-5)
   - Plan Phase 4B.2-4B.5 implementation once APIs available
   - Continue Phase 6 production readiness tasks

## References

- [Client v2.0.0 README](../node_modules/.pnpm/@objectstack+client@2.0.0/node_modules/@objectstack/client/README.md)
- [Client v2.0.0 CHANGELOG](../node_modules/.pnpm/@objectstack+client@2.0.0/node_modules/@objectstack/client/CHANGELOG.md)
- [SDK Gap Analysis](./SDK-GAP-ANALYSIS.md)
- [Development Roadmap](./ROADMAP.md)

---

**Document Version**: 1.0
**Last Updated**: 2026-02-09
**Status**: ✅ Upgrade Complete, Migration In Progress
