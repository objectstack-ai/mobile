/**
 * Tests for useSyncConfig – validates sync configuration,
 * conflict resolution, and retry logic.
 */
import { renderHook, act } from "@testing-library/react-native";
import { useSyncConfig } from "~/hooks/useSyncConfig";

describe("useSyncConfig", () => {
  it("returns disabled state initially", () => {
    const { result } = renderHook(() => useSyncConfig());

    expect(result.current.syncConfig.enabled).toBe(false);
    expect(result.current.isSyncEnabled).toBe(false);
  });

  it("sets sync config and computes isSyncEnabled", () => {
    const { result } = renderHook(() => useSyncConfig());

    act(() => {
      result.current.setSyncConfig({
        enabled: true,
        interval: 30000,
        batchSize: 50,
        retryPolicy: { maxRetries: 3, backoff: 1000 },
        conflictStrategy: "server_wins",
      });
    });

    expect(result.current.isSyncEnabled).toBe(true);
  });

  it("shouldRetry returns true when attempt < maxRetries", () => {
    const { result } = renderHook(() => useSyncConfig());

    act(() => {
      result.current.setSyncConfig({
        enabled: true,
        interval: 30000,
        batchSize: 50,
        retryPolicy: { maxRetries: 3, backoff: 1000 },
        conflictStrategy: "server_wins",
      });
    });

    expect(result.current.shouldRetry(0)).toBe(true);
    expect(result.current.shouldRetry(2)).toBe(true);
    expect(result.current.shouldRetry(3)).toBe(false);
    expect(result.current.shouldRetry(5)).toBe(false);
  });

  it("sets conflict config", () => {
    const { result } = renderHook(() => useSyncConfig());

    act(() => {
      result.current.setConflictConfig({
        strategy: "manual",
        fieldLevel: true,
      });
    });

    expect(result.current.conflictConfig.strategy).toBe("manual");
    expect(result.current.conflictConfig.fieldLevel).toBe(true);
  });

  it("sets storage config", () => {
    const { result } = renderHook(() => useSyncConfig());

    act(() => {
      result.current.setStorageConfig({
        type: "indexeddb",
        encryption: true,
        compression: true,
      });
    });

    expect(result.current.storageConfig.type).toBe("indexeddb");
    expect(result.current.storageConfig.encryption).toBe(true);
  });
});
