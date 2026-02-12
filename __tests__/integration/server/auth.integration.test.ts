/**
 * Server Integration Tests — Authentication Flow
 *
 * These tests run against a real HotCRM server and validate the complete
 * authentication lifecycle: registration → login → session → logout.
 *
 * Prerequisites:
 *   1. HotCRM server running: `./scripts/start-integration-server.sh --bg`
 *   2. Server is ready:       `./scripts/wait-for-server.sh`
 *
 * Run:
 *   pnpm test:integration:server
 */

import { api, uniqueEmail, BASE_URL } from "./helpers";

const TEST_PASSWORD = "IntTest_Passw0rd!";

describe("Authentication Flow", () => {
  const email = uniqueEmail();
  let sessionCookie = "";

  it("should register a new user via /api/v1/auth/sign-up/email", async () => {
    const res = await api("/api/v1/auth/sign-up/email", {
      method: "POST",
      body: JSON.stringify({
        email,
        password: TEST_PASSWORD,
        name: "Integration Tester",
      }),
    });

    expect(res.status).toBeLessThan(400);

    const body = await res.json();
    // The response should contain user data (email or user object)
    expect(body).toBeDefined();

    // Capture session cookie for later requests
    sessionCookie = res.headers.get("set-cookie") ?? "";
  });

  it("should login with the registered credentials via /api/v1/auth/sign-in/email", async () => {
    const res = await api("/api/v1/auth/sign-in/email", {
      method: "POST",
      body: JSON.stringify({
        email,
        password: TEST_PASSWORD,
      }),
    });

    expect(res.status).toBeLessThan(400);

    const body = await res.json();
    expect(body).toBeDefined();

    // Update session cookie
    const newCookie = res.headers.get("set-cookie");
    if (newCookie) {
      sessionCookie = newCookie;
    }
  });

  it("should retrieve the current session via /api/v1/auth/get-session", async () => {
    const res = await api("/api/v1/auth/get-session", {
      headers: sessionCookie ? { Cookie: sessionCookie } : {},
    });

    expect(res.status).toBeLessThan(400);

    const body = await res.json();
    expect(body).toBeDefined();
  });

  it("should sign out via /api/v1/auth/sign-out", async () => {
    const res = await api("/api/v1/auth/sign-out", {
      method: "POST",
      headers: sessionCookie ? { Cookie: sessionCookie } : {},
    });

    expect(res.status).toBeLessThan(400);
  });

  it("should reject login with wrong password", async () => {
    const res = await api("/api/v1/auth/sign-in/email", {
      method: "POST",
      body: JSON.stringify({
        email,
        password: "WrongPassword123!",
      }),
    });

    // Should fail authentication
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe("Registration Validation", () => {
  it("should reject registration without email", async () => {
    const res = await api("/api/v1/auth/sign-up/email", {
      method: "POST",
      body: JSON.stringify({
        password: TEST_PASSWORD,
        name: "No Email User",
      }),
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("should reject registration without password", async () => {
    const res = await api("/api/v1/auth/sign-up/email", {
      method: "POST",
      body: JSON.stringify({
        email: uniqueEmail(),
        name: "No Password User",
      }),
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe("Server Health", () => {
  it("should respond to requests on the base URL", async () => {
    // A basic connectivity check — the server should respond
    const res = await fetch(BASE_URL);
    // Even a 404 is fine — the server is alive
    expect(res.status).toBeDefined();
  });
});
