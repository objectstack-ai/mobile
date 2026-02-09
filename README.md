# ObjectStack Mobile

Enterprise low-code platform mobile runtime built with Expo, React Native, and TypeScript.

> **Metadata-driven runtime** — interprets ObjectUI metadata (Views, Forms, Dashboards, Actions) from an ObjectStack server and renders them as native mobile components. No hardcoded business logic.

## 📊 Current Status

✅ **Development Complete** (Phases 0-6.2) | ⚠️ **E2E Testing Pending** | ⛔ **Phase 4B/5B Blocked by SDK**

- **Tests**: 346/346 passing ✅
- **Coverage**: 80%+ ✅
- **Production Ready**: Yes (with SDK limitations) ⚠️
- **Next Steps**: See [NEXT-PHASE.md](./docs/NEXT-PHASE.md) →

**What's Complete**:
- ✅ Full authentication system (better-auth)
- ✅ All major view renderers (List, Form, Detail, Dashboard, Kanban, Calendar, Chart, Map, Timeline)
- ✅ Offline-first architecture with sync queue
- ✅ File upload/download with media preview
- ✅ Analytics and charting
- ✅ Internationalization (i18n) framework
- ✅ Production monitoring (Sentry, analytics, feature flags)
- ✅ Security features (biometric auth, certificate pinning)
- ✅ CI/CD with EAS Build/Update

**What's Blocked** (waiting for SDK APIs):
- ⛔ Views API (client.views.* not implemented in v2.0.0)
- ⛔ Permissions system (client.permissions.*)
- ⛔ Workflows/approvals (client.workflows.*)
- ⛔ Real-time WebSocket (client.realtime.*)
- ⛔ Push notifications (client.notifications.*)
- ⛔ AI/NLQ integration (client.ai.*)

See [PROJECT-STATUS.md](./docs/PROJECT-STATUS.md) for complete details.

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
| **[🎯 Next Phase](./docs/NEXT-PHASE.md)** | **→ START HERE** - Recommended next steps and action items |
| **[📊 Project Status](./docs/PROJECT-STATUS.md)** | Current completion status, metrics, and production readiness |
| **[🗺️ Roadmap](./docs/ROADMAP.md)** | Development phases, feature status, SDK dependencies |
| **[🧪 E2E Testing](./docs/E2E-TESTING.md)** | Maestro test flows, execution guide, troubleshooting |
| **[📦 SDK v2.0 Upgrade](./docs/SDK-V2-UPGRADE.md)** | SDK upgrade status and API availability |
| **[🔍 SDK Gap Analysis](./docs/SDK-GAP-ANALYSIS.md)** | Missing SDK APIs blocking development |
| **[Architecture](./docs/ARCHITECTURE.md)** | System architecture, layer design, provider hierarchy |
| **[UI/UX Design](./docs/UI-DESIGN.md)** | Design system, view renderers, field types |
| **[Data Layer](./docs/DATA-LAYER.md)** | Offline-first architecture, sync queue, caching |
| **[API Integration](./docs/API-INTEGRATION.md)** | SDK usage, authentication, hook reference |
| **[Security](./docs/SECURITY.md)** | Auth security, data protection, network security |
| **[Testing](./docs/TESTING.md)** | Testing strategy, unit/integration tests |
| **[Deployment](./docs/DEPLOYMENT.md)** | Build system, EAS Build, OTA updates, CI/CD |
| **[Contributing](./docs/CONTRIBUTING.md)** | Development workflow, coding standards, PR process |
| **[Roadmap](./docs/ROADMAP.md)** | Development phases, SDK dependency matrix, release plan |
| **[SDK Gap Analysis](./docs/SDK-GAP-ANALYSIS.md)** | Missing SDK APIs, impact analysis, workarounds |

## Design System

The app uses a CSS-variable-based design token system with light and dark mode support. Color tokens are defined in `global.css` and consumed via Tailwind classes. See [UI/UX Design](./docs/UI-DESIGN.md) for the full specification.
