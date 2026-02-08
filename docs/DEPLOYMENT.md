# ObjectStack Mobile — Deployment & CI/CD Guide

> **Version**: 1.0 · **Last Updated**: 2026-02-08
>
> Build, deployment, and CI/CD pipeline specification for the ObjectStack Mobile client.

---

## Table of Contents

1. [Build System](#build-system)
2. [Environment Configuration](#environment-configuration)
3. [Development Workflow](#development-workflow)
4. [EAS Build](#eas-build)
5. [OTA Updates](#ota-updates)
6. [App Store Deployment](#app-store-deployment)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Versioning Strategy](#versioning-strategy)
9. [Release Process](#release-process)

---

## Build System

### Expo Managed Workflow

The app uses Expo's **managed workflow**, which means:
- No direct access to native `ios/` or `android/` directories
- Native modules are handled by Expo SDK and EAS Build
- Configuration is centralized in `app.config.ts` and `eas.json`

### Build Tools

| Tool | Purpose |
|------|---------|
| **Metro** | JavaScript bundler (configured in `metro.config.js`) |
| **Babel** | Transpilation (configured in `babel.config.js`) |
| **TypeScript** | Type checking (`tsconfig.json`) |
| **NativeWind** | CSS-to-RN style compilation |
| **EAS Build** | Cloud-based native builds |
| **EAS Update** | Over-the-air JavaScript updates |

### Local Development

```bash
# Install dependencies
npm install --legacy-peer-deps

# Start development server
npx expo start

# Start on specific platform
npx expo start --ios
npx expo start --android
npx expo start --web

# Type check
npx tsc --noEmit

# Lint
npx eslint . --ext .ts,.tsx

# Format
npx prettier --write "**/*.{ts,tsx,js,json}"

# Test
npm test
```

---

## Environment Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `EXPO_PUBLIC_API_URL` | `http://localhost:3000` | ObjectStack server URL |
| `EXPO_PUBLIC_APP_SCHEME` | `objectstack` | Deep link URL scheme |

### Configuration Files

| File | Purpose |
|------|---------|
| `app.config.ts` | Expo app configuration (dynamic) |
| `app.json` | Expo base configuration (static) |
| `eas.json` | EAS Build/Update profiles |
| `tsconfig.json` | TypeScript compiler options |
| `tailwind.config.js` | Tailwind CSS configuration |
| `babel.config.js` | Babel plugins and presets |
| `metro.config.js` | Metro bundler configuration |
| `.eslintrc.js` | ESLint rules |
| `.prettierrc` | Prettier formatting rules |
| `.env.example` | Environment variable template |

### App Configuration

```typescript
// app.config.ts
export default ({ config }: ConfigContext): ExpoConfig => ({
  name: "ObjectStack Mobile",
  slug: "objectstack-mobile",
  version: "1.0.0",
  orientation: "portrait",
  scheme: process.env.EXPO_PUBLIC_APP_SCHEME ?? "objectstack",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.objectstack.mobile",
  },
  android: {
    adaptiveIcon: { /* ... */ },
    edgeToEdgeEnabled: true,
    package: "com.objectstack.mobile",
  },
  plugins: ["expo-router"],
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000",
  },
});
```

### EAS Configuration

```json
// eas.json
{
  "cli": { "version": ">= 3.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_URL": "https://staging.objectstack.com"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.objectstack.com"
      }
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "...", "ascAppId": "..." },
      "android": { "serviceAccountKeyPath": "..." }
    }
  }
}
```

---

## Development Workflow

### Local Development

```
1. Clone repository
2. npm install --legacy-peer-deps
3. Copy .env.example → .env.local
4. Configure EXPO_PUBLIC_API_URL
5. npx expo start
6. Open on device/simulator
```

### Development Server

```bash
# Start Expo dev server
npx expo start

# Options:
# Press 'i' for iOS simulator
# Press 'a' for Android emulator
# Press 'w' for web browser
# Scan QR code for Expo Go (development only)
```

### Development Build

For native module development, create a development build:

```bash
# iOS development build
eas build --platform ios --profile development

# Android development build
eas build --platform android --profile development
```

---

## EAS Build

### Build Profiles

| Profile | Purpose | Distribution |
|---------|---------|-------------|
| `development` | Dev builds with dev client | Internal (team) |
| `preview` | Staging builds for QA | Internal (TestFlight / APK) |
| `production` | Release builds for stores | Store submission |

### Build Commands

```bash
# Development build (with dev client)
eas build --platform ios --profile development
eas build --platform android --profile development

# Preview build (staging)
eas build --platform ios --profile preview
eas build --platform android --profile preview

# Production build
eas build --platform ios --profile production
eas build --platform android --profile production

# Build both platforms
eas build --platform all --profile production
```

### Build Pipeline

```
Source Code
    ↓
EAS Build (Cloud)
    ├── Install dependencies (npm ci)
    ├── Run prebuild hooks
    ├── Generate native projects
    ├── Compile native code (Xcode / Gradle)
    └── Sign & package
    ↓
Build Artifact
    ├── iOS: .ipa file
    └── Android: .aab / .apk file
```

---

## OTA Updates

### EAS Update

Over-the-air updates allow pushing JavaScript changes without a new app store release:

```bash
# Push update to preview channel
eas update --branch preview --message "Fix list rendering"

# Push update to production channel
eas update --branch production --message "v1.0.1 hotfix"

# Check update status
eas update:list
```

### Update Strategy

| Change Type | Deployment |
|-------------|-----------|
| **JS/TS code changes** | OTA update (instant) |
| **New native modules** | Full store build required |
| **Expo SDK upgrade** | Full store build required |
| **Config changes** | Full store build required |
| **Asset changes** | OTA update |

### Update Channels

| Channel | Branch | Usage |
|---------|--------|-------|
| `development` | `develop` | Development builds |
| `preview` | `staging` | QA / staging builds |
| `production` | `main` | Production app |

---

## App Store Deployment

### iOS (App Store)

```bash
# Submit to App Store Connect
eas submit --platform ios --profile production

# Or submit a specific build
eas submit --platform ios --id <build-id>
```

**Requirements**:
- Apple Developer account
- App Store Connect app record
- Screenshots and metadata
- Privacy policy URL
- App review guidelines compliance

### Android (Google Play)

```bash
# Submit to Google Play Console
eas submit --platform android --profile production

# Or submit a specific build
eas submit --platform android --id <build-id>
```

**Requirements**:
- Google Play Developer account
- Play Console app listing
- Service account key for automated submission
- Privacy policy URL
- Content rating questionnaire

---

## CI/CD Pipeline

### Pipeline Overview (Planned — Phase 5A)

```
Push / PR
    ↓
┌───────────────────────────┐
│  Lint & Type Check         │
│  npx tsc --noEmit          │
│  npx eslint . --ext .ts,.tsx│
└─────────────┬─────────────┘
              ↓
┌───────────────────────────┐
│  Unit & Integration Tests  │
│  npm test -- --coverage    │
└─────────────┬─────────────┘
              ↓
┌───────────────────────────┐
│  Preview Build (on merge)  │
│  eas build --profile preview│
└─────────────┬─────────────┘
              ↓
┌───────────────────────────┐
│  OTA Update (on tag)       │
│  eas update --branch prod  │
└───────────────────────────┘
```

### GitHub Actions Workflows

#### PR Checks

```yaml
# .github/workflows/pr-check.yml
name: PR Check
on: pull_request
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci --legacy-peer-deps
      - run: npx tsc --noEmit
      - run: npx eslint . --ext .ts,.tsx
      - run: npm test -- --coverage --ci
```

#### Build on Merge

```yaml
# .github/workflows/build.yml
name: Build
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: npm ci --legacy-peer-deps
      - run: eas build --platform all --profile preview --non-interactive
```

#### OTA Update on Tag

```yaml
# .github/workflows/update.yml
name: OTA Update
on:
  push:
    tags: ["v*"]
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: npm ci --legacy-peer-deps
      - run: eas update --branch production --message "${{ github.ref_name }}"
```

---

## Versioning Strategy

### Semantic Versioning

```
MAJOR.MINOR.PATCH
  │      │     └── Bug fixes, patches
  │      └──────── New features (backward compatible)
  └─────────────── Breaking changes
```

### Version Bumping

```bash
# Patch (bug fix): 1.0.0 → 1.0.1
npm version patch

# Minor (feature): 1.0.0 → 1.1.0
npm version minor

# Major (breaking): 1.0.0 → 2.0.0
npm version major
```

### Release Milestones

| Version | Content | Status |
|---------|---------|--------|
| `v0.4-alpha` | Phase 4A (rendering, files, charts) | In Progress |
| `v0.5-alpha` | Phase 5A (i18n, performance, tests) | Planned |
| `v0.6-beta` | Phase 4B (permissions, workflows, realtime) | Blocked (SDK) |
| `v0.7-beta` | Phase 5B (AI, server i18n, SDK hooks) | Blocked (SDK) |
| `v1.0-GA` | Phase 6 (monitoring, final optimization) | Planned |

---

## Release Process

### Pre-Release Checklist

- [ ] All PR checks passing (lint, type check, tests)
- [ ] No critical/high severity bugs open
- [ ] Dependencies updated and vulnerability-free
- [ ] Version number bumped in `package.json` and `app.config.ts`
- [ ] CHANGELOG updated
- [ ] Screenshots updated (if UI changes)

### Release Steps

```
1. Create release branch: release/v1.x.x
2. Run full test suite: npm test -- --coverage
3. Bump version: npm version minor
4. Build production: eas build --platform all --profile production
5. Test builds on devices
6. Submit to stores: eas submit --platform all --profile production
7. Tag release: git tag v1.x.x
8. Merge to main
9. Create GitHub release with changelog
10. Monitor crash reports (Sentry)
```

### Rollback Strategy

| Scenario | Action |
|----------|--------|
| **JS bug** | Push OTA update fix via `eas update` |
| **Native crash** | Submit hotfix build to stores |
| **Critical security** | Emergency OTA update + store submission |
| **Store rejection** | Fix issues, resubmit |

---

*This document covers the deployment and CI/CD strategy. See [CONTRIBUTING.md](./CONTRIBUTING.md) for development workflow and [TESTING.md](./TESTING.md) for testing guidelines.*
