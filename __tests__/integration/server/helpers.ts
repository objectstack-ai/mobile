/**
 * Shared helpers for server integration tests.
 *
 * The tests in this directory are designed to run against a live HotCRM server
 * (started via `scripts/start-integration-server.sh`).
 *
 * They are NOT part of the regular `jest` run — use `pnpm test:integration:server`.
 */

/** Base URL for the integration server (default: http://localhost:4000). */
export const BASE_URL =
  process.env.INTEGRATION_SERVER_URL || "http://localhost:4000";

/** Convenience wrapper around fetch that prefixes BASE_URL. */
export async function api(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = `${BASE_URL}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

/** Extract JSON body and assert the response was successful. */
export async function apiOk<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await api(path, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "(no body)");
    throw new Error(
      `API ${init?.method ?? "GET"} ${path} returned ${res.status}: ${text}`,
    );
  }
  return res.json() as Promise<T>;
}

/** Generate a unique email for each test run to avoid collisions. */
export function uniqueEmail(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `test-${ts}-${rand}@integration.test`;
}

/**
 * Register + login helper.
 * Returns the raw cookie header from the auth response so subsequent
 * requests can be authenticated.
 */
export async function registerAndLogin(overrides?: {
  email?: string;
  password?: string;
  name?: string;
}): Promise<{ email: string; cookie: string }> {
  const email = overrides?.email ?? uniqueEmail();
  const password = overrides?.password ?? "IntTest_Passw0rd!";
  const name = overrides?.name ?? "Integration Tester";

  // Register
  const regRes = await api("/api/v1/auth/sign-up/email", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });

  if (!regRes.ok) {
    const body = await regRes.text().catch(() => "");
    throw new Error(`Registration failed (${regRes.status}): ${body}`);
  }

  // The server sets session cookies on successful registration
  const setCookie = regRes.headers.get("set-cookie") ?? "";

  // If we already have a session cookie from registration, use it
  if (setCookie) {
    return { email, cookie: setCookie };
  }

  // Otherwise, login explicitly
  const loginRes = await api("/api/v1/auth/sign-in/email", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (!loginRes.ok) {
    const body = await loginRes.text().catch(() => "");
    throw new Error(`Login failed (${loginRes.status}): ${body}`);
  }

  return {
    email,
    cookie: loginRes.headers.get("set-cookie") ?? "",
  };
}
