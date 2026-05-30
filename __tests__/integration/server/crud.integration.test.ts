/**
 * Server Integration Tests — CRUD Operations
 *
 * These tests run against a real ObjectStack server (started via the
 * ObjectStack CLI — see `scripts/start-integration-server.sh`) and validate
 * data operations through the v7 REST API: create, read, update, delete.
 *
 * v7 data routes are `/api/v1/data/<object>` (object names are namespace-
 * prefixed, e.g. `crm_account`). The integration stack lives in
 * `server/integration/` and defines `crm_account` + `crm_contact`.
 *
 * Prerequisites:
 *   1. Server running: `./scripts/start-integration-server.sh --bg`
 *   2. Server ready:   `./scripts/wait-for-server.sh`
 *
 * Run:
 *   pnpm test:integration:server
 */

import { api, registerAndLogin } from "./helpers";

describe("CRUD Operations", () => {
  let cookie = "";

  beforeAll(async () => {
    // Register and login to get an authenticated session
    const auth = await registerAndLogin();
    cookie = auth.cookie;
  });

  const authed = (init?: RequestInit): RequestInit => ({
    ...init,
    headers: {
      ...init?.headers,
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });

  describe("crm_account object", () => {
    let accountId: string;

    it("should create an account", async () => {
      const res = await api(
        "/api/v1/data/crm_account",
        authed({
          method: "POST",
          body: JSON.stringify({
            name: "Integration Test Corp",
            industry: "Technology",
            website: "https://integration-test.example.com",
          }),
        }),
      );

      expect(res.ok).toBe(true);
      const body = await res.json();
      accountId = body.id ?? body.record?.id ?? body.data?.id;
      expect(accountId).toBeTruthy();
    });

    it("should list accounts", async () => {
      const res = await api("/api/v1/data/crm_account?limit=10", authed());

      expect(res.ok).toBe(true);
      const body = await res.json();
      const records = body.records ?? body.data ?? body;
      expect(Array.isArray(records)).toBe(true);
      expect(records.length).toBeGreaterThan(0);
    });

    it("should retrieve a single account by ID", async () => {
      if (!accountId) return; // skip if create didn't produce an ID

      const res = await api(`/api/v1/data/crm_account/${accountId}`, authed());

      expect(res.ok).toBe(true);
      const body = await res.json();
      const record = body.record ?? body.data ?? body;
      expect(record.name).toBe("Integration Test Corp");
    });

    it("should update an account", async () => {
      if (!accountId) return;

      const res = await api(
        `/api/v1/data/crm_account/${accountId}`,
        authed({
          method: "PATCH",
          body: JSON.stringify({
            name: "Integration Test Corp (Updated)",
          }),
        }),
      );

      expect(res.ok).toBe(true);
      const body = await res.json();
      const record = body.record ?? body.data ?? body;
      expect(record.name).toBe("Integration Test Corp (Updated)");
    });

    it("should delete an account", async () => {
      if (!accountId) return;

      const res = await api(
        `/api/v1/data/crm_account/${accountId}`,
        authed({ method: "DELETE" }),
      );

      expect(res.status).toBeLessThan(300);
    });
  });

  describe("crm_contact object", () => {
    it("should create a contact", async () => {
      const res = await api(
        "/api/v1/data/crm_contact",
        authed({
          method: "POST",
          body: JSON.stringify({
            first_name: "Integration",
            last_name: "Tester",
            email: "contact@integration-test.example.com",
          }),
        }),
      );

      expect(res.ok).toBe(true);
      const body = await res.json();
      expect(body.id ?? body.record?.id).toBeTruthy();
    });

    it("should list contacts", async () => {
      const res = await api("/api/v1/data/crm_contact?limit=10", authed());

      expect(res.ok).toBe(true);
      const body = await res.json();
      const records = body.records ?? body.data ?? body;
      expect(Array.isArray(records)).toBe(true);
    });
  });
});
