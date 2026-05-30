// Manual mock for expo-device (auto-applied by Jest for node_modules).
// Defaults to a physical device so push-token acquisition paths are exercised.
//
// `__esModule: true` is essential: the lib imports this as a namespace
// (`import * as Device`). Babel's interopRequireWildcard returns an ESM-flagged
// object *by reference* (no property copy), so a test mutating `isDevice` via
// the requireMock handle is observed by the code under test. Without the flag,
// interop snapshots the values onto a new object and mutations are lost.
module.exports = {
  __esModule: true,
  isDevice: true,
  deviceName: "Test Device",
  osName: "iOS",
  osVersion: "17.0",
};
