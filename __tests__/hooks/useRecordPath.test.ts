/**
 * Tests for useRecordPath – validates breadcrumb path navigation,
 * forward/back, direct index navigation, and boundary conditions.
 */
import { renderHook, act } from "@testing-library/react-native";
import { useRecordPath, PathSegment } from "~/hooks/useRecordPath";

const samplePath: PathSegment[] = [
  { id: "home", label: "Home", route: "/" },
  { id: "accounts", label: "Accounts", route: "/accounts" },
  { id: "acme", label: "Acme Corp", route: "/accounts/acme" },
];

describe("useRecordPath", () => {
  it("returns empty state initially", () => {
    const { result } = renderHook(() => useRecordPath());

    expect(result.current.path).toEqual([]);
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.canGoBack).toBe(false);
    expect(result.current.canGoForward).toBe(false);
  });

  it("sets path and navigates to last segment", () => {
    const { result } = renderHook(() => useRecordPath());

    act(() => {
      result.current.setPath(samplePath);
    });

    expect(result.current.path).toHaveLength(3);
    expect(result.current.currentIndex).toBe(2);
    expect(result.current.canGoBack).toBe(true);
    expect(result.current.canGoForward).toBe(false);
  });

  it("navigates to a specific index", () => {
    const { result } = renderHook(() => useRecordPath());

    act(() => {
      result.current.setPath(samplePath);
    });

    act(() => {
      result.current.navigateTo(0);
    });

    expect(result.current.currentIndex).toBe(0);
    expect(result.current.canGoBack).toBe(false);
    expect(result.current.canGoForward).toBe(true);
  });

  it("goes back one segment", () => {
    const { result } = renderHook(() => useRecordPath());

    act(() => {
      result.current.setPath(samplePath);
    });

    act(() => {
      result.current.goBack();
    });

    expect(result.current.currentIndex).toBe(1);
    expect(result.current.canGoBack).toBe(true);
    expect(result.current.canGoForward).toBe(true);
  });

  it("goes forward one segment", () => {
    const { result } = renderHook(() => useRecordPath());

    act(() => {
      result.current.setPath(samplePath);
    });

    act(() => {
      result.current.navigateTo(0);
    });

    act(() => {
      result.current.goForward();
    });

    expect(result.current.currentIndex).toBe(1);
  });

  it("does not go back past the beginning", () => {
    const { result } = renderHook(() => useRecordPath());

    act(() => {
      result.current.setPath(samplePath);
    });

    act(() => {
      result.current.navigateTo(0);
    });

    act(() => {
      result.current.goBack();
    });

    expect(result.current.currentIndex).toBe(0);
  });

  it("does not go forward past the end", () => {
    const { result } = renderHook(() => useRecordPath());

    act(() => {
      result.current.setPath(samplePath);
    });

    // Already at last index (2)
    act(() => {
      result.current.goForward();
    });

    expect(result.current.currentIndex).toBe(2);
  });

  it("ignores out-of-bounds navigateTo", () => {
    const { result } = renderHook(() => useRecordPath());

    act(() => {
      result.current.setPath(samplePath);
    });

    act(() => {
      result.current.navigateTo(99);
    });

    expect(result.current.currentIndex).toBe(2);
  });
});
