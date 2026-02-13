# Maestro E2E Tests
#
# Installation: curl -Ls "https://get.maestro.mobile.dev" | bash
# Run all:     maestro test .maestro/
# Run single:  maestro test .maestro/auth-flow.yaml
#
# Flows cover the critical user journeys for the 5-tab layout:
#
# - auth-flow.yaml       Sign in / sign out (via More tab)
# - app-navigation.yaml  All 5 tabs: Home, Search, Apps, Notifications, More
# - record-list.yaml     App discovery, list view, search
# - record-crud.yaml     Create, read, update, delete records
#
# Prerequisites:
#   1. Running Expo dev server (`pnpm start`)
#   2. iOS Simulator or Android Emulator with the app installed
#   3. Backend server running (for real data) or test seed data
#
# Jest-based E2E screen tests (run without a device):
#   pnpm test:e2e
#
# See: https://maestro.mobile.dev/reference/configuration
