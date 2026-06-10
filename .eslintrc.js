module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaFeatures: { jsx: true },
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "react", "react-hooks"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier",
  ],
  settings: {
    react: {
      version: "detect",
    },
  },
  rules: {
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
  },
  overrides: [
    {
      files: ["__tests__/**", "jest.setup.ts"],
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-var-requires": "off",
        // typescript-eslint v8 `recommended` flags require() via this rule;
        // tests legitimately use require() for module mocking / lazy loads.
        "@typescript-eslint/no-require-imports": "off",
      },
    },
    {
      // Jest manual mocks are CommonJS modules (module.exports / require) that
      // run in the Node test environment — give them the right globals so the
      // `no-undef` / require rules don't flag legitimate mock plumbing.
      files: ["__mocks__/**"],
      env: { node: true, jest: true },
      rules: {
        "@typescript-eslint/no-require-imports": "off",
        "@typescript-eslint/no-var-requires": "off",
      },
    },
  ],
  ignorePatterns: ["node_modules/", ".expo/", "dist/", "*.config.js", "babel.config.js", "server/hotcrm/"],
};
