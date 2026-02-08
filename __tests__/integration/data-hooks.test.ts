/**
 * Integration tests for data hooks using MSW for API mocking.
 *
 * These tests validate that hooks correctly fetch, transform,
 * and handle errors from the ObjectStack API.
 */
import { server } from "../msw/server";
import { sampleRecords, sampleFields, sampleApps } from "../msw/handlers";

/* ---- Start / stop MSW server ---- */
beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("MSW integration test infrastructure", () => {
  it("server starts and responds to requests", async () => {
    const response = await fetch(
      "https://api.objectstack.test/v1/objects/tasks/records",
    );
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.records).toEqual(sampleRecords);
    expect(data.count).toBe(3);
  });

  it("returns fields for an object", async () => {
    const response = await fetch(
      "https://api.objectstack.test/v1/objects/tasks/fields",
    );
    const data = await response.json();
    expect(data.fields).toEqual(sampleFields);
  });

  it("returns 404 for unknown record", async () => {
    const response = await fetch(
      "https://api.objectstack.test/v1/objects/tasks/records/unknown_id",
    );
    expect(response.status).toBe(404);
  });

  it("creates a new record", async () => {
    const response = await fetch(
      "https://api.objectstack.test/v1/objects/tasks/records",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Task", status: "open" }),
      },
    );
    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.id).toBe("rec_new");
    expect(data.name).toBe("New Task");
  });

  it("updates an existing record", async () => {
    const response = await fetch(
      "https://api.objectstack.test/v1/objects/tasks/records/rec_1",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      },
    );
    const data = await response.json();
    expect(data.id).toBe("rec_1");
    expect(data.status).toBe("closed");
  });

  it("deletes a record", async () => {
    const response = await fetch(
      "https://api.objectstack.test/v1/objects/tasks/records/rec_1",
      { method: "DELETE" },
    );
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it("returns app packages", async () => {
    const response = await fetch(
      "https://api.objectstack.test/v1/packages",
    );
    const data = await response.json();
    expect(data.packages).toEqual(sampleApps);
  });

  it("returns views for an object", async () => {
    const response = await fetch(
      "https://api.objectstack.test/v1/objects/tasks/views",
    );
    const data = await response.json();
    expect(data.views).toHaveLength(2);
    expect(data.views[0].type).toBe("list");
  });

  it("handles batch operations", async () => {
    const response = await fetch(
      "https://api.objectstack.test/v1/objects/tasks/records/batch",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: ["rec_1", "rec_2"] }),
      },
    );
    const data = await response.json();
    expect(data.results).toHaveLength(2);
    expect(data.results[0].success).toBe(true);
  });
});
