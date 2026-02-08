/**
 * Manual mock for react-native-css-interop (NativeWind runtime).
 * Prevents the runtime from initializing Appearance listeners
 * which aren't available in the Jest test environment.
 */
module.exports = {
  cssInterop: function () {},
  remapProps: function () {},
};
