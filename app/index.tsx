import { Redirect } from "expo-router";
import { LoadingScreen } from "~/components/common/LoadingScreen";
import { useServerStore } from "~/stores/server-store";

/**
 * Start screen: waits for the persisted server URL, then opens the Console or,
 * on first launch, the server picker.
 */
export default function Index() {
  const isReady = useServerStore((s) => s.isReady);
  const serverUrl = useServerStore((s) => s.serverUrl);

  if (!isReady) return <LoadingScreen />;
  return <Redirect href={serverUrl ? "/console" : "/server-config"} />;
}
