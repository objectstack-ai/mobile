/**
 * Jest configuration for server integration tests.
 *
 * These tests run against a live HotCRM server and must NOT be included
 * in the normal unit-test run (which uses MSW mocks).
 *
 * Usage:
 *   npx jest --config jest.integration.config.js
 */
module.exports = {
  // Minimal preset — no React Native or Expo transforms needed
  testEnvironment: "node",

  // Only match the server integration tests
  testMatch: [
    "**/__tests__/integration/server/**/*.integration.test.(ts|tsx)",
  ],

  // TypeScript transform
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
        // Skip type checking for speed — these are runtime tests
        diagnostics: false,
      },
    ],
  },

  // Longer timeout — real network I/O
  testTimeout: 30_000,
};
