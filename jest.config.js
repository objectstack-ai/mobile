module.exports = {
  preset: "jest-expo",
  setupFiles: ["./jest.setup.ts"],
  setupFilesAfterEnv: ["@testing-library/react-native/extend-expect"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|nativewind|react-native-css-interop|@objectstack/.*|@shopify/flash-list|i18next|react-i18next|expo-localization|expo-image)",
  ],
  moduleNameMapper: {
    "^~/(.*)$": "<rootDir>/$1",
    "^expo-modules-core/src/(.*)$":
      "<rootDir>/node_modules/expo-modules-core/src/$1",
  },
  testMatch: [
    "**/__tests__/**/*.(test|spec).(ts|tsx)",
    "**/*.(test|spec).(ts|tsx)",
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
      statements: 50,
      branches: 40,
      functions: 50,
      lines: 50,
    },
  },
};
