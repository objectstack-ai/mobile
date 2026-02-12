/**
 * Tests for lib/accessibility — screen reader optimization utilities
 */
import {
  announce,
  getFieldHint,
  getListItemLabel,
  getLiveRegionProps,
} from "~/lib/accessibility";

describe("accessibility", () => {
  describe("announce", () => {
    it("can be called with message only (polite default)", () => {
      expect(() => announce("Item saved")).not.toThrow();
    });

    it("can be called with assertive priority", () => {
      expect(() => announce("Error occurred", "assertive")).not.toThrow();
    });
  });

  describe("getFieldHint", () => {
    it("returns hint for text field", () => {
      expect(getFieldHint("text", "Name")).toBe("Enter Name");
    });

    it("returns hint for number field", () => {
      expect(getFieldHint("number", "Age")).toBe("Enter a number for Age");
    });

    it("returns hint for email field", () => {
      expect(getFieldHint("email", "Email")).toBe(
        "Enter an email address for Email",
      );
    });

    it("returns hint for phone field", () => {
      expect(getFieldHint("phone", "Phone")).toBe(
        "Enter a phone number for Phone",
      );
    });

    it("returns hint for date field", () => {
      expect(getFieldHint("date", "Birthday")).toBe(
        "Select a date for Birthday",
      );
    });

    it("returns hint for select field", () => {
      expect(getFieldHint("select", "Country")).toBe(
        "Choose an option for Country",
      );
    });

    it("returns hint for checkbox field", () => {
      expect(getFieldHint("checkbox", "Active")).toBe(
        "Toggle Active on or off",
      );
    });

    it("returns hint for toggle field", () => {
      expect(getFieldHint("toggle", "Notifications")).toBe(
        "Toggle Notifications on or off",
      );
    });

    it("returns hint for url field", () => {
      expect(getFieldHint("url", "Website")).toBe("Enter a URL for Website");
    });

    it("returns hint for textarea field", () => {
      expect(getFieldHint("textarea", "Description")).toBe(
        "Enter text for Description",
      );
    });

    it("returns fallback hint for unknown field type", () => {
      expect(getFieldHint("custom", "Foo")).toBe("Enter value for Foo");
    });
  });

  describe("getListItemLabel", () => {
    it("returns title only when no extras", () => {
      expect(getListItemLabel("Task A")).toBe("Task A");
    });

    it("includes subtitle when provided", () => {
      expect(getListItemLabel("Task A", "Due tomorrow")).toBe(
        "Task A, Due tomorrow",
      );
    });

    it("includes position when index and total provided", () => {
      expect(getListItemLabel("Task A", undefined, 0, 5)).toBe(
        "Task A. Item 1 of 5",
      );
    });

    it("includes subtitle and position together", () => {
      expect(getListItemLabel("Task A", "Due tomorrow", 2, 10)).toBe(
        "Task A, Due tomorrow. Item 3 of 10",
      );
    });
  });

  describe("getLiveRegionProps", () => {
    it("returns polite by default", () => {
      expect(getLiveRegionProps()).toEqual({
        accessibilityLiveRegion: "polite",
      });
    });

    it("returns assertive when specified", () => {
      expect(getLiveRegionProps("assertive")).toEqual({
        accessibilityLiveRegion: "assertive",
      });
    });
  });
});
