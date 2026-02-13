/**
 * Tests for useConnector – validates connector instance
 * listing, health checks, testing, and sync operations.
 */
import { renderHook, act } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockList = jest.fn();
const mockHealth = jest.fn();
const mockTest = jest.fn();
const mockSync = jest.fn();

const mockClient = {
  integration: { connectors: { list: mockList, health: mockHealth, test: mockTest, sync: mockSync } },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useConnector } from "~/hooks/useConnector";

beforeEach(() => {
  mockList.mockReset();
  mockHealth.mockReset();
  mockTest.mockReset();
  mockSync.mockReset();
});

describe("useConnector", () => {
  it("lists connectors", async () => {
    const connectors = [
      { id: "conn-1", name: "Postgres DB", type: "database", provider: "postgres", status: "connected", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
      { id: "conn-2", name: "Salesforce", type: "saas", provider: "salesforce", status: "connected", lastSyncAt: "2026-01-02T00:00:00Z", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z" },
    ];
    mockList.mockResolvedValue(connectors);

    const { result } = renderHook(() => useConnector());

    let listed: unknown;
    await act(async () => {
      listed = await result.current.listConnectors();
    });

    expect(mockList).toHaveBeenCalled();
    expect(listed).toEqual(connectors);
    expect(result.current.connectors).toEqual(connectors);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("checks connector health", async () => {
    const healthResult = {
      connectorId: "conn-1",
      status: "healthy",
      latencyMs: 45,
      lastCheckedAt: "2026-01-01T00:00:00Z",
    };
    mockHealth.mockResolvedValue(healthResult);

    const { result } = renderHook(() => useConnector());

    let checked: unknown;
    await act(async () => {
      checked = await result.current.checkHealth("conn-1");
    });

    expect(mockHealth).toHaveBeenCalledWith("conn-1");
    expect(checked).toEqual(healthResult);
    expect(result.current.health).toEqual(healthResult);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("tests a connection", async () => {
    mockTest.mockResolvedValue(true);

    const { result } = renderHook(() => useConnector());

    let success: unknown;
    await act(async () => {
      success = await result.current.testConnection("conn-1");
    });

    expect(mockTest).toHaveBeenCalledWith("conn-1");
    expect(success).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("syncs a connector", async () => {
    const synced = { id: "conn-1", name: "Postgres DB", type: "database", provider: "postgres", status: "connected", lastSyncAt: "2026-01-03T00:00:00Z", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-03T00:00:00Z" };
    mockSync.mockResolvedValue(synced);
    mockList.mockResolvedValue([
      { id: "conn-1", name: "Postgres DB", type: "database", provider: "postgres", status: "connected", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
    ]);

    const { result } = renderHook(() => useConnector());

    await act(async () => {
      await result.current.listConnectors();
    });

    let updated: unknown;
    await act(async () => {
      updated = await result.current.syncConnector("conn-1");
    });

    expect(mockSync).toHaveBeenCalledWith("conn-1");
    expect(updated).toEqual(synced);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("handles list error", async () => {
    mockList.mockRejectedValue(new Error("Failed to list connectors"));

    const { result } = renderHook(() => useConnector());

    await act(async () => {
      await expect(result.current.listConnectors()).rejects.toThrow("Failed to list connectors");
    });

    expect(result.current.error?.message).toBe("Failed to list connectors");
  });

  it("handles health check error", async () => {
    mockHealth.mockRejectedValue(new Error("Failed to check connector health"));

    const { result } = renderHook(() => useConnector());

    await act(async () => {
      await expect(result.current.checkHealth("conn-1")).rejects.toThrow("Failed to check connector health");
    });

    expect(result.current.error?.message).toBe("Failed to check connector health");
  });

  it("handles test connection error", async () => {
    mockTest.mockRejectedValue(new Error("Failed to test connection"));

    const { result } = renderHook(() => useConnector());

    await act(async () => {
      await expect(result.current.testConnection("conn-1")).rejects.toThrow("Failed to test connection");
    });

    expect(result.current.error?.message).toBe("Failed to test connection");
  });
});
