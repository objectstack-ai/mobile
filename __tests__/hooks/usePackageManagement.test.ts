/**
 * Tests for usePackageManagement – validates package lifecycle
 * operations: list, install, uninstall, enable, disable.
 */
import { renderHook, act, waitFor } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockList = jest.fn();
const mockInstall = jest.fn();
const mockUninstall = jest.fn();
const mockEnable = jest.fn();
const mockDisable = jest.fn();

const mockClient = {
  packages: {
    list: mockList,
    install: mockInstall,
    uninstall: mockUninstall,
    enable: mockEnable,
    disable: mockDisable,
  },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { usePackageManagement } from "~/hooks/usePackageManagement";

beforeEach(() => {
  mockList.mockReset();
  mockInstall.mockReset();
  mockUninstall.mockReset();
  mockEnable.mockReset();
  mockDisable.mockReset();
});

const mockPackages = {
  packages: [
    {
      id: "pkg-1",
      name: "crm",
      label: "CRM",
      description: "Customer management",
      version: "1.0.0",
      enabled: true,
    },
    {
      id: "pkg-2",
      name: "analytics",
      label: "Analytics",
      description: "Analytics dashboard",
      version: "2.0.0",
      enabled: false,
    },
  ],
  total: 2,
};

describe("usePackageManagement", () => {
  it("fetches packages on mount", async () => {
    mockList.mockResolvedValue(mockPackages);

    const { result } = renderHook(() => usePackageManagement());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.packages).toHaveLength(2);
    expect(result.current.packages[0].id).toBe("pkg-1");
    expect(result.current.packages[0].label).toBe("CRM");
    expect(result.current.packages[0].enabled).toBe(true);
    expect(result.current.packages[1].enabled).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("handles empty package list", async () => {
    mockList.mockResolvedValue({ packages: [], total: 0 });

    const { result } = renderHook(() => usePackageManagement());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.packages).toHaveLength(0);
  });

  it("handles fetch error", async () => {
    mockList.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => usePackageManagement());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error?.message).toBe("Network error");
  });

  it("installs a package and refetches", async () => {
    mockList.mockResolvedValue(mockPackages);
    mockInstall.mockResolvedValue({ package: { id: "pkg-3" } });

    const { result } = renderHook(() => usePackageManagement());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.install({ name: "new-pkg" }, { enableOnInstall: true });
    });

    expect(mockInstall).toHaveBeenCalledWith(
      { name: "new-pkg" },
      { enableOnInstall: true },
    );
    // list should be called again after install
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it("handles install error", async () => {
    mockList.mockResolvedValue(mockPackages);
    mockInstall.mockRejectedValue(new Error("Install failed"));

    const { result } = renderHook(() => usePackageManagement());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await expect(
        result.current.install({ name: "bad-pkg" }),
      ).rejects.toThrow("Install failed");
    });

    expect(result.current.error?.message).toBe("Install failed");
  });

  it("uninstalls a package and refetches", async () => {
    mockList.mockResolvedValue(mockPackages);
    mockUninstall.mockResolvedValue({ id: "pkg-1", success: true });

    const { result } = renderHook(() => usePackageManagement());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.uninstall("pkg-1");
    });

    expect(mockUninstall).toHaveBeenCalledWith("pkg-1");
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it("enables a package and refetches", async () => {
    mockList.mockResolvedValue(mockPackages);
    mockEnable.mockResolvedValue({ package: { id: "pkg-2", enabled: true } });

    const { result } = renderHook(() => usePackageManagement());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.enable("pkg-2");
    });

    expect(mockEnable).toHaveBeenCalledWith("pkg-2");
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it("disables a package and refetches", async () => {
    mockList.mockResolvedValue(mockPackages);
    mockDisable.mockResolvedValue({ package: { id: "pkg-1", enabled: false } });

    const { result } = renderHook(() => usePackageManagement());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.disable("pkg-1");
    });

    expect(mockDisable).toHaveBeenCalledWith("pkg-1");
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it("passes filters to list", async () => {
    mockList.mockResolvedValue({ packages: [], total: 0 });

    renderHook(() => usePackageManagement({ enabled: true, type: "app" }));

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith({ enabled: true, type: "app" });
    });
  });
});
