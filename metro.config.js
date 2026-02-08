const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

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
