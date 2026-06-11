/**
 * Jest setup — provides mocks for native modules that aren't available
 * in a Node.js environment.
 */

/* ---- react-native-css-interop (NativeWind runtime) ---- */
jest.mock("react-native-css-interop", () => ({
  cssInterop: jest.fn(),
  remapProps: jest.fn(),
}));

/* ---- nativewind (color-scheme API used by ui-store / layouts) ---- */
jest.mock("nativewind", () => {
  let scheme: "light" | "dark" | "system" = "system";
  return {
    colorScheme: {
      set: jest.fn((v: "light" | "dark" | "system") => {
        scheme = v;
      }),
      get: jest.fn(() => scheme),
    },
    useColorScheme: () => ({
      colorScheme: scheme === "system" ? "light" : scheme,
      setColorScheme: jest.fn(),
    }),
  };
});

/* ---- expo/fetch (streaming fetch — native module, unloadable in Node) ---- */
jest.mock("expo/fetch", () => ({ fetch: jest.fn() }));

/* ---- expo-clipboard ---- */
jest.mock("expo-clipboard", () => ({
  setStringAsync: jest.fn().mockResolvedValue(true),
  getStringAsync: jest.fn().mockResolvedValue(""),
}));

/* ---- expo-localization ---- */
jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en", regionCode: "US" }],
  getCalendars: () => [{ calendar: "gregory", timeZone: "America/New_York" }],
}));

/* ---- react-native-mmkv ---- */
jest.mock("react-native-mmkv", () => {
  const createStore = () => {
    const map = new Map<string, string>();
    return {
      getString: (key: string) => map.get(key),
      set: (key: string, value: string) => map.set(key, value),
      delete: (key: string) => map.delete(key),
      contains: (key: string) => map.has(key),
      getAllKeys: () => Array.from(map.keys()),
      clearAll: () => map.clear(),
      remove: (key: string) => map.delete(key),
    };
  };
  return {
    MMKV: jest.fn().mockImplementation(createStore),
    createMMKV: jest.fn().mockImplementation(createStore),
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
jest.mock("expo-sqlite", () => {
  const mockDb = {
    execAsync: jest.fn(),
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    runAsync: jest.fn().mockResolvedValue({ changes: 0 }),
    execSync: jest.fn(),
    getAllSync: jest.fn().mockReturnValue([]),
    getFirstSync: jest.fn().mockReturnValue(null),
    runSync: jest.fn().mockReturnValue({ changes: 0 }),
    withTransactionSync: jest.fn((fn: () => void) => fn()),
  };
  return {
    openDatabaseAsync: jest.fn().mockResolvedValue(mockDb),
    openDatabaseSync: jest.fn().mockReturnValue(mockDb),
  };
});

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
  useClient: jest.fn().mockReturnValue({}),
  useQuery: jest.fn().mockReturnValue({ data: null, isLoading: false }),
  useMutation: jest.fn().mockReturnValue({ mutate: jest.fn(), mutateAsync: jest.fn() }),
  usePagination: jest.fn().mockReturnValue({ data: null }),
  useInfiniteQuery: jest.fn().mockReturnValue({ data: null }),
  useMetadata: jest.fn().mockReturnValue({ data: null }),
}));

/* ---- expo-local-authentication ---- */
jest.mock("expo-local-authentication", () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(true),
  isEnrolledAsync: jest.fn().mockResolvedValue(true),
  supportedAuthenticationTypesAsync: jest.fn().mockResolvedValue([1, 2]),
  authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
}));

/* ---- @objectstack/client ---- */
jest.mock("@objectstack/client", () => {
  const MockClient = jest.fn().mockImplementation(() => ({}));
  return {
    createClient: jest.fn().mockReturnValue({}),
    ObjectStackClient: MockClient,
  };
});

/* ---- expo-background-fetch ---- */
jest.mock("expo-background-fetch", () => ({
  registerTaskAsync: jest.fn().mockResolvedValue(undefined),
  unregisterTaskAsync: jest.fn().mockResolvedValue(undefined),
  BackgroundFetchResult: { NoData: 1, NewData: 2, Failed: 3 },
}));

/* ---- expo-task-manager ---- */
jest.mock("expo-task-manager", () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn().mockResolvedValue(false),
}));

/* ---- @sentry/react-native ---- */
jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  captureException: jest.fn().mockReturnValue("mock-event-id"),
  captureMessage: jest.fn().mockReturnValue("mock-event-id"),
  setUser: jest.fn(),
  addBreadcrumb: jest.fn(),
  startSpan: jest.fn((_opts: unknown, cb: (span: unknown) => unknown) =>
    cb({ end: jest.fn() }),
  ),
}));

/* ---- react-native-reanimated ---- */
// Reanimated v4 pulls in react-native-worklets, whose native half throws
// "Worklets isn't initialized" when imported under Node — and the package's
// own bundled mock re-imports the real entrypoint, so it throws too. This
// hand-rolled mock renders Animated.* as plain host components and turns the
// layout-animation builders (FadeInDown.delay().duration()...) into chainable
// no-ops, so screens that use entrance animations mount in tests.
jest.mock("react-native-reanimated", () => {
  const React = require("react");
  const RN = require("react-native");
  // A layout-animation builder: every method returns the same chainable stub,
  // and it's usable both as `FadeInDown` and `FadeInDown.duration(380)`.
  const makeBuilder = () => {
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    for (const m of ["delay", "duration", "springify", "damping", "stiffness",
      "mass", "easing", "withInitialValues", "build", "randomDelay", "reduceMotion"]) {
      builder[m] = chain;
    }
    return builder;
  };
  const animations = new Proxy(
    {},
    { get: () => new Proxy(makeBuilder(), { get: (t, p) => (t as any)[p] ?? (() => t) }) },
  );
  const createAnimatedComponent = (Component: unknown) => Component;
  const Animated = {
    View: RN.View,
    Text: RN.Text,
    ScrollView: RN.ScrollView,
    Image: RN.Image,
    FlatList: RN.FlatList,
    createAnimatedComponent,
  };
  return new Proxy(
    {
      __esModule: true,
      default: Animated,
      createAnimatedComponent,
      useSharedValue: (v: unknown) => ({ value: v }),
      useAnimatedStyle: () => ({}),
      useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
      withTiming: (v: unknown) => v,
      withSpring: (v: unknown) => v,
      withDelay: (_d: unknown, v: unknown) => v,
      withRepeat: (v: unknown) => v,
      withSequence: (v: unknown) => v,
      cancelAnimation: () => {},
      runOnJS: (fn: (...a: unknown[]) => unknown) => fn,
      runOnUI: (fn: (...a: unknown[]) => unknown) => fn,
      Easing: new Proxy({}, { get: () => () => 0 }),
    },
    {
      get: (target: Record<string, unknown>, prop: string) => {
        if (prop in target) return target[prop];
        // FadeInDown, FadeIn, SlideInRight, Layout, etc. → chainable builder.
        return (animations as any)[prop];
      },
    },
  );
});

/* ---- react-native AppState ---- */
const mockAppState = {
  currentState: "active" as string,
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
};
jest.mock("react-native/Libraries/AppState/AppState", () => mockAppState);

/* ---- i18next ---- */
// Initialize the shared i18n instance so components' `t()` calls resolve to
// real (English) strings in tests instead of returning raw keys. Mirrors the
// app, where importing a screen pulls in `~/lib/i18n`; tests render components
// in isolation, so without this the translation layer is never set up.
require("~/lib/i18n");
