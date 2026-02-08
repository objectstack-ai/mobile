/**
 * Jest setup — provides mocks for native modules that aren't available
 * in a Node.js environment.
 */

/* ---- expo-localization ---- */
jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en", regionCode: "US" }],
  getCalendars: () => [{ calendar: "gregory", timeZone: "America/New_York" }],
}));

/* ---- react-native-mmkv ---- */
jest.mock("react-native-mmkv", () => {
  const store = new Map<string, string>();
  return {
    MMKV: jest.fn().mockImplementation(() => ({
      getString: (key: string) => store.get(key),
      set: (key: string, value: string) => store.set(key, value),
      delete: (key: string) => store.delete(key),
      contains: (key: string) => store.has(key),
      getAllKeys: () => Array.from(store.keys()),
    })),
  };
});

/* ---- expo-secure-store ---- */
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

/* ---- expo-network ---- */
jest.mock("expo-network", () => ({
  getNetworkStateAsync: jest.fn().mockResolvedValue({
    isConnected: true,
    type: "wifi",
  }),
  NetworkStateType: { WIFI: "wifi", CELLULAR: "cellular" },
}));

/* ---- expo-sqlite ---- */
jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue({
    execAsync: jest.fn(),
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    runAsync: jest.fn().mockResolvedValue({ changes: 0 }),
  }),
}));

/* ---- expo-haptics ---- */
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
}));

/* ---- expo-image ---- */
jest.mock("expo-image", () => {
  const { View } = require("react-native");
  return { Image: View };
});

/* ---- @shopify/flash-list ---- */
jest.mock("@shopify/flash-list", () => {
  const { FlatList } = require("react-native");
  return { FlashList: FlatList };
});

/* ---- lucide-react-native (stub all icons) ---- */
jest.mock("lucide-react-native", () => {
  const { View } = require("react-native");
  return new Proxy(
    {},
    {
      get: (_target: unknown, prop: string) => {
        if (prop === "__esModule") return true;
        return View;
      },
    },
  );
});

/* ---- expo-router ---- */
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useSegments: () => [],
  useLocalSearchParams: () => ({}),
  Link: ({ children }: { children: React.ReactNode }) => children,
  Stack: { Screen: () => null },
}));

/* ---- @objectstack/client-react ---- */
jest.mock("@objectstack/client-react", () => ({
  ObjectStackProvider: ({ children }: { children: React.ReactNode }) => children,
  useObject: jest.fn().mockReturnValue({ data: null }),
  useView: jest.fn().mockReturnValue({ data: null }),
  useFields: jest.fn().mockReturnValue({ data: [] }),
}));

/* ---- @objectstack/client ---- */
jest.mock("@objectstack/client", () => ({
  createClient: jest.fn().mockReturnValue({}),
}));
