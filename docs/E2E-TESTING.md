# E2E Testing Guide

> **Last Updated**: 2026-02-09
> **Testing Framework**: Maestro
> **Coverage**: Critical user journeys

---

## Overview

The ObjectStack Mobile app uses [Maestro](https://maestro.mobile.dev/) for End-to-End (E2E) testing. Maestro provides a simple, declarative YAML-based syntax for defining mobile app flows and is designed specifically for React Native and Flutter applications.

## Prerequisites

### 1. Install Maestro

```bash
# macOS/Linux
curl -Ls "https://get.maestro.mobile.dev" | bash

# Verify installation
maestro --version
```

### 2. Platform-Specific Requirements

#### iOS
- Xcode installed
- iOS Simulator available
- `xcrun simctl list` shows available devices

#### Android
- Android Studio installed
- Android emulator available or physical device connected
- `adb devices` shows connected devices

### 3. Build the App

Before running E2E tests, build the app for your target platform:

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

## Test Flows

The E2E test suite is located in `.maestro/` and consists of the following test flows:

### 1. Authentication Flow (`auth-flow.yaml`)

**Purpose**: Verifies the complete authentication cycle.

**Coverage**:
- ✅ Sign in with email/password
- ✅ Landing on home screen after authentication
- ✅ Navigation to profile tab
- ✅ Sign out functionality
- ✅ Return to sign-in screen after logout

**Expected Duration**: ~15 seconds

**How to Run**:
```bash
maestro test .maestro/auth-flow.yaml
```

### 2. App Navigation Flow (`app-navigation.yaml`)

**Purpose**: Verifies tab bar navigation and basic UI presence.

**Coverage**:
- ✅ Sign in first
- ✅ Navigate to Apps tab
- ✅ Navigate to Notifications tab
- ✅ Navigate to Profile tab
- ✅ Return to Home tab

**Expected Duration**: ~20 seconds

**How to Run**:
```bash
maestro test .maestro/app-navigation.yaml
```

### 3. Record List Flow (`record-list.yaml`)

**Purpose**: Verifies object list view rendering and interactions.

**Coverage**:
- ✅ Navigate to an object list view
- ✅ Verify records are displayed
- ✅ Search functionality
- ✅ Sort functionality
- ✅ Filter drawer (if implemented)
- ✅ Pull-to-refresh

**Expected Duration**: ~25 seconds

**How to Run**:
```bash
maestro test .maestro/record-list.yaml
```

### 4. Record CRUD Flow (`record-crud.yaml`)

**Purpose**: Verifies create, read, update, and delete operations.

**Coverage**:
- ✅ Create a new record
- ✅ View record details
- ✅ Edit a record
- ✅ Delete a record
- ✅ Verify changes persist

**Expected Duration**: ~30 seconds

**How to Run**:
```bash
maestro test .maestro/record-crud.yaml
```

## Running All Tests

### Run All Flows Sequentially

```bash
maestro test .maestro/
```

This will execute all YAML files in the `.maestro/` directory in alphabetical order.

### Run Specific Flow

```bash
maestro test .maestro/auth-flow.yaml
```

### Run with Recording

Maestro can record your test execution as a video:

```bash
maestro test --format junit .maestro/
```

### Run in CI/CD

Maestro can be integrated into GitHub Actions or other CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Maestro Tests
  uses: mobile-dev-inc/action-maestro-cloud@v1
  with:
    api-key: ${{ secrets.MAESTRO_CLOUD_API_KEY }}
    app-file: app.ipa  # or app.apk
```

## Test Data Requirements

### Backend Server

E2E tests assume a running ObjectStack backend server with:

1. **Test User Account**:
   - Email: `test@example.com`
   - Password: `password123`

2. **Sample Objects**:
   - At least one installed package with objects
   - Sample records for testing CRUD operations

3. **Server Configuration**:
   - Server must be accessible from the mobile device/simulator
   - API endpoint configured in app (e.g., `https://demo.objectstack.dev` or `http://localhost:3000`)

### Local Development

For local testing, you can use the ObjectStack test environment:

```bash
# Option 1: Use demo server
export OBJECTSTACK_API_URL=https://demo.objectstack.dev

# Option 2: Run local server
cd ../objectstack-server
npm run dev

# Update app.config.ts to point to local server
# extra.apiUrl = "http://localhost:3000"
```

## Troubleshooting

### Common Issues

#### 1. "App not found" Error

**Solution**: Make sure the app is installed on the simulator/emulator:
```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

#### 2. Element Not Found

**Solution**: Increase timeout values in YAML:
```yaml
- assertVisible:
    text: "Home"
    timeout: 15000  # Increased from default 10000ms
```

#### 3. Authentication Fails

**Solution**: Verify test credentials exist in the backend:
- Email: `test@example.com`
- Password: `password123`

Or update credentials in all test YAML files to match your environment.

#### 4. Slow Test Execution

**Solution**: 
- Close other apps on simulator/emulator
- Use a release build instead of debug build
- Reduce animations in simulator settings

### Debugging Tips

1. **Enable Debug Logs**:
   ```bash
   maestro test --debug .maestro/auth-flow.yaml
   ```

2. **Run in Studio Mode** (Interactive):
   ```bash
   maestro studio
   ```
   This opens an interactive UI where you can manually execute commands and build flows.

3. **Take Screenshots**:
   Add to your YAML:
   ```yaml
   - takeScreenshot: debug-screenshot
   ```

4. **Add Wait Commands**:
   If tests are flaky, add explicit waits:
   ```yaml
   - waitForAnimationToEnd
   ```

## Test Coverage

### Current Coverage

Based on the ROADMAP, the following features should be covered by E2E tests:

- [x] Authentication (sign in/sign out)
- [x] Tab navigation
- [x] App discovery
- [x] Object list views
- [x] Record CRUD operations
- [ ] Search and filtering
- [ ] Sorting
- [ ] Batch operations
- [ ] File upload/download
- [ ] Offline mode
- [ ] Biometric authentication

### Expanding Coverage

To add new test flows:

1. Create a new YAML file in `.maestro/` (e.g., `offline-mode.yaml`)
2. Follow the Maestro YAML syntax
3. Test locally with `maestro test .maestro/offline-mode.yaml`
4. Add to this documentation

Example template:

```yaml
# New Flow
appId: com.objectstack.mobile

---

- launchApp
- assertVisible: "Expected Element"

# Add your test steps here
```

## Best Practices

### 1. Keep Tests Independent

Each test should be able to run standalone without depending on others:
```yaml
# ✅ Good: Start fresh each time
- launchApp
- clearState  # or clearKeychain on iOS

# ❌ Bad: Assume previous test state
```

### 2. Use Explicit Waits

Don't rely on implicit timing:
```yaml
# ✅ Good: Wait for specific element
- assertVisible:
    text: "Dashboard"
    timeout: 10000

# ❌ Bad: Generic sleep
- sleep: 5000
```

### 3. Test Happy Path First

Focus on critical user journeys before edge cases:
- Sign in → Browse → CRUD → Sign out

### 4. Name Elements Clearly

Use unique, descriptive text for UI elements to make tests maintainable.

### 5. Clean Up Test Data

If tests create data, clean it up:
```yaml
# Create record
- tapOn: "New Record"
# ... test steps ...

# Clean up
- tapOn: "Delete"
- tapOn: "Confirm"
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on:
  pull_request:
  push:
    branches: [main, develop]

jobs:
  e2e-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build iOS app
        run: npx expo run:ios --configuration Release
      
      - name: Install Maestro
        run: curl -Ls "https://get.maestro.mobile.dev" | bash
      
      - name: Run E2E tests
        run: maestro test .maestro/

  e2e-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up JDK
        uses: actions/setup-java@v4
        with:
          java-version: '17'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build Android app
        run: npx expo run:android --variant Release
      
      - name: Install Maestro
        run: curl -Ls "https://get.maestro.mobile.dev" | bash
      
      - name: Run E2E tests
        run: maestro test .maestro/
```

## Next Steps

To complete Phase 6.3 (Final Optimization), the following E2E test work is recommended:

1. **Enhance Existing Flows**:
   - Add more assertions to verify UI state
   - Test error scenarios (invalid login, network errors)
   - Add performance timing measurements

2. **Add New Test Flows**:
   - `file-upload.yaml` - Test file picker and upload
   - `offline-sync.yaml` - Test offline mode and sync
   - `biometric-auth.yaml` - Test Face ID/Touch ID
   - `batch-operations.yaml` - Test multi-select and batch delete

3. **Setup CI/CD**:
   - Configure GitHub Actions workflow
   - Set up test environment/backend
   - Configure secrets for test credentials

4. **Test Metrics**:
   - Track test execution time
   - Monitor flaky tests
   - Generate test reports

## References

- [Maestro Documentation](https://maestro.mobile.dev/)
- [Maestro Cloud](https://cloud.mobile.dev/)
- [Expo Testing Guide](https://docs.expo.dev/develop/unit-testing/)
- [ObjectStack Mobile ROADMAP](./ROADMAP.md)
