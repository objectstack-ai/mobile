/**
 * Tests for useAppDiscovery – validates package/app discovery
 * via client.packages.list().
 */
import { renderHook, act, waitFor } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockPackagesList = jest.fn();

const mockClient = {
  packages: {
    list: mockPackagesList,
  },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useAppDiscovery } from "~/hooks/useAppDiscovery";

beforeEach(() => {
  mockPackagesList.mockReset();
});

describe("useAppDiscovery", () => {
  it("fetches installed apps on mount", async () => {
    mockPackagesList.mockResolvedValue({
      packages: [
        { id: "com.example.crm", name: "crm", label: "CRM App", description: "Customer management", icon: "briefcase", version: "1.0.0", enabled: true },
        { id: "com.example.hr", name: "hr", label: "HR App", version: "2.0.0" },
      ],
      total: 2,
    });

    const { result } = renderHook(() => useAppDiscovery());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.apps).toHaveLength(2);
    expect(result.current.apps[0]).toEqual({
      id: "com.example.crm",
      name: "crm",
      label: "CRM App",
      description: "Customer management",
      icon: "briefcase",
      version: "1.0.0",
      enabled: true,
    });
    expect(result.current.error).toBeNull();
  });

  it("handles empty packages list", async () => {
    mockPackagesList.mockResolvedValue({ packages: [], total: 0 });

    const { result } = renderHook(() => useAppDiscovery());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.apps).toHaveLength(0);
  });

  it("handles fetch error", async () => {
    mockPackagesList.mockRejectedValue(new Error("Packages API down"));

    const { result } = renderHook(() => useAppDiscovery());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error?.message).toBe("Packages API down");
    expect(result.current.apps).toHaveLength(0);
  });

  it("supports refetch", async () => {
    mockPackagesList
      .mockResolvedValueOnce({
        packages: [{ name: "crm", label: "CRM" }],
        total: 1,
      })
      .mockResolvedValueOnce({
        packages: [
          { name: "crm", label: "CRM" },
          { name: "hr", label: "HR" },
        ],
        total: 2,
      });

    const { result } = renderHook(() => useAppDiscovery());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.apps).toHaveLength(1);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.apps).toHaveLength(2);
  });

  it("passes enabled filter to packages.list()", async () => {
    mockPackagesList.mockResolvedValue({ packages: [], total: 0 });

    renderHook(() => useAppDiscovery());

    await waitFor(() => {
      expect(mockPackagesList).toHaveBeenCalledWith({ enabled: true });
    });
  });
});
