import { useCallback, useEffect, useState } from "react";
import * as Network from "expo-network";

/**
 * Network connectivity, kept current by the OS network-state listener.
 * When the state cannot be determined the hook assumes "connected" so the
 * shell never refuses to try loading the Console.
 */
export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [networkType, setNetworkType] = useState<Network.NetworkStateType | null>(null);

  const apply = useCallback((state: Network.NetworkState) => {
    setIsConnected(state.isConnected ?? true);
    setNetworkType(state.type ?? null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      apply(await Network.getNetworkStateAsync());
    } catch {
      setIsConnected(true);
    }
  }, [apply]);

  useEffect(() => {
    void refresh();
    const sub = Network.addNetworkStateListener(apply);
    return () => sub.remove();
  }, [apply, refresh]);

  return { isConnected, isOffline: !isConnected, networkType, refresh };
}
