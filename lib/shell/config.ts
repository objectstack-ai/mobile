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

/**
 * Parse a comma-separated host list into lower-case, de-duplicated hosts.
 * A default port (`:443`, `:80`) is dropped, as `parseUrl` drops it from the
 * hosts it is compared with — so `idp.example.com:443` matches
 * `https://idp.example.com/…`. Other ports are kept.
 */
export function parseHostList(value: string | undefined): string[] {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(",")
        .map((h) =>
          h
            .trim()
            .toLowerCase()
            .replace(/:(443|80)$/, "")
        )
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
