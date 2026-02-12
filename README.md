# ObjectStack Mobile

Enterprise low-code platform mobile runtime built with Expo, React Native, and TypeScript.

> **Metadata-driven runtime** — interprets ObjectUI metadata (Views, Forms, Dashboards, Actions) from an ObjectStack server and renders them as native mobile components. No hardcoded business logic.

## 📊 Current Status

✅ **All Core Phases Complete** (0–6, 9–10) | ⚠️ **E2E Testing Pending** | 📦 **SDK v3.0.0**

- **Tests**: 540/540 passing (63 suites) ✅
- **Coverage**: ~85% ✅
- **SDK**: `@objectstack/client@3.0.0`, `@objectstack/spec@3.0.0`
- **Next Steps**: See [ROADMAP.md](./ROADMAP.md) →

**What's Complete**:
- ✅ Full authentication system (better-auth)
- ✅ All major view renderers (List, Form, Detail, Dashboard, Kanban, Calendar, Chart, Map, Timeline, Report, Page)
- ✅ Offline-first architecture with sync queue
- ✅ File upload/download, analytics, i18n, production monitoring, security, CI/CD
- ✅ 23 custom hooks covering all 13 SDK API namespaces
- ✅ Spec v3.0.0 core + UI alignment (automation, packages, SDUI, widgets, theme tokens)

See [ROADMAP.md](./ROADMAP.md) for complete details.

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Expo SDK 54 (Managed Workflow) |
| **Navigation** | Expo Router v6 (file-based routing) |
| **Language** | TypeScript (strict mode) |
| **Styling** | NativeWind v4 (Tailwind CSS for React Native) |
| **UI Components** | shadcn/ui pattern (`components/ui/`) |
| **Icons** | lucide-react-native |
| **Client State** | Zustand |
| **Server State** | @objectstack/client-react (TanStack Query) |
| **Auth** | better-auth + @better-auth/expo |
| **Offline Storage** | expo-sqlite |
| **Metadata Cache** | react-native-mmkv |

## Getting Started

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Start development server
pnpm start
```

## Project Structure

```
├── app/                            # Expo Router pages
│   ├── _layout.tsx                 # Root layout (providers, auth guard)
│   ├── (auth)/                     # Authentication screens
│   ├── (tabs)/                     # Main tab navigation
│   └── (app)/                      # Dynamic app CRUD screens
├── components/
│   ├── ui/                         # Design system primitives
│   ├── renderers/                  # ObjectUI rendering engine
│   ├── actions/                    # Action system
│   ├── common/                     # Shared components
│   ├── query/                      # Query builder UI
│   ├── batch/                      # Batch operation UI
│   ├── views/                      # Saved views UI
│   └── sync/                       # Offline sync UI
├── hooks/                          # Custom React hooks
├── lib/                            # Core libraries
├── stores/                         # Zustand state stores
└── docs/                           # Documentation
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm start` | Start Expo development server |
| `pnpm run lint` | TypeScript check + ESLint |
| `pnpm test` | Run Jest tests |
| `pnpm run format` | Format with Prettier |

## Documentation

Comprehensive project documentation is available in the [`docs/`](./docs/) directory:

| Document | Description |
|----------|-------------|
| **[🗺️ Roadmap](./ROADMAP.md)** | **→ START HERE** - Project status, spec compliance, development phases, next steps |
| **[🧪 E2E Testing](./docs/E2E-TESTING.md)** | Maestro test flows, execution guide, troubleshooting |
| **[Architecture](./docs/ARCHITECTURE.md)** | System architecture, layer design, provider hierarchy |
| **[UI/UX Design](./docs/UI-DESIGN.md)** | Design system, view renderers, field types |
| **[🎨 UX Design Review](./docs/UX-DESIGN-REVIEW.md)** | UX audit, industry benchmarks, improvement roadmap (Phases 14–20) |
| **[Data Layer](./docs/DATA-LAYER.md)** | Offline-first architecture, sync queue, caching |
| **[API Integration](./docs/API-INTEGRATION.md)** | SDK usage, authentication, hook reference |
| **[Security](./docs/SECURITY.md)** | Auth security, data protection, network security |
| **[Testing](./docs/TESTING.md)** | Testing strategy, unit/integration tests |
| **[Deployment](./docs/DEPLOYMENT.md)** | Build system, EAS Build, OTA updates, CI/CD |
| **[Contributing](./docs/CONTRIBUTING.md)** | Development workflow, coding standards, PR process |

## Design System

The app uses a CSS-variable-based design token system with light and dark mode support. Color tokens are defined in `global.css` and consumed via Tailwind classes. See [UI/UX Design](./docs/UI-DESIGN.md) for the full specification.
