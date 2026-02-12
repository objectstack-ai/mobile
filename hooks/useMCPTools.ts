import { useCallback, useState } from "react";
import { useClient } from "@objectstack/client-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface MCPToolInfo {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  serverId?: string;
}

export interface MCPToolResult {
  content: unknown;
  isError?: boolean;
}

export interface UseMCPToolsResult {
  /** Currently discovered tools */
  tools: MCPToolInfo[];
  /** Discover available MCP tools, optionally filtered by server */
  discoverTools: (serverId?: string) => Promise<MCPToolInfo[]>;
  /** Execute an MCP tool by name */
  executeTool: (
    toolName: string,
    input?: Record<string, unknown>,
  ) => Promise<MCPToolResult>;
  /** Whether an MCP operation is in progress */
  isLoading: boolean;
  /** Last error */
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for MCP tool discovery and execution via `client.ai.mcp.*`.
 *
 * Satisfies spec/ai: MCPSchema – list available MCP tools and call them
 * with structured input/output.
 *
 * ```ts
 * const { discoverTools, executeTool, tools, isLoading } = useMCPTools();
 * await discoverTools();
 * const result = await executeTool("search", { query: "hello" });
 * ```
 */
export function useMCPTools(): UseMCPToolsResult {
  const client = useClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [tools, setTools] = useState<MCPToolInfo[]>([]);

  const discoverTools = useCallback(
    async (serverId?: string): Promise<MCPToolInfo[]> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (client as any).ai.mcp.listTools({
          ...(serverId ? { serverId } : {}),
        });
        setTools(result);
        return result;
      } catch (err: unknown) {
        const mcpError =
          err instanceof Error ? err : new Error("MCP tool discovery failed");
        setError(mcpError);
        throw mcpError;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const executeTool = useCallback(
    async (
      toolName: string,
      input?: Record<string, unknown>,
    ): Promise<MCPToolResult> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (client as any).ai.mcp.callTool({
          name: toolName,
          ...(input ? { input } : {}),
        });
        return result;
      } catch (err: unknown) {
        const mcpError =
          err instanceof Error ? err : new Error("MCP tool execution failed");
        setError(mcpError);
        throw mcpError;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  return { tools, discoverTools, executeTool, isLoading, error };
}
