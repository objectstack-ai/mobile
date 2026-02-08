/**
 * MSW (Mock Service Worker) handlers for integration tests.
 *
 * Mocks the ObjectStack API endpoints used by data hooks.
 */
import { http, HttpResponse } from "msw";

const API_BASE = "https://api.objectstack.test/v1";

/** Sample records for test queries */
export const sampleRecords = [
  { id: "rec_1", name: "Task A", status: "open", priority: 1, amount: 100 },
  { id: "rec_2", name: "Task B", status: "closed", priority: 2, amount: 200 },
  { id: "rec_3", name: "Task C", status: "open", priority: 3, amount: 300 },
];

/** Sample field definitions */
export const sampleFields = [
  { name: "name", type: "text", label: "Name" },
  { name: "status", type: "select", label: "Status" },
  { name: "priority", type: "number", label: "Priority" },
  { name: "amount", type: "currency", label: "Amount" },
];

/** Sample apps/packages */
export const sampleApps = [
  { id: "app_1", name: "CRM", slug: "crm", enabled: true },
  { id: "app_2", name: "Inventory", slug: "inventory", enabled: true },
];

export const handlers = [
  /* ---- Query records ---- */
  http.get(`${API_BASE}/objects/:objectName/records`, ({ params }) => {
    return HttpResponse.json({
      records: sampleRecords,
      count: sampleRecords.length,
      hasMore: false,
    });
  }),

  /* ---- Get single record ---- */
  http.get(`${API_BASE}/objects/:objectName/records/:id`, ({ params }) => {
    const record = sampleRecords.find((r) => r.id === params.id);
    if (!record) {
      return HttpResponse.json({ error: "Not found" }, { status: 404 });
    }
    return HttpResponse.json(record);
  }),

  /* ---- Create record ---- */
  http.post(`${API_BASE}/objects/:objectName/records`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      { id: "rec_new", ...body },
      { status: 201 },
    );
  }),

  /* ---- Update record ---- */
  http.patch(
    `${API_BASE}/objects/:objectName/records/:id`,
    async ({ params, request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ id: params.id, ...body });
    },
  ),

  /* ---- Delete record ---- */
  http.delete(`${API_BASE}/objects/:objectName/records/:id`, () => {
    return HttpResponse.json({ success: true });
  }),

  /* ---- Batch operations ---- */
  http.post(`${API_BASE}/objects/:objectName/records/batch`, async ({ request }) => {
    const body = (await request.json()) as { ids: string[] };
    return HttpResponse.json({
      results: (body.ids ?? []).map((id: string) => ({ id, success: true })),
    });
  }),

  /* ---- Get fields ---- */
  http.get(`${API_BASE}/objects/:objectName/fields`, () => {
    return HttpResponse.json({ fields: sampleFields });
  }),

  /* ---- App discovery ---- */
  http.get(`${API_BASE}/packages`, () => {
    return HttpResponse.json({ packages: sampleApps });
  }),

  /* ---- Views ---- */
  http.get(`${API_BASE}/objects/:objectName/views`, () => {
    return HttpResponse.json({
      views: [
        { id: "v1", name: "All Records", type: "list" },
        { id: "v2", name: "Dashboard", type: "dashboard" },
      ],
    });
  }),
];
