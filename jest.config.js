module.exports = {
  preset: "jest-expo",
  setupFiles: ["<rootDir>/jest.setup.ts"],
  setupFilesAfterEnv: ["@testing-library/react-native/extend-expect"],
  transformIgnorePatterns: [
    "node_modules/(?!(\\.pnpm/|((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|nativewind|react-native-css-interop|@objectstack/.*|@shopify/flash-list|i18next|react-i18next|expo-localization|expo-image|msw|until-async|@bundled-es-modules|@mswjs|@open-draft|outvariant|strict-event-emitter|headers-polyfill))",
  ],
  moduleNameMapper: {
    "^~/(.*)$": "<rootDir>/$1",
    "^expo-modules-core/src/(.*)$":
      "<rootDir>/node_modules/expo-modules-core/src/$1",
    "^react-native-css-interop/src/runtime/jsx-runtime$":
      "<rootDir>/__mocks__/nativewind-jsx-runtime.js",
    "^react-native-css-interop/src/runtime/jsx-dev-runtime$":
      "<rootDir>/__mocks__/nativewind-jsx-runtime.js",
    "^react-native-css-interop$":
      "<rootDir>/__mocks__/react-native-css-interop.js",
    "^msw/node$": "<rootDir>/node_modules/msw/lib/node/index.js",
    "^msw$": "<rootDir>/node_modules/msw/lib/core/index.js",
  },
  testMatch: [
    "**/__tests__/**/*.(test|spec).(ts|tsx)",
    "**/*.(test|spec).(ts|tsx)",
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "\\.integration\\.test\\.(ts|tsx)$",
    "<rootDir>/server/hotcrm/",
  ],
  collectCoverageFrom: [
    "lib/**/*.{ts,tsx}",
    "hooks/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
    "stores/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/index.ts",
  ],
  coverageThreshold: {
    global: {
      statements: 10,
      branches: 10,
      functions: 10,
      lines: 10,
    },
    "./lib/": {
      statements: 80,
      branches: 60,
      functions: 80,
      lines: 80,
    },
    "./stores/": {
      statements: 80,
      branches: 40,
      functions: 80,
      lines: 80,
    },
  },
};
