/**
 * Tests for useViewSharing – validates sharing configuration,
 * recipients, and computed properties.
 */
import { renderHook, act } from "@testing-library/react-native";
import { useViewSharing, ShareRecipient } from "~/hooks/useViewSharing";

const sampleRecipient: ShareRecipient = {
  id: "u1",
  type: "user",
  accessLevel: "edit",
};

describe("useViewSharing", () => {
  it("returns default state initially", () => {
    const { result } = renderHook(() => useViewSharing());

    expect(result.current.config.shareType).toBe("private");
    expect(result.current.recipients).toEqual([]);
    expect(result.current.isShared).toBe(false);
    expect(result.current.isPublic).toBe(false);
  });

  it("sets config and computes isPublic", () => {
    const { result } = renderHook(() => useViewSharing());

    act(() => {
      result.current.setConfig({
        viewId: "v1",
        shareType: "public",
        accessLevel: "view",
      });
    });

    expect(result.current.isPublic).toBe(true);
  });

  it("adds and removes recipients", () => {
    const { result } = renderHook(() => useViewSharing());

    act(() => {
      result.current.addRecipient(sampleRecipient);
    });

    expect(result.current.recipients).toHaveLength(1);

    act(() => {
      result.current.removeRecipient("u1");
    });

    expect(result.current.recipients).toHaveLength(0);
  });

  it("updates a recipient", () => {
    const { result } = renderHook(() => useViewSharing());

    act(() => {
      result.current.addRecipient(sampleRecipient);
    });

    act(() => {
      result.current.updateRecipient("u1", { accessLevel: "admin" });
    });

    expect(result.current.recipients[0].accessLevel).toBe("admin");
  });

  it("returns empty activeRecipients when config is expired", () => {
    const { result } = renderHook(() => useViewSharing());

    act(() => {
      result.current.setConfig({
        viewId: "v1",
        shareType: "restricted",
        accessLevel: "view",
        expiresAt: "2020-01-01T00:00:00Z",
      });
      result.current.addRecipient(sampleRecipient);
    });

    expect(result.current.activeRecipients).toEqual([]);
  });

  it("returns all recipients when config has no expiry", () => {
    const { result } = renderHook(() => useViewSharing());

    act(() => {
      result.current.addRecipient(sampleRecipient);
      result.current.addRecipient({ id: "g1", type: "group", accessLevel: "view" });
    });

    expect(result.current.activeRecipients).toHaveLength(2);
  });

  it("sets isShared flag", () => {
    const { result } = renderHook(() => useViewSharing());

    act(() => {
      result.current.setIsShared(true);
    });

    expect(result.current.isShared).toBe(true);
  });
});
