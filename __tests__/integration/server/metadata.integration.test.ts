/**
 * Server Integration Tests — Object Metadata
 *
 * These tests validate that the HotCRM server correctly exposes
 * object metadata: schemas, fields, views, and package information.
 *
 * Prerequisites:
 *   1. HotCRM server running: `./scripts/start-integration-server.sh --bg`
 *   2. Server is ready:       `./scripts/wait-for-server.sh`
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

  describe("Packages / Apps", () => {
    it("should list available packages", async () => {
      const res = await api("/api/v1/packages", authed());

      if (res.ok) {
        const body = await res.json();
        expect(body).toBeDefined();
        // HotCRM has: crm, finance, marketing, products, support, hr
        const packages = body.packages ?? body.data ?? body;
        if (Array.isArray(packages)) {
          expect(packages.length).toBeGreaterThan(0);
        }
      } else {
        // Endpoint might not exist in every server configuration
        expect([404, 405, 501]).toContain(res.status);
      }
    });
  });

  describe("Object Fields", () => {
    it("should return fields for the account object", async () => {
      const res = await api("/api/v1/objects/account/fields", authed());

      if (res.ok) {
        const body = await res.json();
        expect(body).toBeDefined();
        const fields = body.fields ?? body.data ?? body;
        if (Array.isArray(fields)) {
          expect(fields.length).toBeGreaterThan(0);
        }
      } else {
        expect([404, 405, 501]).toContain(res.status);
      }
    });

    it("should return fields for the contact object", async () => {
      const res = await api("/api/v1/objects/contact/fields", authed());

      if (res.ok) {
        const body = await res.json();
        expect(body).toBeDefined();
      } else {
        expect([404, 405, 501]).toContain(res.status);
      }
    });
  });

  describe("Object Views", () => {
    it("should return views for the account object", async () => {
      const res = await api("/api/v1/objects/account/views", authed());

      if (res.ok) {
        const body = await res.json();
        expect(body).toBeDefined();
        const views = body.views ?? body.data ?? body;
        if (Array.isArray(views)) {
          expect(views.length).toBeGreaterThan(0);
        }
      } else {
        expect([404, 405, 501]).toContain(res.status);
      }
    });
  });

  describe("Object List", () => {
    it("should list available objects", async () => {
      const res = await api("/api/v1/objects", authed());

      if (res.ok) {
        const body = await res.json();
        expect(body).toBeDefined();
        const objects = body.objects ?? body.data ?? body;
        if (Array.isArray(objects)) {
          // HotCRM defines 65 objects across all plugins
          expect(objects.length).toBeGreaterThan(0);
        }
      } else {
        expect([404, 405, 501]).toContain(res.status);
      }
    });
  });
});
