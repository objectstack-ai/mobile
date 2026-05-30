// Manual mock for expo-device (auto-applied by Jest for node_modules).
// Default to a physical device so push-token acquisition paths are exercised.

module.exports = {
  isDevice: true,
  deviceName: "Test Device",
  osName: "iOS",
  osVersion: "17.0",
};
