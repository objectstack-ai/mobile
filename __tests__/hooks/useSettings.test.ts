/**
 * Tests for useSettings – validates settings management,
 * update, reset, cache clearing, and diagnostics export.
 */
import { renderHook, act } from "@testing-library/react-native";

jest.mock("@objectstack/client-react", () => ({
  useClient: () => ({}),
}));

import { useSettings } from "~/hooks/useSettings";

describe("useSettings", () => {
  it("returns default settings", () => {
    const { result } = renderHook(() => useSettings());

    expect(result.current.settings.theme).toBe("system");
    expect(result.current.settings.language).toBe("en");
    expect(result.current.settings.notificationsEnabled).toBe(true);
    expect(result.current.settings.biometricEnabled).toBe(false);
    expect(result.current.settings.cacheSize).toBe(0);
    expect(result.current.settings.hapticFeedback).toBe(true);
    expect(result.current.settings.reducedMotion).toBe(false);
    expect(result.current.settings.dynamicType).toBe(true);
    expect(result.current.settings.compactMode).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it("updateSetting changes a single key", () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.updateSetting("theme", "dark");
    });

    expect(result.current.settings.theme).toBe("dark");
    expect(result.current.settings.language).toBe("en");
  });

  it("updateSetting changes multiple keys independently", () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.updateSetting("language", "fr");
    });
    act(() => {
      result.current.updateSetting("hapticFeedback", false);
    });

    expect(result.current.settings.language).toBe("fr");
    expect(result.current.settings.hapticFeedback).toBe(false);
  });

  it("resetSettings restores defaults", () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.updateSetting("theme", "dark");
      result.current.updateSetting("compactMode", true);
    });

    act(() => {
      result.current.resetSettings();
    });

    expect(result.current.settings.theme).toBe("system");
    expect(result.current.settings.compactMode).toBe(false);
  });

  it("clearCache resets cacheSize and manages loading state", async () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.updateSetting("cacheSize", 500);
    });

    expect(result.current.settings.cacheSize).toBe(500);

    await act(async () => {
      await result.current.clearCache();
    });

    expect(result.current.settings.cacheSize).toBe(0);
    expect(result.current.isLoading).toBe(false);
  });

  it("exportDiagnostics returns device info stub", async () => {
    const { result } = renderHook(() => useSettings());

    let diagnostics: Record<string, unknown> = {};
    await act(async () => {
      diagnostics = await result.current.exportDiagnostics();
    });

    expect(diagnostics).toHaveProperty("platform");
    expect(diagnostics).toHaveProperty("version");
    expect(diagnostics).toHaveProperty("settings");
    expect(diagnostics).toHaveProperty("timestamp");
  });
});
