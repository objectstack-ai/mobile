import { redirectIncomingPath } from "~/lib/shell/incoming-link";

/**
 * expo-router hook for links that open the app (scheme links, notification
 * deep links). Maps `objectstack://open?route=…` / `objectstack://console/…`
 * onto the Console screen; see `lib/shell/incoming-link.ts`.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    return redirectIncomingPath(path);
  } catch {
    return "/";
  }
}
