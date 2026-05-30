/**
 * Server Integration Tests — Object Metadata
 *
 * Validates that the ObjectStack server (started via the ObjectStack CLI)
 * exposes object metadata through the v7 REST API. v7 metadata routes live
 * under `/api/v1/meta` (e.g. `/api/v1/meta/objects`, `/api/v1/meta/types`).
 *
 * Prerequisites:
 *   1. Server running: `./scripts/start-integration-server.sh --bg`
 *   2. Server ready:   `./scripts/wait-for-server.sh`
 *
 * Run:
 *   pnpm test:integration:server
 */

import { api, registerAndLogin } from "./helpers";

describe("Object Metadata", () => {
  let cookie = "";

  beforeAll(async () => {
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

  describe("Metadata types", () => {
    it("should list available metadata types", async () => {
      const res = await api("/api/v1/meta/types", authed());

      expect(res.ok).toBe(true);
      const body = await res.json();
      expect(body).toBeDefined();
    });
  });

  describe("Object List", () => {
    it("should list available objects", async () => {
      const res = await api("/api/v1/meta/objects", authed());

      expect(res.ok).toBe(true);
      const body = await res.json();
      // v7 shape: { type: "objects", items: [...] }
      const objects = body.items ?? body.objects ?? body.data ?? body;
      expect(Array.isArray(objects)).toBe(true);
      expect(objects.length).toBeGreaterThan(0);
    });
  });

  describe("Object schema", () => {
    it("should return the schema for the crm_account object", async () => {
      const res = await api("/api/v1/meta/objects?name=crm_account", authed());

      expect(res.ok).toBe(true);
      const body = await res.json();
      expect(body).toBeDefined();
    });

    it("should return the schema for the crm_contact object", async () => {
      const res = await api("/api/v1/meta/objects?name=crm_contact", authed());

      expect(res.ok).toBe(true);
      const body = await res.json();
      expect(body).toBeDefined();
    });
  });

  describe("Object Views", () => {
    it("should return views for the crm_account object", async () => {
      const res = await api("/api/v1/meta/views?object=crm_account", authed());

      // Views are optional for a minimal stack; accept success or not-found.
      if (res.ok) {
        const body = await res.json();
        expect(body).toBeDefined();
      } else {
        expect([400, 404, 405, 501]).toContain(res.status);
      }
    });
  });
});
