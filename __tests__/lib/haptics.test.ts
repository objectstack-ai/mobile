/**
 * Tests for lib/haptics – validates triggerHaptic maps
 * patterns correctly to expo-haptics API calls.
 */
import * as Haptics from "expo-haptics";
import { triggerHaptic } from "~/lib/haptics";

describe("triggerHaptic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("light triggers impactAsync with Light", async () => {
    await triggerHaptic("light");
    expect(Haptics.impactAsync).toHaveBeenCalledWith(
      Haptics.ImpactFeedbackStyle.Light,
    );
  });

  it("medium triggers impactAsync with Medium", async () => {
    await triggerHaptic("medium");
    expect(Haptics.impactAsync).toHaveBeenCalledWith(
      Haptics.ImpactFeedbackStyle.Medium,
    );
  });

  it("heavy triggers impactAsync with Heavy", async () => {
    await triggerHaptic("heavy");
    expect(Haptics.impactAsync).toHaveBeenCalledWith(
      Haptics.ImpactFeedbackStyle.Heavy,
    );
  });

  it("success triggers notificationAsync with Success", async () => {
    await triggerHaptic("success");
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Success,
    );
  });

  it("warning triggers notificationAsync with Warning", async () => {
    await triggerHaptic("warning");
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Warning,
    );
  });

  it("error triggers notificationAsync with Error", async () => {
    await triggerHaptic("error");
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Error,
    );
  });

  it("selection triggers selectionAsync", async () => {
    await triggerHaptic("selection");
    expect(Haptics.selectionAsync).toHaveBeenCalled();
  });
});
