/**
 * Jest configuration for E2E screen-level tests.
 *
 * These tests render full screen components and exercise complete
 * user journeys (auth, navigation, CRUD) using MSW mocks.
 *
 * Usage:
 *   npx jest --config jest.e2e.config.js
 */
const baseConfig = require("./jest.config");

module.exports = {
  ...baseConfig,
  testMatch: ["**/__tests__/e2e/**/*.e2e.test.(ts|tsx)"],
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/server/hotcrm/"],
  // Initialize i18n on top of the base setup so rendered screens show their
  // real copy instead of raw translation keys.
  setupFilesAfterEnv: [
    ...baseConfig.setupFilesAfterEnv,
    "<rootDir>/__tests__/e2e/e2e.setup.ts",
  ],
  testTimeout: 10_000,
};
