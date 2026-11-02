/**
 * Build-time shell configuration, read from the Expo config `extra` block
 * (see app.config.ts). Kept in one module so screens never reach into
 * `Constants` directly.
 */
import Constants from "expo-constants";

interface ShellExtra {
  sentryDsn?: string;
  /** Comma-separated hosts allowed to load in the WebView (e.g. an SSO IdP). */
  trustedHosts?: string;
  /** Server URL pre-filled on the server picker (white-label builds). */
  defaultServerUrl?: string;
}

function extra(): ShellExtra {
  return (Constants.expoConfig?.extra ?? {}) as ShellExtra;
}

/** Parse a comma-separated host list into lower-case, de-duplicated hosts. */
export function parseHostList(value: string | undefined): string[] {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(",")
        .map((h) => h.trim().toLowerCase())
        .filter((h) => h.length > 0)
    )
  );
}

export const shellConfig = {
  get appVersion(): string {
    return Constants.expoConfig?.version ?? "0.0.0";
  },
  get sentryDsn(): string {
    return extra().sentryDsn ?? "";
  },
  get trustedHosts(): string[] {
    return parseHostList(extra().trustedHosts);
  },
  get defaultServerUrl(): string {
    return extra().defaultServerUrl ?? "";
  },
};
