/**
 * Tests for useDevOpsAgent – validates DevOps agent
 * listing, monitoring, and self-healing operations.
 */
import { renderHook, act } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockList = jest.fn();
const mockMonitor = jest.fn();
const mockHeal = jest.fn();

const mockClient = {
  ai: { devops: { list: mockList, monitor: mockMonitor, heal: mockHeal } },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useDevOpsAgent } from "~/hooks/useDevOpsAgent";

beforeEach(() => {
  mockList.mockReset();
  mockMonitor.mockReset();
  mockHeal.mockReset();
});

describe("useDevOpsAgent", () => {
  it("lists DevOps agents", async () => {
    const agents = [
      { id: "agent-1", name: "CI Agent", type: "ci_cd", status: "active", tools: ["github-actions"], createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
      { id: "agent-2", name: "Monitor Agent", type: "monitoring", status: "active", tools: ["datadog"], createdAt: "2026-01-02T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z" },
    ];
    mockList.mockResolvedValue(agents);

    const { result } = renderHook(() => useDevOpsAgent());

    let listed: unknown;
    await act(async () => {
      listed = await result.current.listAgents();
    });

    expect(mockList).toHaveBeenCalled();
    expect(listed).toEqual(agents);
    expect(result.current.agents).toEqual(agents);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("gets monitoring data for an agent", async () => {
    const monitoring = {
      agentId: "agent-1",
      metrics: [{ name: "cpu", value: 45.2, unit: "percent", timestamp: "2026-01-01T00:00:00Z" }],
      alerts: [{ severity: "warning", message: "High memory", timestamp: "2026-01-01T00:00:00Z" }],
      status: "healthy",
    };
    mockMonitor.mockResolvedValue(monitoring);

    const { result } = renderHook(() => useDevOpsAgent());

    let data: unknown;
    await act(async () => {
      data = await result.current.getMonitoring("agent-1");
    });

    expect(mockMonitor).toHaveBeenCalledWith("agent-1");
    expect(data).toEqual(monitoring);
    expect(result.current.monitoring).toEqual(monitoring);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("triggers self-healing action", async () => {
    const action = {
      id: "heal-1",
      trigger: "high_cpu",
      action: "scale_up",
      status: "completed",
      startedAt: "2026-01-01T00:00:00Z",
      completedAt: "2026-01-01T00:01:00Z",
    };
    mockHeal.mockResolvedValue(action);

    const { result } = renderHook(() => useDevOpsAgent());

    let healed: unknown;
    await act(async () => {
      healed = await result.current.triggerHealing("agent-1", "high_cpu");
    });

    expect(mockHeal).toHaveBeenCalledWith({ agentId: "agent-1", trigger: "high_cpu" });
    expect(healed).toEqual(action);
    expect(result.current.healingActions).toContainEqual(action);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("handles list error", async () => {
    mockList.mockRejectedValue(new Error("Failed to list DevOps agents"));

    const { result } = renderHook(() => useDevOpsAgent());

    await act(async () => {
      await expect(result.current.listAgents()).rejects.toThrow("Failed to list DevOps agents");
    });

    expect(result.current.error?.message).toBe("Failed to list DevOps agents");
  });

  it("handles monitoring error", async () => {
    mockMonitor.mockRejectedValue(new Error("Failed to get monitoring data"));

    const { result } = renderHook(() => useDevOpsAgent());

    await act(async () => {
      await expect(result.current.getMonitoring("agent-1")).rejects.toThrow("Failed to get monitoring data");
    });

    expect(result.current.error?.message).toBe("Failed to get monitoring data");
  });

  it("handles healing error", async () => {
    mockHeal.mockRejectedValue(new Error("Failed to trigger healing"));

    const { result } = renderHook(() => useDevOpsAgent());

    await act(async () => {
      await expect(result.current.triggerHealing("agent-1", "high_cpu")).rejects.toThrow("Failed to trigger healing");
    });

    expect(result.current.error?.message).toBe("Failed to trigger healing");
  });
});
