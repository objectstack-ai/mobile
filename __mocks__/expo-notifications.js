// Manual mock for expo-notifications (auto-applied by Jest for node_modules).
// Mirrors the subset of the API used by lib/push-notifications.ts and
// hooks/usePushNotifications.ts.

const granted = {
  granted: true,
  status: "granted",
  canAskAgain: true,
  expires: "never",
};

module.exports = {
  AndroidImportance: { DEFAULT: 3, HIGH: 4, MAX: 5, LOW: 2, MIN: 1, NONE: 0 },
  AndroidNotificationVisibility: { PRIVATE: 0, PUBLIC: 1, SECRET: -1, UNKNOWN: 0 },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(async () => granted),
  requestPermissionsAsync: jest.fn(async () => granted),
  getExpoPushTokenAsync: jest.fn(async () => ({ type: "expo", data: "ExponentPushToken[test]" })),
  getDevicePushTokenAsync: jest.fn(async () => ({ type: "ios", data: "device-token" })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationsDroppedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
};
