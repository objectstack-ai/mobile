/**
 * Tests for useMCPTools – validates MCP tool discovery
 * and execution operations.
 */
import { renderHook, act } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockListTools = jest.fn();
const mockCallTool = jest.fn();

const mockClient = {
  ai: { mcp: { listTools: mockListTools, callTool: mockCallTool } },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useMCPTools } from "~/hooks/useMCPTools";

beforeEach(() => {
  mockListTools.mockReset();
  mockCallTool.mockReset();
});

describe("useMCPTools", () => {
  it("discovers tools and stores list", async () => {
    const tools = [
      { name: "search", description: "Search the web", inputSchema: { query: { type: "string" } } },
      { name: "calculate", description: "Do math" },
    ];
    mockListTools.mockResolvedValue(tools);

    const { result } = renderHook(() => useMCPTools());

    let discovered: unknown;
    await act(async () => {
      discovered = await result.current.discoverTools();
    });

    expect(mockListTools).toHaveBeenCalledWith({});
    expect(discovered).toEqual(tools);
    expect(result.current.tools).toEqual(tools);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("discovers tools filtered by serverId", async () => {
    const tools = [
      { name: "search", description: "Search the web", serverId: "server-1" },
    ];
    mockListTools.mockResolvedValue(tools);

    const { result } = renderHook(() => useMCPTools());

    await act(async () => {
      await result.current.discoverTools("server-1");
    });

    expect(mockListTools).toHaveBeenCalledWith({ serverId: "server-1" });
    expect(result.current.tools).toEqual(tools);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("executes a tool", async () => {
    const toolResult = { content: { results: ["item1", "item2"] }, isError: false };
    mockCallTool.mockResolvedValue(toolResult);

    const { result } = renderHook(() => useMCPTools());

    let execResult: unknown;
    await act(async () => {
      execResult = await result.current.executeTool("search", { query: "hello" });
    });

    expect(mockCallTool).toHaveBeenCalledWith({ name: "search", input: { query: "hello" } });
    expect(execResult).toEqual(toolResult);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("handles discovery error", async () => {
    mockListTools.mockRejectedValue(new Error("MCP tool discovery failed"));

    const { result } = renderHook(() => useMCPTools());

    await act(async () => {
      await expect(
        result.current.discoverTools(),
      ).rejects.toThrow("MCP tool discovery failed");
    });

    expect(result.current.error?.message).toBe("MCP tool discovery failed");
  });

  it("handles execution error", async () => {
    mockCallTool.mockRejectedValue(new Error("MCP tool execution failed"));

    const { result } = renderHook(() => useMCPTools());

    await act(async () => {
      await expect(
        result.current.executeTool("bad-tool"),
      ).rejects.toThrow("MCP tool execution failed");
    });

    expect(result.current.error?.message).toBe("MCP tool execution failed");
  });
});
