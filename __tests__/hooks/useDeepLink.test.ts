/**
 * Tests for useDeepLink – validates deep link parsing,
 * generation, incoming link handling, and share URL generation.
 */
import { renderHook, act } from "@testing-library/react-native";

import { useDeepLink } from "~/hooks/useDeepLink";

describe("useDeepLink", () => {
  it("starts with no deep link and not processing", () => {
    const { result } = renderHook(() => useDeepLink());

    expect(result.current.lastDeepLink).toBeNull();
    expect(result.current.isProcessing).toBe(false);
  });

  it("parseDeepLink parses objectstack:// scheme", () => {
    const { result } = renderHook(() => useDeepLink());

    const route = result.current.parseDeepLink(
      "objectstack://objects/tasks/task-123",
    );

    expect(route).not.toBeNull();
    expect(route!.objectName).toBe("tasks");
    expect(route!.recordId).toBe("task-123");
    expect(route!.params.objectName).toBe("tasks");
    expect(route!.params.recordId).toBe("task-123");
  });

  it("parseDeepLink parses https://app.objectstack.com URLs", () => {
    const { result } = renderHook(() => useDeepLink());

    const route = result.current.parseDeepLink(
      "https://app.objectstack.com/objects/contacts/c-456",
    );

    expect(route).not.toBeNull();
    expect(route!.objectName).toBe("contacts");
    expect(route!.recordId).toBe("c-456");
  });

  it("parseDeepLink handles object-only URLs (no recordId)", () => {
    const { result } = renderHook(() => useDeepLink());

    const route = result.current.parseDeepLink(
      "objectstack://objects/tasks",
    );

    expect(route).not.toBeNull();
    expect(route!.objectName).toBe("tasks");
    expect(route!.recordId).toBeUndefined();
  });

  it("parseDeepLink returns null for unrecognised schemes", () => {
    const { result } = renderHook(() => useDeepLink());

    expect(result.current.parseDeepLink("https://example.com/foo")).toBeNull();
    expect(result.current.parseDeepLink("unknown://foo")).toBeNull();
  });

  it("generateDeepLink creates scheme URL with objectName", () => {
    const { result } = renderHook(() => useDeepLink());

    expect(result.current.generateDeepLink("tasks")).toBe(
      "objectstack://objects/tasks",
    );
  });

  it("generateDeepLink creates scheme URL with objectName and recordId", () => {
    const { result } = renderHook(() => useDeepLink());

    expect(result.current.generateDeepLink("tasks", "task-1")).toBe(
      "objectstack://objects/tasks/task-1",
    );
  });

  it("handleIncomingLink parses and stores as lastDeepLink", () => {
    const { result } = renderHook(() => useDeepLink());

    let route: ReturnType<typeof result.current.handleIncomingLink>;
    act(() => {
      route = result.current.handleIncomingLink(
        "objectstack://objects/tasks/task-99",
      );
    });

    expect(route!).not.toBeNull();
    expect(route!.objectName).toBe("tasks");
    expect(result.current.lastDeepLink).not.toBeNull();
    expect(result.current.lastDeepLink!.recordId).toBe("task-99");
  });

  it("handleIncomingLink stores null for invalid URL", () => {
    const { result } = renderHook(() => useDeepLink());

    let route: ReturnType<typeof result.current.handleIncomingLink>;
    act(() => {
      route = result.current.handleIncomingLink("invalid://url");
    });

    expect(route!).toBeNull();
    expect(result.current.lastDeepLink).toBeNull();
  });

  it("generateShareUrl creates HTTPS share link", () => {
    const { result } = renderHook(() => useDeepLink());

    expect(result.current.generateShareUrl("tasks", "task-1")).toBe(
      "https://app.objectstack.com/objects/tasks/task-1",
    );
  });

  it("generateShareUrl includes encoded title parameter", () => {
    const { result } = renderHook(() => useDeepLink());

    const url = result.current.generateShareUrl(
      "tasks",
      "task-1",
      "My Task & Notes",
    );

    expect(url).toBe(
      "https://app.objectstack.com/objects/tasks/task-1?title=My%20Task%20%26%20Notes",
    );
  });
});
