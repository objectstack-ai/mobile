/**
 * Tests for useAppDiscovery – validates package/app discovery
 * via client.packages.list().
 *
 * ObjectStack v7 returns each package as `{ manifest: {...}, enabled, ... }`
 * with the real fields nested under `manifest`. Discovery must read from there
 * (not the flat package record), route by the package id, and exclude platform
 * plugins/services (scope `system` / type `plugin`) from the app switcher.
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
  it("maps manifest-nested fields and routes by package id", async () => {
    mockPackagesList.mockResolvedValue({
      packages: [
        {
          manifest: {
            id: "app.objectstack.hotcrm",
            name: "HotCRM",
            label: "Hot CRM",
            description: "Customer management",
            icon: "briefcase",
            version: "1.0.0",
            scope: "project",
          },
          enabled: true,
        },
      ],
      total: 1,
    });

    const { result } = renderHook(() => useAppDiscovery());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.apps).toHaveLength(1);
    expect(result.current.apps[0]).toEqual({
      id: "app.objectstack.hotcrm",
      // routing/meta identifier is the package id, not the human name
      name: "app.objectstack.hotcrm",
      label: "Hot CRM",
      description: "Customer management",
      icon: "briefcase",
      version: "1.0.0",
      type: undefined,
      scope: "project",
      enabled: true,
      hidden: false,
    });
    expect(result.current.error).toBeNull();
  });

  it("falls back to manifest.name when no label is set", async () => {
    mockPackagesList.mockResolvedValue({
      packages: [
        { manifest: { id: "app.objectstack.hotcrm", name: "HotCRM" }, enabled: true },
      ],
      total: 1,
    });

    const { result } = renderHook(() => useAppDiscovery());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.apps[0].label).toBe("HotCRM");
  });

  it("excludes platform plugins/services (scope system / type plugin)", async () => {
    mockPackagesList.mockResolvedValue({
      packages: [
        { manifest: { id: "app.objectstack.hotcrm", name: "HotCRM", scope: "project" }, enabled: true },
        { manifest: { id: "com.objectstack.plugin-auth", name: "Auth Plugin", type: "plugin", scope: "system" }, enabled: true },
        { manifest: { id: "com.objectstack.service.email", name: "Email Service", type: "plugin", scope: "system" }, enabled: true },
      ],
      total: 3,
    });

    const { result } = renderHook(() => useAppDiscovery());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.apps).toHaveLength(1);
    expect(result.current.apps[0].id).toBe("app.objectstack.hotcrm");
  });

  it("excludes apps flagged App.hidden from the switcher list", async () => {
    mockPackagesList.mockResolvedValue({
      packages: [
        { manifest: { id: "app.objectstack.hotcrm", name: "HotCRM" }, enabled: true },
        { manifest: { id: "app.objectstack.setup", name: "Setup", hidden: true }, enabled: true },
      ],
      total: 2,
    });

    const { result } = renderHook(() => useAppDiscovery());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.apps).toHaveLength(1);
    expect(result.current.apps[0].id).toBe("app.objectstack.hotcrm");
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
        packages: [{ manifest: { id: "app.crm", name: "CRM" }, enabled: true }],
        total: 1,
      })
      .mockResolvedValueOnce({
        packages: [
          { manifest: { id: "app.crm", name: "CRM" }, enabled: true },
          { manifest: { id: "app.hr", name: "HR" }, enabled: true },
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
