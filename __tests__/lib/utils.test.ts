import { cn } from "~/lib/utils";

describe("cn (classname merge utility)", () => {
  it("merges simple class strings", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });

  it("handles conditional classes via clsx", () => {
    expect(cn("base", false && "hidden", "extra")).toBe("base extra");
  });

  it("resolves Tailwind conflicts (last wins)", () => {
    const result = cn("px-4", "px-6");
    expect(result).toBe("px-6");
  });

  it("returns empty string for no arguments", () => {
    expect(cn()).toBe("");
  });

  it("filters out null and undefined", () => {
    expect(cn("a", null, undefined, "b")).toBe("a b");
  });
});
