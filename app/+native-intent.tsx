import { redirectIncomingPath } from "~/lib/shell/incoming-link";

/**
 * expo-router hook for links that open the app (scheme links, notification
 * deep links). Maps `objectos://open?route=…` / `objectos://console/…`
 * onto the Console screen, and `objectos://connect?server=…` onto the server
 * picker, which probes the address and asks the user to confirm it; see
 * `lib/shell/incoming-link.ts`.
 */
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }): string {
  try {
    const href = redirectIncomingPath(path);
    // A callback dropped on a running app has no screen to stay on at launch.
    return href === "" && initial ? "/" : href;
  } catch {
    return "/";
  }
}
