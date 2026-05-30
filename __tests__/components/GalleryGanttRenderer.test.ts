import {
  resolveCardField,
  resolveImageUri,
} from "~/components/renderers/GalleryViewRenderer";
import {
  toEpoch,
  buildGanttTasks,
  ganttBounds,
} from "~/components/renderers/GanttViewRenderer";

describe("GalleryViewRenderer helpers", () => {
  describe("resolveCardField", () => {
    it("prefers the primary field when present", () => {
      expect(
        resolveCardField({ name: "A", title: "B" }, "title", ["name"]),
      ).toBe("B");
    });

    it("falls back through candidates when primary is empty", () => {
      expect(
        resolveCardField({ name: "", title: "B" }, "name", ["title"]),
      ).toBe("B");
    });

    it("returns undefined when nothing matches", () => {
      expect(resolveCardField({ x: 1 }, "name", ["title"])).toBeUndefined();
    });
  });

  describe("resolveImageUri", () => {
    it("reads a string image field", () => {
      expect(resolveImageUri({ photo: "http://x/y.png" }, "photo")).toBe(
        "http://x/y.png",
      );
    });

    it("reads { url } object file fields", () => {
      expect(resolveImageUri({ image: { url: "u1" } }, undefined)).toBe("u1");
    });

    it("reads the first element of an array file field", () => {
      expect(resolveImageUri({ image: [{ url: "u2" }] }, undefined)).toBe("u2");
    });

    it("returns undefined when no image present", () => {
      expect(resolveImageUri({ name: "x" }, undefined)).toBeUndefined();
    });
  });
});

describe("GanttViewRenderer helpers", () => {
  describe("toEpoch", () => {
    it("parses ISO strings, Date and numbers", () => {
      expect(toEpoch("2026-01-01T00:00:00.000Z")).toBe(
        Date.parse("2026-01-01T00:00:00.000Z"),
      );
      const d = new Date(123456);
      expect(toEpoch(d)).toBe(123456);
      expect(toEpoch(987)).toBe(987);
    });

    it("returns null for unparseable / nullish values", () => {
      expect(toEpoch(undefined)).toBeNull();
      expect(toEpoch(null)).toBeNull();
      expect(toEpoch("not-a-date")).toBeNull();
    });
  });

  describe("buildGanttTasks", () => {
    const DAY = 24 * 60 * 60 * 1000;

    it("skips records without a start date", () => {
      const tasks = buildGanttTasks(
        [{ id: 1, name: "no-start" }],
        { startField: "start", endField: "end" },
      );
      expect(tasks).toHaveLength(0);
    });

    it("defaults end to start + 1 day when end is missing or invalid", () => {
      const start = Date.parse("2026-03-01T00:00:00.000Z");
      const tasks = buildGanttTasks(
        [{ id: 1, name: "task", start: "2026-03-01T00:00:00.000Z" }],
        { startField: "start", endField: "end" },
      );
      expect(tasks).toHaveLength(1);
      expect(tasks[0].start).toBe(start);
      expect(tasks[0].end).toBe(start + DAY);
      expect(tasks[0].label).toBe("task");
    });

    it("resolves label fallbacks and color field", () => {
      const tasks = buildGanttTasks(
        [
          {
            id: 7,
            title: "T",
            start: "2026-03-01",
            end: "2026-03-05",
            hue: "#f00",
          },
        ],
        { startField: "start", endField: "end", colorField: "hue" },
      );
      expect(tasks[0].id).toBe("7");
      expect(tasks[0].label).toBe("T");
      expect(tasks[0].color).toBe("#f00");
      expect(tasks[0].end).toBeGreaterThan(tasks[0].start);
    });
  });

  describe("ganttBounds", () => {
    it("spans the min start and max end across tasks", () => {
      const tasks = buildGanttTasks(
        [
          { id: 1, name: "a", start: "2026-01-01", end: "2026-01-10" },
          { id: 2, name: "b", start: "2026-01-05", end: "2026-01-20" },
        ],
        { startField: "start", endField: "end" },
      );
      const { min, max } = ganttBounds(tasks);
      expect(min).toBe(Date.parse("2026-01-01"));
      expect(max).toBe(Date.parse("2026-01-20"));
    });

    it("returns a 1-day window for empty input", () => {
      const { min, max } = ganttBounds([]);
      expect(max).toBeGreaterThan(min);
    });
  });
});
