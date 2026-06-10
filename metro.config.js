const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

/* ---- nativewind / react-native-css-interop resolution (pnpm) ----
 * nativewind's JSX runtime re-imports `react-native-css-interop`, but pnpm
 * nests it under nativewind's own store entry rather than the project root, so
 * Metro (notably on web) can't resolve `react-native-css-interop/jsx-runtime`
 * from the app's files. Alias the package to its real location, resolved from
 * nativewind's context, so every subpath (jsx-runtime, jsx-dev-runtime, …)
 * resolves regardless of the pnpm layout. */
try {
  const nativewindDir = path.dirname(require.resolve("nativewind/package.json"));
  const cssInteropDir = path.dirname(
    require.resolve("react-native-css-interop/package.json", { paths: [nativewindDir] }),
  );
  config.resolver = {
    ...config.resolver,
    extraNodeModules: {
      ...config.resolver?.extraNodeModules,
      "react-native-css-interop": cssInteropDir,
    },
  };
} catch {
  // If it's already hoisted to the project root, the default resolver handles it.
}

/* ---- Tree shaking & import optimization ---- */
config.transformer = {
  ...config.transformer,
  experimentalImportSupport: true,
  // Strip unused exports during bundling
  minifierConfig: {
    ...config.transformer?.minifierConfig,
    compress: {
      ...config.transformer?.minifierConfig?.compress,
      dead_code: true,
      drop_console: process.env.NODE_ENV === "production",
      unused: true,
    },
  },
};

module.exports = withNativeWind(config, { input: "./global.css" });
