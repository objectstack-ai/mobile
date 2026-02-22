/**
 * Tests for useEmbedConfig – validates embed configuration,
 * permissions, and computed values.
 */
import { renderHook, act } from "@testing-library/react-native";
import { useEmbedConfig } from "~/hooks/useEmbedConfig";

describe("useEmbedConfig", () => {
  it("returns default state initially", () => {
    const { result } = renderHook(() => useEmbedConfig());

    expect(result.current.config.viewId).toBe("");
    expect(result.current.isEmbedded).toBe(false);
    expect(result.current.isInteractive).toBe(true);
  });

  it("sets config and computes embed URL", () => {
    const { result } = renderHook(() => useEmbedConfig());

    act(() => {
      result.current.setConfig({
        viewId: "v1",
        width: 800,
        height: 600,
        theme: "dark",
        allowInteraction: true,
        showToolbar: false,
        showHeader: true,
        responsive: true,
      });
    });

    expect(result.current.getEmbedUrl).toContain("viewId=v1");
    expect(result.current.getEmbedUrl).toContain("width=800");
    expect(result.current.getEmbedUrl).toContain("theme=dark");
  });

  it("computes isInteractive from allowInteraction", () => {
    const { result } = renderHook(() => useEmbedConfig());

    act(() => {
      result.current.setConfig({
        viewId: "v1",
        width: 800,
        height: 600,
        theme: "light",
        allowInteraction: false,
        showToolbar: true,
        showHeader: true,
        responsive: false,
      });
    });

    expect(result.current.isInteractive).toBe(false);
  });

  it("sets permissions", () => {
    const { result } = renderHook(() => useEmbedConfig());

    act(() => {
      result.current.setPermissions({
        canView: true,
        canEdit: true,
        canShare: false,
        canExport: false,
      });
    });

    expect(result.current.permissions.canEdit).toBe(true);
  });

  it("sets isEmbedded flag", () => {
    const { result } = renderHook(() => useEmbedConfig());

    act(() => {
      result.current.setIsEmbedded(true);
    });

    expect(result.current.isEmbedded).toBe(true);
  });
});
