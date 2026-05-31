/**
 * Fetch the server's auth configuration, including which SSO providers are
 * enabled. The server exposes this at `/api/v1/auth/config`.
 */

export interface ServerAuthConfig {
  /** Social provider IDs enabled on this server (e.g. "google", "apple"). */
  socialProviders: string[];
}

/**
 * Fetch auth configuration from the server.
 * Returns `null` when the server is unreachable or the endpoint is absent.
 */
export async function fetchServerAuthConfig(
  baseUrl: string,
): Promise<ServerAuthConfig | null> {
  try {
    const normalised = baseUrl.replace(/\/+$/, "");
    const res = await fetch(`${normalised}/api/v1/auth/config`, {
      method: "GET",
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data?.socialProviders)) return null;
    return { socialProviders: data.socialProviders as string[] };
  } catch {
    return null;
  }
}
