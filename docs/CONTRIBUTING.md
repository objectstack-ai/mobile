# ObjectStack Mobile — Contributing Guide

> **Version**: 1.0 · **Last Updated**: 2026-02-08
>
> Development workflow, coding standards, and contribution guidelines.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Component Guidelines](#component-guidelines)
6. [Hook Guidelines](#hook-guidelines)
7. [Styling Guide](#styling-guide)
8. [Commit Conventions](#commit-conventions)
9. [Pull Request Process](#pull-request-process)
10. [Adding New Features](#adding-new-features)
11. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | ≥ 20.x | Runtime |
| **pnpm** | ≥ 10.x | Package manager |
| **Expo CLI** | Latest | Development tools |
| **Xcode** | ≥ 15 (macOS) | iOS simulator |
| **Android Studio** | Latest | Android emulator |

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/objectstack-ai/mobile.git
cd mobile

# 2. Install dependencies
pnpm install

# 3. Copy environment variables
cp .env.example .env.local

# 4. Configure your API URL
# Edit .env.local: EXPO_PUBLIC_API_URL=http://localhost:3000

# 5. Start development server
pnpm start
```

### Available Commands

| Command | Description |
|---------|-------------|
| `pnpm start` | Start Expo development server |
| `pnpm run android` | Start on Android |
| `pnpm run ios` | Start on iOS |
| `pnpm run web` | Start on web |
| `pnpm run lint` | Run TypeScript check + ESLint |
| `pnpm test` | Run Jest tests |
| `pnpm run format` | Format code with Prettier |
| `pnpm run format:check` | Check formatting without changes |

---

## Project Structure

```
mobile/
├── app/                            # Expo Router pages (file-based routing)
│   ├── _layout.tsx                 # Root layout (providers, auth guard)
│   ├── (auth)/                     # Authentication screens
│   │   ├── _layout.tsx             # Auth stack layout
│   │   ├── sign-in.tsx             # Sign-in screen
│   │   └── sign-up.tsx             # Sign-up screen
│   ├── (tabs)/                     # Main tab navigation
│   │   ├── _layout.tsx             # Tab bar configuration
│   │   ├── index.tsx               # Home / Dashboard
│   │   ├── apps.tsx                # App launcher
│   │   ├── notifications.tsx       # Notification center
│   │   └── profile.tsx             # User profile & settings
│   └── (app)/                      # Dynamic app screens
│       └── [appName]/
│           ├── _layout.tsx
│           └── [objectName]/
│               ├── index.tsx       # Object list view
│               ├── [id].tsx        # Object detail view
│               ├── new.tsx         # Create record form
│               └── [id]/edit.tsx   # Edit record form
├── components/
│   ├── ui/                         # Design system primitives (shadcn pattern)
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   └── ...
│   ├── renderers/                  # ObjectUI rendering engine
│   │   ├── ViewRenderer.tsx        # Top-level view dispatcher
│   │   ├── ListViewRenderer.tsx    # List view
│   │   ├── FormViewRenderer.tsx    # Form view
│   │   ├── DetailViewRenderer.tsx  # Detail view
│   │   ├── DashboardViewRenderer.tsx
│   │   ├── KanbanViewRenderer.tsx
│   │   ├── CalendarViewRenderer.tsx
│   │   ├── ChartViewRenderer.tsx
│   │   ├── TimelineViewRenderer.tsx
│   │   ├── MapViewRenderer.tsx
│   │   ├── FilterDrawer.tsx
│   │   ├── SwipeableRow.tsx
│   │   ├── ImageGallery.tsx
│   │   ├── fields/                 # Field type renderers
│   │   │   ├── FieldRenderer.tsx
│   │   │   └── FileField.tsx
│   │   ├── types.ts                # Shared type definitions
│   │   └── index.ts                # Barrel export
│   ├── actions/                    # Action system
│   │   ├── ActionBar.tsx
│   │   ├── ActionExecutor.ts
│   │   ├── FloatingActionButton.tsx
│   │   └── index.ts
│   ├── common/                     # Shared components
│   │   ├── EmptyState.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── InfiniteScrollList.tsx
│   │   ├── LoadingScreen.tsx
│   │   ├── OfflineIndicator.tsx
│   │   ├── PullToRefresh.tsx
│   │   └── SearchBar.tsx
│   ├── query/                      # Query builder UI
│   ├── batch/                      # Batch operation UI
│   ├── views/                      # Saved views UI
│   └── sync/                       # Offline sync UI
├── hooks/                          # Custom React hooks
│   ├── useObjectStack.ts           # Re-exported SDK hooks
│   ├── useAppDiscovery.ts          # App/package listing
│   ├── useBatchOperations.ts       # Batch record operations
│   ├── useFileUpload.ts            # File upload with progress
│   ├── useAnalyticsQuery.ts        # Analytics data fetching
│   ├── useAnalyticsMeta.ts         # Analytics metadata
│   ├── useDashboardData.ts         # Dashboard widget data
│   ├── useOfflineSync.ts           # Offline sync management
│   ├── useNetworkStatus.ts         # Network connectivity
│   ├── useQueryBuilder.ts          # Filter construction
│   └── useViewStorage.ts           # Saved view CRUD
├── lib/                            # Core libraries
│   ├── objectstack.ts              # SDK client initialization
│   ├── auth-client.ts              # Authentication client
│   ├── query-builder.ts            # ObjectQL filter builder
│   ├── offline-storage.ts          # SQLite offline cache
│   ├── sync-queue.ts               # Mutation sync queue
│   ├── background-sync.ts          # Background sync task
│   ├── metadata-cache.ts           # MMKV metadata cache
│   ├── error-handling.ts           # Error parsing & messages
│   └── utils.ts                    # Utility functions (cn())
├── stores/                         # Zustand state stores
│   ├── app-store.ts                # App-level state
│   ├── ui-store.ts                 # UI preferences
│   └── sync-store.ts               # Sync status state
├── docs/                           # Documentation
│   ├── ARCHITECTURE.md             # System architecture
│   ├── UI-DESIGN.md                # UI/UX specification
│   ├── DATA-LAYER.md               # Data & offline architecture
│   ├── API-INTEGRATION.md          # SDK integration guide
│   ├── SECURITY.md                 # Security design
│   ├── TESTING.md                  # Testing strategy
│   ├── DEPLOYMENT.md               # Build & deployment
│   ├── CONTRIBUTING.md             # This file
│   ├── ...                         # Technical docs
│   └── ...                         # Other technical docs
├── global.css                      # Design tokens & Tailwind base
├── tailwind.config.js              # Tailwind configuration
├── app.config.ts                   # Expo app config
├── eas.json                        # EAS Build/Update config
├── tsconfig.json                   # TypeScript config
├── babel.config.js                 # Babel config
├── metro.config.js                 # Metro bundler config
├── jest.config.js                  # Jest test config
└── package.json                    # Dependencies & scripts
```

---

## Development Workflow

### Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code |
| `develop` | Integration branch |
| `feature/*` | New features |
| `fix/*` | Bug fixes |
| `docs/*` | Documentation changes |

### Workflow

```
1. Create feature branch from develop
   git checkout -b feature/my-feature develop

2. Make changes with small, focused commits

3. Run checks before pushing
   pnpm run lint && pnpm test

4. Push and create PR against develop
   git push origin feature/my-feature

5. Address review feedback

6. Merge via squash merge
```

---

## Coding Standards

### TypeScript

| Rule | Standard |
|------|----------|
| **Strict mode** | Enabled (`"strict": true` in tsconfig.json) |
| **No `any`** | Avoid; use `unknown` or specific types. SDK untyped APIs are exceptions. |
| **Explicit return types** | Required for exported functions |
| **Interface over type** | Prefer `interface` for object shapes |
| **Enum** | Use string literal unions instead of TypeScript enums |

### File Naming

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `ListViewRenderer.tsx` |
| Hooks | camelCase with `use` prefix | `useAppDiscovery.ts` |
| Libraries | kebab-case | `query-builder.ts` |
| Stores | kebab-case | `app-store.ts` |
| Types | PascalCase (in types.ts) | `FieldDefinition` |
| Constants | SCREAMING_SNAKE_CASE | `OPERATOR_META` |

### Imports

```typescript
// 1. React / React Native
import React from "react";
import { View, Text } from "react-native";

// 2. External libraries
import { useQuery } from "@tanstack/react-query";

// 3. Internal modules (using ~ alias)
import { useClient } from "~/hooks/useObjectStack";
import { Button } from "~/components/ui/Button";

// 4. Relative imports (same directory)
import type { ListViewMeta } from "./types";
```

### Code Documentation

```typescript
/**
 * JSDoc comments for all exported functions, hooks, and components.
 *
 * @param objectName - The name of the object to query
 * @returns The list of records
 */
export function useRecords(objectName: string): Record[] {
  // Implementation
}
```

---

## Component Guidelines

### Component Structure

```tsx
// 1. Imports
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

// 2. Types
export interface MyComponentProps {
  title: string;
  onPress?: () => void;
}

// 3. Component
export function MyComponent({ title, onPress }: MyComponentProps) {
  // 4. Hooks
  const [isActive, setIsActive] = useState(false);

  // 5. Handlers
  const handlePress = () => {
    setIsActive(true);
    onPress?.();
  };

  // 6. Render
  return (
    <TouchableOpacity onPress={handlePress}>
      <Text className="text-foreground">{title}</Text>
    </TouchableOpacity>
  );
}
```

### Rules

- **Function components only** — no class components
- **Named exports** — no default exports (except route pages)
- **Props interface** — always define a typed props interface
- **Memoization** — use `useMemo` / `useCallback` only when profiling shows need
- **Accessibility** — always add `accessibilityLabel` to interactive elements

### Adding a New View Renderer

1. Create `components/renderers/MyViewRenderer.tsx`
2. Define props interface extending common patterns
3. Register in `ViewRenderer.tsx`:

```typescript
import { MyViewRenderer } from "./MyViewRenderer";

// In rendererMap:
const rendererMap = {
  // ... existing renderers
  my_view: MyViewRenderer,
};

// Or dynamically:
registerRenderer("my_view", MyViewRenderer);
```

4. Add the type to `ViewType` in `types.ts`
5. Export from `index.ts`

---

## Hook Guidelines

### Hook Structure

```typescript
// 1. Imports
import { useState, useCallback, useEffect } from "react";
import { useClient } from "@objectstack/client-react";

// 2. Return type interface
interface UseMyHookResult {
  data: MyData[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// 3. Hook implementation
/**
 * Hook description.
 */
export function useMyHook(param: string): UseMyHookResult {
  const client = useClient();
  const [data, setData] = useState<MyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await client.data.find(param);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [client, param]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
```

### Rules

- **Always return a typed result** — define `UseXxxResult` interface
- **Handle loading, error, and data states** — consumers need all three
- **Use `useCallback` for functions exposed in return** — prevents unnecessary re-renders
- **Clean up effects** — return cleanup function for subscriptions

---

## Styling Guide

### NativeWind (Tailwind CSS)

All styling uses NativeWind v4 (Tailwind classes in React Native):

```tsx
// ✅ Do: Use Tailwind classes
<View className="flex-1 bg-background p-4">
  <Text className="text-lg font-semibold text-foreground">Title</Text>
  <Text className="text-sm text-muted-foreground">Subtitle</Text>
</View>

// ❌ Don't: Use inline styles
<View style={{ flex: 1, backgroundColor: '#fff', padding: 16 }}>
```

### Design Tokens

Always use design token classes instead of hardcoded colors:

```tsx
// ✅ Do: Use design tokens
<View className="bg-card border-border">
  <Text className="text-card-foreground">Content</Text>
</View>

// ❌ Don't: Use hardcoded colors
<View style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
```

### Common Patterns

```tsx
// Card
<View className="bg-card rounded-lg border border-border p-4 shadow-sm">

// Button (primary)
<TouchableOpacity className="bg-primary rounded-lg px-4 py-2">
  <Text className="text-primary-foreground font-semibold">Action</Text>
</TouchableOpacity>

// Input
<TextInput className="bg-input border-border rounded-lg border px-3 py-2 text-foreground" />

// Section spacing
<View className="mb-6">
  <Text className="mb-2 text-sm font-medium text-muted-foreground">SECTION</Text>
  {/* content */}
</View>
```

### Utility: `cn()`

Use the `cn()` utility for conditional classes:

```typescript
import { cn } from "~/lib/utils";

<View className={cn(
  "rounded-lg p-4",
  isActive && "bg-primary",
  isDisabled && "opacity-50",
)}>
```

---

## Commit Conventions

### Format

```
type(scope): description

[optional body]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Formatting, no code change |
| `refactor` | Code restructuring |
| `test` | Adding/updating tests |
| `chore` | Build, deps, config changes |
| `perf` | Performance improvement |

### Examples

```
feat(renderers): add kanban board view renderer
fix(sync): resolve conflict resolution crash on empty payload
docs(api): update SDK integration guide for v1.1.0
refactor(hooks): simplify useAppDiscovery with useCallback
test(query-builder): add unit tests for between operator
chore(deps): update expo SDK to 54.0.33
```

---

## Pull Request Process

### PR Checklist

- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)
- [ ] ESLint passes (`npx eslint . --ext .ts,.tsx`)
- [ ] Tests pass (`pnpm test`)
- [ ] Code is formatted (`pnpm run format:check`)
- [ ] New code has appropriate types (no unnecessary `any`)
- [ ] New components have `accessibilityLabel` props
- [ ] Documentation updated if API changed

### PR Description Template

```markdown
## What
Brief description of the change.

## Why
Motivation and context.

## How
Implementation approach.

## Testing
How to verify the changes.

## Screenshots
(If applicable)
```

---

## Adding New Features

### Adding a New View Type

1. Define types in `components/renderers/types.ts`
2. Create renderer component in `components/renderers/`
3. Register in `ViewRenderer.tsx` renderer map
4. Export from `components/renderers/index.ts`
5. Add to `ViewType` union type

### Adding a New Hook

1. Create file in `hooks/` with `use` prefix
2. Define return type interface
3. Implement with loading/error/data pattern
4. Export from hook file
5. Document with JSDoc

### Adding a New UI Component

1. Create file in `components/ui/`
2. Follow shadcn/ui pattern (props interface, variants)
3. Use NativeWind styling only
4. Add accessibility props
5. Export from component file

### Adding a New Library Module

1. Create file in `lib/`
2. Keep module focused (single responsibility)
3. Export typed public API
4. Document with JSDoc
5. Add unit tests

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| **Install fails** | Use `pnpm install --no-frozen-lockfile` |
| **Metro cache issues** | `pnpm start --clear` |
| **TypeScript errors** | `npx tsc --noEmit` to check |
| **NativeWind not updating** | Restart Metro bundler |
| **Expo Go crash** | Use development build instead |
| **iOS build fails** | Check Xcode version (≥ 15) |

### Useful Commands

```bash
# Clear all caches
pnpm start --clear

# Reset Metro cache
npx react-native start --reset-cache

# Check Expo diagnostics
npx expo-doctor

# Check TypeScript
npx tsc --noEmit

# Fix formatting
pnpm run format
```

---

*This document is the contribution guide for ObjectStack Mobile. See [ARCHITECTURE.md](./ARCHITECTURE.md) for technical design and [TESTING.md](./TESTING.md) for testing guidelines.*
