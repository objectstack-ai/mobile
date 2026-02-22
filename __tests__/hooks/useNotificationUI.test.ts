/**
 * Tests for useNotificationUI – validates notification display,
 * queuing, and dismissal.
 */
import { renderHook, act } from "@testing-library/react-native";
import {
  useNotificationUI,
  ActiveNotification,
} from "~/hooks/useNotificationUI";

const sampleNotification: ActiveNotification = {
  id: "n1",
  type: "success",
  title: "Saved",
  message: "Record saved successfully",
  dismissible: true,
};

describe("useNotificationUI", () => {
  it("returns empty state initially", () => {
    const { result } = renderHook(() => useNotificationUI());

    expect(result.current.notifications).toEqual([]);
    expect(result.current.activeNotifications).toEqual([]);
    expect(result.current.queuedCount).toBe(0);
  });

  it("shows and dismisses notifications", () => {
    const { result } = renderHook(() => useNotificationUI());

    act(() => {
      result.current.show(sampleNotification);
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.activeNotifications).toHaveLength(1);

    act(() => {
      result.current.dismiss("n1");
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it("limits active notifications by maxVisible", () => {
    const { result } = renderHook(() => useNotificationUI());

    act(() => {
      result.current.setConfig({
        position: "top",
        maxVisible: 2,
        autoDismiss: true,
        duration: 5000,
      });
    });

    act(() => {
      result.current.show({ ...sampleNotification, id: "n1" });
      result.current.show({ ...sampleNotification, id: "n2" });
      result.current.show({ ...sampleNotification, id: "n3" });
    });

    expect(result.current.activeNotifications).toHaveLength(2);
    expect(result.current.queuedCount).toBe(1);
    expect(result.current.queue).toHaveLength(1);
  });

  it("dismisses all notifications", () => {
    const { result } = renderHook(() => useNotificationUI());

    act(() => {
      result.current.show({ ...sampleNotification, id: "n1" });
      result.current.show({ ...sampleNotification, id: "n2" });
    });

    act(() => {
      result.current.dismissAll();
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it("updates an existing notification", () => {
    const { result } = renderHook(() => useNotificationUI());

    act(() => {
      result.current.show(sampleNotification);
    });

    act(() => {
      result.current.updateNotification("n1", { title: "Updated" });
    });

    expect(result.current.notifications[0].title).toBe("Updated");
  });
});
