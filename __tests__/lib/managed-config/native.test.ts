/**
 * The binding to the local `managed-config` native module, with the module
 * mocked: what each read returns, and when a new read happens.
 */
const mockRemoveNative = jest.fn();
const mockNative = {
  getManagedConfig: jest.fn<Record<string, unknown>, []>(),
  addListener: jest.fn((_event: string, _listener: () => void) => ({ remove: mockRemoveNative })),
};
let mockModule: typeof mockNative | null = mockNative;
const mockRequireOptional = jest.fn((_name: string) => mockModule);
jest.mock("expo-modules-core", () => ({
  requireOptionalNativeModule: (name: string) => mockRequireOptional(name),
}));

// jest.setup.ts mocks this module without a `default`, which is what
// `react-native`'s `AppState` getter reads; give it one for this file.
jest.mock("react-native/Libraries/AppState/AppState", () => {
  const appState = {
    currentState: "active",
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  };
  return { __esModule: true, default: appState, ...appState };
});

import { AppState } from "react-native";
import { readManagedConfig, subscribeManagedConfig } from "~/lib/managed-config/native";
import { NO_MANAGED_CONFIG } from "~/lib/managed-config/model";

const mockAppState = AppState as unknown as {
  addEventListener: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockModule = mockNative;
  mockNative.getManagedConfig.mockReturnValue({});
});

describe("readManagedConfig", () => {
  it("reads the native module by its registered name", () => {
    mockNative.getManagedConfig.mockReturnValue({
      serverUrl: "https://erp.example.com",
      lockServer: true,
    });
    expect(readManagedConfig()).toEqual({ serverUrl: "https://erp.example.com", lockServer: true });
    expect(mockRequireOptional).toHaveBeenCalledWith("ManagedConfig");
  });

  it("is no managed config without the native module (web, Expo Go, an older build)", () => {
    mockModule = null;
    expect(readManagedConfig()).toEqual(NO_MANAGED_CONFIG);
  });

  it("is no managed config when the native read throws", () => {
    mockNative.getManagedConfig.mockImplementation(() => {
      throw new Error("boom");
    });
    expect(readManagedConfig()).toEqual(NO_MANAGED_CONFIG);
  });
});

describe("subscribeManagedConfig", () => {
  it("reads again when the app becomes active, and on the native change event", () => {
    const onRead = jest.fn();
    const stop = subscribeManagedConfig(onRead);

    const [event, onAppState] = mockAppState.addEventListener.mock.calls[0];
    expect(event).toBe("change");
    mockNative.getManagedConfig.mockReturnValue({ serverUrl: "https://erp.example.com" });
    onAppState("background");
    expect(onRead).not.toHaveBeenCalled();
    onAppState("active");
    expect(onRead).toHaveBeenLastCalledWith({
      serverUrl: "https://erp.example.com",
      lockServer: false,
    });

    const [nativeEvent, onNative] = mockNative.addListener.mock.calls[0];
    expect(nativeEvent).toBe("onChange");
    mockNative.getManagedConfig.mockReturnValue({
      serverUrl: "https://erp.example.com",
      lockServer: true,
    });
    onNative();
    expect(onRead).toHaveBeenLastCalledWith({
      serverUrl: "https://erp.example.com",
      lockServer: true,
    });

    stop();
    expect(mockRemoveNative).toHaveBeenCalledTimes(1);
    expect(mockAppState.addEventListener.mock.results[0].value.remove).toHaveBeenCalledTimes(1);
  });

  it("still follows the foreground without the native module", () => {
    mockModule = null;
    const onRead = jest.fn();
    subscribeManagedConfig(onRead)();
    expect(mockAppState.addEventListener).toHaveBeenCalledTimes(1);
    expect(mockNative.addListener).not.toHaveBeenCalled();
  });
});
