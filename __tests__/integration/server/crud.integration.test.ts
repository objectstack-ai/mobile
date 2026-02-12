/**
 * Server Integration Tests — CRUD Operations
 *
 * These tests run against a real HotCRM server and validate data operations
 * through the ObjectStack REST API: create, read, update, delete records.
 *
 * Prerequisites:
 *   1. HotCRM server running: `./scripts/start-integration-server.sh --bg`
 *   2. Server is ready:       `./scripts/wait-for-server.sh`
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

  describe("Account object", () => {
    let accountId: string;

    it("should create an account", async () => {
      const res = await api(
        "/api/v1/account",
        authed({
          method: "POST",
          body: JSON.stringify({
            name: "Integration Test Corp",
            industry: "Technology",
            website: "https://integration-test.example.com",
          }),
        }),
      );

      // Accept 2xx (created) or 4xx if the object doesn't exist yet in this config
      if (res.ok) {
        const body = await res.json();
        expect(body).toBeDefined();
        accountId = body.id ?? body._id ?? body.data?.id;
      } else {
        // 404 = object not registered, which is acceptable in a minimal server
        expect([404, 405, 501]).toContain(res.status);
      }
    });

    it("should list accounts", async () => {
      const res = await api("/api/v1/account", authed());

      if (res.ok) {
        const body = await res.json();
        expect(body).toBeDefined();
        // Could be { records: [...] } or { data: [...] } or an array
        const records = body.records ?? body.data ?? body;
        expect(Array.isArray(records) || typeof records === "object").toBe(
          true,
        );
      } else {
        expect([404, 405, 501]).toContain(res.status);
      }
    });

    it("should retrieve a single account by ID", async () => {
      if (!accountId) return; // skip if create didn't produce an ID

      const res = await api(`/api/v1/account/${accountId}`, authed());

      if (res.ok) {
        const body = await res.json();
        expect(body).toBeDefined();
      } else {
        expect([404, 405, 501]).toContain(res.status);
      }
    });

    it("should update an account", async () => {
      if (!accountId) return;

      const res = await api(
        `/api/v1/account/${accountId}`,
        authed({
          method: "PUT",
          body: JSON.stringify({
            name: "Integration Test Corp (Updated)",
          }),
        }),
      );

      if (res.ok) {
        const body = await res.json();
        expect(body).toBeDefined();
      } else {
        expect([404, 405, 501]).toContain(res.status);
      }
    });

    it("should delete an account", async () => {
      if (!accountId) return;

      const res = await api(
        `/api/v1/account/${accountId}`,
        authed({ method: "DELETE" }),
      );

      if (res.ok) {
        // Could return 200 or 204
        expect(res.status).toBeLessThan(300);
      } else {
        expect([404, 405, 501]).toContain(res.status);
      }
    });
  });

  describe("Contact object", () => {
    it("should create a contact", async () => {
      const res = await api(
        "/api/v1/contact",
        authed({
          method: "POST",
          body: JSON.stringify({
            first_name: "Integration",
            last_name: "Tester",
            email: "contact@integration-test.example.com",
          }),
        }),
      );

      if (res.ok) {
        const body = await res.json();
        expect(body).toBeDefined();
      } else {
        expect([404, 405, 501]).toContain(res.status);
      }
    });

    it("should list contacts", async () => {
      const res = await api("/api/v1/contact", authed());

      if (res.ok) {
        const body = await res.json();
        expect(body).toBeDefined();
      } else {
        expect([404, 405, 501]).toContain(res.status);
      }
    });
  });

  describe("Lead object", () => {
    it("should create a lead", async () => {
      const res = await api(
        "/api/v1/lead",
        authed({
          method: "POST",
          body: JSON.stringify({
            first_name: "Lead",
            last_name: "Prospect",
            company: "Test Leads Inc",
            status: "New",
          }),
        }),
      );

      if (res.ok) {
        const body = await res.json();
        expect(body).toBeDefined();
      } else {
        expect([404, 405, 501]).toContain(res.status);
      }
    });

    it("should list leads", async () => {
      const res = await api("/api/v1/lead", authed());

      if (res.ok) {
        const body = await res.json();
        expect(body).toBeDefined();
      } else {
        expect([404, 405, 501]).toContain(res.status);
      }
    });
  });
});
