import { useCallback, useEffect, useRef, useState } from "react";
import * as Network from "expo-network";
import { useAppStore } from "~/stores/app-store";

/**
 * Hook that monitors network connectivity.
 * Updates the global `isOffline` flag in the app store.
 */
export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [networkType, setNetworkType] = useState<Network.NetworkStateType | null>(null);
  const setOffline = useAppStore((s) => s.setOffline);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkNetwork = useCallback(async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      const connected = state.isConnected ?? false;
      setIsConnected(connected);
      setNetworkType(state.type ?? null);
      setOffline(!connected);
    } catch {
      // Assume connected if we can't determine state
      setIsConnected(true);
      setOffline(false);
    }
  }, [setOffline]);

  useEffect(() => {
    // Check immediately
    void checkNetwork();

    // Poll every 5 seconds
    intervalRef.current = setInterval(() => {
      void checkNetwork();
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkNetwork]);

  return {
    isConnected,
    isOffline: !isConnected,
    networkType,
    /** Manually re-check connectivity */
    refresh: checkNetwork,
  };
}
