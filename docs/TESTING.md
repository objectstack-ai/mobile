# ObjectStack Mobile — Testing Strategy

> **Version**: 1.0 · **Last Updated**: 2026-02-08
>
> Testing strategy, tooling, and guidelines for the ObjectStack Mobile client.

---

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Pyramid](#test-pyramid)
3. [Tooling](#tooling)
4. [Unit Testing](#unit-testing)
5. [Integration Testing](#integration-testing)
6. [E2E Testing](#e2e-testing)
7. [Test Organization](#test-organization)
8. [Mocking Strategy](#mocking-strategy)
9. [Coverage Targets](#coverage-targets)
10. [Running Tests](#running-tests)
11. [CI Integration](#ci-integration)

---

## Testing Philosophy

### Principles

1. **Test behavior, not implementation** — Test what the user sees and does, not internal state
2. **Confidence over coverage** — Prioritize tests that catch real bugs over arbitrary coverage targets
3. **Fast feedback** — Unit tests should run in seconds, integration tests in minutes
4. **Deterministic** — Tests must be reproducible and not depend on network or timing

### What to Test

| Priority | What | How |
|----------|------|-----|
| **Critical** | Data hooks (query, mutation, sync) | Integration tests with mocked SDK |
| **Critical** | Query builder (filter AST) | Unit tests |
| **Critical** | Offline storage & sync queue | Unit tests |
| **High** | View renderers (list, form, detail) | Component tests |
| **High** | Auth flow (sign-in, guard, sign-out) | Integration tests |
| **Medium** | UI components | Snapshot tests |
| **Medium** | Error handling | Unit tests |
| **Low** | Navigation structure | E2E tests |

---

## Test Pyramid

```
        ╱╲
       ╱  ╲
      ╱ E2E╲          ~10% — Critical user journeys
     ╱──────╲
    ╱        ╲
   ╱Integration╲      ~30% — Hook + renderer + SDK integration
  ╱──────────────╲
 ╱                ╲
╱   Unit Tests     ╲   ~60% — Pure functions, utilities, builders
╱────────────────────╲
```

---

## Tooling

### Current Setup

| Tool | Version | Purpose |
|------|---------|---------|
| **Jest** | `^29.7.0` | Test runner |
| **jest-expo** | `^54.0.2` | Expo preset for Jest |
| **@testing-library/react-native** | `^12.9.0` | Component testing utilities |
| **@testing-library/jest-native** | `^5.4.3` | Custom Jest matchers for RN |
| **TypeScript** | `~5.9.2` | Type checking in tests |

### Configuration

```javascript
// jest.config.js
module.exports = {
  preset: "jest-expo",
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)"
  ],
  setupFilesAfterSetup: ["@testing-library/jest-native/extend-expect"],
  moduleNameMapper: {
    "^~/(.*)$": "<rootDir>/$1"
  }
};
```

### Planned Tools

| Tool | Purpose | Phase |
|------|---------|-------|
| **MSW** (`@objectstack/plugin-msw`) | API mocking for integration tests | 5A |
| **Maestro** or **Detox** | E2E testing on real devices/simulators | 5A |

---

## Unit Testing

### Target Modules

| Module | Path | Test Focus |
|--------|------|-----------|
| Query Builder | `lib/query-builder.ts` | Filter creation, serialization, operator validation |
| Offline Storage | `lib/offline-storage.ts` | CRUD operations, schema migration |
| Sync Queue | `lib/sync-queue.ts` | Enqueue, status transitions, cleanup |
| Error Handling | `lib/error-handling.ts` | Error parsing, message mapping |
| Metadata Cache | `lib/metadata-cache.ts` | Cache get/set, TTL, ETag |
| Utils | `lib/utils.ts` | Utility functions |

### Example: Query Builder Tests

```typescript
// __tests__/lib/query-builder.test.ts
import {
  createSimpleFilter,
  createCompoundFilter,
  serializeFilter,
  serializeFilterTree,
  operatorsForFieldType,
  isSimpleFilter,
  isCompoundFilter,
} from "~/lib/query-builder";

describe("Query Builder", () => {
  describe("createSimpleFilter", () => {
    it("creates a filter with default values", () => {
      const filter = createSimpleFilter();
      expect(filter.field).toBe("");
      expect(filter.operator).toBe("eq");
      expect(filter.value).toBe("");
      expect(filter.id).toBeTruthy();
    });

    it("creates a filter with custom values", () => {
      const filter = createSimpleFilter("status", "neq");
      expect(filter.field).toBe("status");
      expect(filter.operator).toBe("neq");
    });
  });

  describe("serializeFilter", () => {
    it("serializes a simple filter", () => {
      const filter = createSimpleFilter("status", "eq");
      filter.value = "active";
      expect(serializeFilter(filter)).toEqual(["status", "eq", "active"]);
    });

    it("serializes a null-check operator without value", () => {
      const filter = createSimpleFilter("email", "is_null");
      expect(serializeFilter(filter)).toEqual(["email", "is_null"]);
    });

    it("serializes a between operator with two values", () => {
      const filter = createSimpleFilter("amount", "between");
      filter.value = 100;
      filter.value2 = 500;
      expect(serializeFilter(filter)).toEqual(["amount", "between", 100, 500]);
    });

    it("returns null for empty field", () => {
      const filter = createSimpleFilter("", "eq");
      expect(serializeFilter(filter)).toBeNull();
    });
  });

  describe("operatorsForFieldType", () => {
    it("returns text operators for text fields", () => {
      const ops = operatorsForFieldType("text");
      expect(ops).toContain("contains");
      expect(ops).toContain("starts_with");
    });

    it("returns numeric operators for number fields", () => {
      const ops = operatorsForFieldType("number");
      expect(ops).toContain("gt");
      expect(ops).toContain("between");
    });

    it("returns boolean operators for boolean fields", () => {
      const ops = operatorsForFieldType("boolean");
      expect(ops).toContain("eq");
      expect(ops).not.toContain("contains");
    });
  });
});
```

### Example: Error Handling Tests

```typescript
// __tests__/lib/error-handling.test.ts
import { parseError, getUserErrorMessage } from "~/lib/error-handling";

describe("Error Handling", () => {
  it("parses network errors", () => {
    const error = new Error("Network request failed");
    const parsed = parseError(error);
    expect(parsed.code).toBe("NETWORK_ERROR");
  });

  it("parses structured API errors", () => {
    const error = new Error(JSON.stringify({ code: "NOT_FOUND" }));
    const parsed = parseError(error);
    expect(parsed.code).toBe("NOT_FOUND");
  });

  it("returns INTERNAL_ERROR for unknown errors", () => {
    const parsed = parseError("something");
    expect(parsed.code).toBe("INTERNAL_ERROR");
  });

  it("returns user-friendly messages", () => {
    const message = getUserErrorMessage(new Error("Network request failed"));
    expect(message).toContain("internet connection");
  });
});
```

---

## Integration Testing

### Hook Testing

Test hooks with mocked SDK client using React Testing Library's `renderHook`:

```typescript
// __tests__/hooks/useAppDiscovery.test.ts
import { renderHook, waitFor } from "@testing-library/react-native";
import { useAppDiscovery } from "~/hooks/useAppDiscovery";

// Mock SDK client
jest.mock("@objectstack/client-react", () => ({
  useClient: () => ({
    packages: {
      list: jest.fn().mockResolvedValue({
        packages: [
          { id: "app1", name: "crm", label: "CRM", enabled: true },
          { id: "app2", name: "hrm", label: "HRM", enabled: true },
        ],
      }),
    },
  }),
}));

describe("useAppDiscovery", () => {
  it("fetches and transforms apps", async () => {
    const { result } = renderHook(() => useAppDiscovery());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.apps).toHaveLength(2);
    expect(result.current.apps[0].name).toBe("crm");
  });
});
```

### Renderer Testing

Test renderers with mocked data:

```typescript
// __tests__/components/renderers/ListViewRenderer.test.tsx
import { render, screen } from "@testing-library/react-native";
import { ListViewRenderer } from "~/components/renderers/ListViewRenderer";

describe("ListViewRenderer", () => {
  const mockRecords = [
    { id: "1", name: "Record 1", status: "active" },
    { id: "2", name: "Record 2", status: "inactive" },
  ];

  const mockFields = [
    { name: "name", type: "text", label: "Name" },
    { name: "status", type: "select", label: "Status" },
  ];

  it("renders records", () => {
    render(
      <ListViewRenderer
        records={mockRecords}
        fields={mockFields}
        view={{ columns: ["name", "status"] }}
      />
    );

    expect(screen.getByText("Record 1")).toBeTruthy();
    expect(screen.getByText("Record 2")).toBeTruthy();
  });

  it("shows empty state when no records", () => {
    render(
      <ListViewRenderer records={[]} fields={mockFields} view={{}} />
    );

    expect(screen.getByText(/no records/i)).toBeTruthy();
  });
});
```

---

## E2E Testing

### Planned Setup (Phase 5A)

Using **Maestro** for E2E tests:

```yaml
# e2e/sign-in.yaml
appId: com.objectstack.mobile
---
- launchApp
- assertVisible: "Sign In"
- tapOn: "Email"
- inputText: "test@example.com"
- tapOn: "Password"
- inputText: "password123"
- tapOn: "Sign In"
- assertVisible: "Home"
```

### Critical E2E Flows

| Flow | Steps |
|------|-------|
| **Sign in** | Launch → Enter credentials → Verify home screen |
| **Browse apps** | Sign in → Tap Apps tab → Select app → View objects |
| **View records** | Navigate to object → Verify list → Search → Filter |
| **Create record** | Tap Create → Fill form → Save → Verify in list |
| **Edit record** | Tap record → Edit → Modify fields → Save → Verify |
| **Delete record** | Swipe record → Delete → Confirm → Verify removed |
| **Offline mode** | Disable network → Create record → Re-enable → Verify sync |

---

## Test Organization

### Directory Structure

```
├── __tests__/
│   ├── lib/
│   │   ├── query-builder.test.ts
│   │   ├── offline-storage.test.ts
│   │   ├── sync-queue.test.ts
│   │   ├── error-handling.test.ts
│   │   └── metadata-cache.test.ts
│   ├── hooks/
│   │   ├── useAppDiscovery.test.ts
│   │   ├── useBatchOperations.test.ts
│   │   ├── useNetworkStatus.test.ts
│   │   └── useViewStorage.test.ts
│   ├── components/
│   │   ├── renderers/
│   │   │   ├── ListViewRenderer.test.tsx
│   │   │   ├── FormViewRenderer.test.tsx
│   │   │   ├── DetailViewRenderer.test.tsx
│   │   │   └── ViewRenderer.test.tsx
│   │   ├── common/
│   │   │   ├── EmptyState.test.tsx
│   │   │   ├── ErrorBoundary.test.tsx
│   │   │   └── SearchBar.test.tsx
│   │   └── ui/
│   │       ├── Button.test.tsx
│   │       ├── Input.test.tsx
│   │       └── Card.test.tsx
│   └── e2e/                         # Phase 5A
│       ├── sign-in.yaml
│       ├── crud-flow.yaml
│       └── offline-sync.yaml
```

### Naming Conventions

| Convention | Example |
|-----------|---------|
| Test files | `*.test.ts` / `*.test.tsx` |
| Test suites | `describe("ModuleName", ...)` |
| Test cases | `it("does something specific", ...)` |
| Mock files | `__mocks__/module-name.ts` |

---

## Mocking Strategy

### SDK Mocking

```typescript
// __mocks__/@objectstack/client-react.ts
export const useClient = jest.fn(() => ({
  meta: { getObject: jest.fn(), getTypes: jest.fn() },
  data: { query: jest.fn(), find: jest.fn(), get: jest.fn() },
  packages: { list: jest.fn() },
  storage: { upload: jest.fn() },
  analytics: { query: jest.fn(), meta: jest.fn() },
}));

export const useQuery = jest.fn();
export const useMutation = jest.fn();
export const useObject = jest.fn();
export const useView = jest.fn();
export const useFields = jest.fn();
```

### Native Module Mocking

```typescript
// jest.setup.ts
jest.mock("expo-sqlite", () => ({
  openDatabaseSync: jest.fn(() => ({
    execSync: jest.fn(),
    runSync: jest.fn(),
    getFirstSync: jest.fn(),
    getAllSync: jest.fn(),
    withTransactionSync: jest.fn((cb) => cb()),
  })),
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock("react-native-mmkv", () => ({
  createMMKV: jest.fn(() => ({
    getString: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    clearAll: jest.fn(),
  })),
}));
```

---

## Coverage Targets

### Phase 5A Target: ≥80% Coverage

| Area | Target | Priority |
|------|--------|----------|
| `lib/` (utilities) | ≥90% | Critical |
| `hooks/` (custom hooks) | ≥80% | High |
| `components/renderers/` | ≥70% | High |
| `components/common/` | ≥80% | Medium |
| `components/ui/` | ≥60% | Medium |
| `stores/` | ≥90% | High |

### Coverage Enforcement

```json
// jest.config.js (planned)
{
  "coverageThreshold": {
    "global": {
      "branches": 70,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}
```

---

## Running Tests

### Commands

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- --testPathPattern=query-builder

# Run in watch mode
npm test -- --watch

# Update snapshots
npm test -- --updateSnapshot
```

### Current Configuration

```json
// package.json
{
  "scripts": {
    "test": "jest --passWithNoTests"
  }
}
```

> Note: `--passWithNoTests` is used because the test suite is being built incrementally. This flag will be removed once initial test files are in place.

---

## CI Integration

### GitHub Actions (Planned — Phase 5A)

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci --legacy-peer-deps
      - run: npm run lint
      - run: npm test -- --coverage --ci
      - uses: codecov/codecov-action@v4
```

### Pre-commit Checks

```bash
# Recommended pre-commit hook
npx tsc --noEmit && npx eslint . --ext .ts,.tsx && npm test
```

---

*This document defines the testing strategy for ObjectStack Mobile. See [CONTRIBUTING.md](./CONTRIBUTING.md) for development workflow and [DEPLOYMENT.md](./DEPLOYMENT.md) for CI/CD pipeline details.*
