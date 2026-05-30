// Manual mock for expo-device (auto-applied by Jest for node_modules).
// Defaults to a physical device so push-token acquisition paths are exercised.
//
// `isDevice` is exposed as a getter/setter over a shared backing variable.
// The lib imports the module as a namespace (`import * as Device`), which Babel
// resolves via interopRequireWildcard — that COPIES property descriptors onto a
// new namespace object. A plain value would be snapshotted at import time and
// could never be changed by tests; a getter/setter descriptor is copied intact,
// so both the original mock and the lib's namespace read the same closure.

let _isDevice = true;

module.exports = {
  get isDevice() {
    return _isDevice;
  },
  set isDevice(value) {
    _isDevice = value;
  },
  deviceName: "Test Device",
  osName: "iOS",
  osVersion: "17.0",
};
