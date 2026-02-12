/**
 * Tests for useContextualActions – validates detection of actionable
 * fields and URL scheme execution.
 */
import { renderHook, act } from "@testing-library/react-native";

/* ---- Mock expo-linking ---- */
jest.mock("expo-linking", () => ({ openURL: jest.fn() }));

/* ---- Mock useClient from SDK (not used but required by module system) ---- */
jest.mock("@objectstack/client-react", () => ({
  useClient: () => ({}),
}));

import * as Linking from "expo-linking";
import { useContextualActions } from "~/hooks/useContextualActions";

beforeEach(() => {
  (Linking.openURL as jest.Mock).mockReset();
});

describe("useContextualActions", () => {
  it("starts with empty actions", () => {
    const { result } = renderHook(() => useContextualActions());

    expect(result.current.actions).toEqual([]);
  });

  it("detectActions identifies phone fields", () => {
    const { result } = renderHook(() => useContextualActions());

    let detected: unknown;
    act(() => {
      detected = result.current.detectActions([
        { name: "mobile", type: "phone", value: "+1234567890" },
      ]);
    });

    expect(detected).toEqual([
      {
        type: "phone",
        label: "Call mobile",
        value: "+1234567890",
        field: "mobile",
      },
    ]);
    expect(result.current.actions).toEqual(detected);
  });

  it("detectActions identifies email fields", () => {
    const { result } = renderHook(() => useContextualActions());

    let detected: unknown;
    act(() => {
      detected = result.current.detectActions([
        { name: "email", type: "email", value: "user@example.com" },
      ]);
    });

    expect(detected).toEqual([
      {
        type: "email",
        label: "Email email",
        value: "user@example.com",
        field: "email",
      },
    ]);
  });

  it("detectActions identifies url fields", () => {
    const { result } = renderHook(() => useContextualActions());

    let detected: unknown;
    act(() => {
      detected = result.current.detectActions([
        { name: "website", type: "url", value: "https://example.com" },
      ]);
    });

    expect(detected).toEqual([
      {
        type: "url",
        label: "Open website",
        value: "https://example.com",
        field: "website",
      },
    ]);
  });

  it("detectActions identifies address fields", () => {
    const { result } = renderHook(() => useContextualActions());

    let detected: unknown;
    act(() => {
      detected = result.current.detectActions([
        { name: "location", type: "address", value: "123 Main St" },
      ]);
    });

    expect(detected).toEqual([
      {
        type: "address",
        label: "Map location",
        value: "123 Main St",
        field: "location",
      },
    ]);
  });

  it("detectActions skips empty and null values", () => {
    const { result } = renderHook(() => useContextualActions());

    let detected: unknown;
    act(() => {
      detected = result.current.detectActions([
        { name: "phone", type: "phone", value: null },
        { name: "email", type: "email", value: "" },
        { name: "notes", type: "text", value: "Some note" },
      ]);
    });

    expect(detected).toEqual([]);
  });

  it("detectActions handles multiple fields", () => {
    const { result } = renderHook(() => useContextualActions());

    let detected: unknown;
    act(() => {
      detected = result.current.detectActions([
        { name: "phone", type: "phone", value: "+1234567890" },
        { name: "email", type: "email", value: "test@test.com" },
        { name: "website", type: "url", value: "https://test.com" },
        { name: "office", type: "address", value: "456 Oak Ave" },
      ]);
    });

    expect((detected as unknown[]).length).toBe(4);
  });

  it("executeAction opens tel: URL for phone", async () => {
    (Linking.openURL as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useContextualActions());

    await act(async () => {
      await result.current.executeAction({
        type: "phone",
        label: "Call mobile",
        value: "+1234567890",
        field: "mobile",
      });
    });

    expect(Linking.openURL).toHaveBeenCalledWith("tel:+1234567890");
  });

  it("executeAction opens mailto: URL for email", async () => {
    (Linking.openURL as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useContextualActions());

    await act(async () => {
      await result.current.executeAction({
        type: "email",
        label: "Email email",
        value: "user@example.com",
        field: "email",
      });
    });

    expect(Linking.openURL).toHaveBeenCalledWith("mailto:user@example.com");
  });

  it("executeAction opens https: URL for url", async () => {
    (Linking.openURL as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useContextualActions());

    await act(async () => {
      await result.current.executeAction({
        type: "url",
        label: "Open website",
        value: "https://example.com",
        field: "website",
      });
    });

    expect(Linking.openURL).toHaveBeenCalledWith("https://example.com");
  });

  it("executeAction prepends https for url without protocol", async () => {
    (Linking.openURL as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useContextualActions());

    await act(async () => {
      await result.current.executeAction({
        type: "url",
        label: "Open website",
        value: "example.com",
        field: "website",
      });
    });

    expect(Linking.openURL).toHaveBeenCalledWith("https://example.com");
  });

  it("executeAction opens maps: URL for address", async () => {
    (Linking.openURL as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useContextualActions());

    await act(async () => {
      await result.current.executeAction({
        type: "address",
        label: "Map location",
        value: "123 Main St",
        field: "location",
      });
    });

    expect(Linking.openURL).toHaveBeenCalledWith(
      `maps:?q=${encodeURIComponent("123 Main St")}`,
    );
  });

  it("executeAction sanitizes phone numbers", async () => {
    (Linking.openURL as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useContextualActions());

    await act(async () => {
      await result.current.executeAction({
        type: "phone",
        label: "Call mobile",
        value: "+1 (234) 567-890",
        field: "mobile",
      });
    });

    expect(Linking.openURL).toHaveBeenCalledWith("tel:+1234567890");
  });

  it("executeAction rejects invalid email", async () => {
    const { result } = renderHook(() => useContextualActions());

    await act(async () => {
      await expect(
        result.current.executeAction({
          type: "email",
          label: "Email",
          value: "not-an-email",
          field: "email",
        }),
      ).rejects.toThrow("Invalid email address");
    });
  });
});
