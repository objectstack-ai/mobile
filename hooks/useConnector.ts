import { useCallback, useState } from "react";
import { useClient } from "@objectstack/client-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface ConnectorInstance {
  id: string;
  name: string;
  type: "database" | "saas" | "file_storage" | "message_queue" | "github";
  provider: string;
  status: "connected" | "disconnected" | "error";
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectorHealth {
  connectorId: string;
  status: "healthy" | "degraded" | "down";
  latencyMs: number;
  lastCheckedAt: string;
  error?: string;
}

export interface UseConnectorResult {
  /** Available connector instances */
  connectors: ConnectorInstance[];
  /** Latest health check result */
  health: ConnectorHealth | null;
  /** List all connectors */
  listConnectors: () => Promise<ConnectorInstance[]>;
  /** Check health of a connector */
  checkHealth: (connectorId: string) => Promise<ConnectorHealth>;
  /** Test connection for a connector */
  testConnection: (connectorId: string) => Promise<boolean>;
  /** Sync a connector */
  syncConnector: (connectorId: string) => Promise<ConnectorInstance>;
  /** Whether an operation is in progress */
  isLoading: boolean;
  /** Last error */
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for managing integration connectors
 * via `client.integration.connectors.*`.
 *
 * Satisfies spec/integration: Connector, ConnectorInstance, ConnectorHealth schemas.
 *
 * ```ts
 * const { connectors, listConnectors, checkHealth } = useConnector();
 * await listConnectors();
 * const health = await checkHealth("conn-1");
 * ```
 */
export function useConnector(): UseConnectorResult {
  const client = useClient();
  const [connectors, setConnectors] = useState<ConnectorInstance[]>([]);
  const [health, setHealth] = useState<ConnectorHealth | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const listConnectors = useCallback(async (): Promise<ConnectorInstance[]> => {
    setIsLoading(true);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (client as any).integration.connectors.list();
      setConnectors(result);
      return result;
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error("Failed to list connectors");
      setError(e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const checkHealth = useCallback(
    async (connectorId: string): Promise<ConnectorHealth> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (client as any).integration.connectors.health(connectorId);
        setHealth(result);
        return result;
      } catch (err: unknown) {
        const e = err instanceof Error ? err : new Error("Failed to check connector health");
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const testConnection = useCallback(
    async (connectorId: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (client as any).integration.connectors.test(connectorId);
        return result;
      } catch (err: unknown) {
        const e = err instanceof Error ? err : new Error("Failed to test connection");
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const syncConnector = useCallback(
    async (connectorId: string): Promise<ConnectorInstance> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (client as any).integration.connectors.sync(connectorId);
        setConnectors((prev) =>
          prev.map((c) => (c.id === connectorId ? result : c)),
        );
        return result;
      } catch (err: unknown) {
        const e = err instanceof Error ? err : new Error("Failed to sync connector");
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  return { connectors, health, listConnectors, checkHealth, testConnection, syncConnector, isLoading, error };
}
