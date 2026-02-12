/**
 * Tests for useFavorites – validates add, remove, toggle,
 * and isFavorite operations.
 */
import { renderHook, act } from "@testing-library/react-native";

jest.mock("@objectstack/client-react", () => ({
  useClient: () => ({}),
}));

import { useFavorites } from "~/hooks/useFavorites";

describe("useFavorites", () => {
  it("addFavorite adds an item", () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.addFavorite({
        id: "f-1",
        type: "dashboard",
        title: "Sales Dashboard",
      });
    });

    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.favorites[0].id).toBe("f-1");
    expect(result.current.favorites[0].title).toBe("Sales Dashboard");
    expect(result.current.favorites[0].pinnedAt).toBeDefined();
    expect(result.current.isLoading).toBe(false);
  });

  it("addFavorite does not duplicate existing item", () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.addFavorite({ id: "f-1", type: "record", title: "Task A" });
    });
    act(() => {
      result.current.addFavorite({ id: "f-1", type: "record", title: "Task A" });
    });

    expect(result.current.favorites).toHaveLength(1);
  });

  it("removeFavorite removes an item by id", () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.addFavorite({ id: "f-1", type: "record", title: "Task A" });
      result.current.addFavorite({ id: "f-2", type: "report", title: "Report B" });
    });

    act(() => {
      result.current.removeFavorite("f-1");
    });

    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.favorites[0].id).toBe("f-2");
  });

  it("isFavorite returns correct boolean", () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.addFavorite({ id: "f-1", type: "dashboard", title: "Sales" });
    });

    expect(result.current.isFavorite("f-1")).toBe(true);
    expect(result.current.isFavorite("f-999")).toBe(false);
  });

  it("toggleFavorite adds when not present", () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.toggleFavorite({ id: "f-1", type: "view", title: "My View" });
    });

    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.favorites[0].id).toBe("f-1");
  });

  it("toggleFavorite removes when already present", () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.addFavorite({ id: "f-1", type: "view", title: "My View" });
    });
    expect(result.current.favorites).toHaveLength(1);

    act(() => {
      result.current.toggleFavorite({ id: "f-1", type: "view", title: "My View" });
    });

    expect(result.current.favorites).toHaveLength(0);
  });
});
