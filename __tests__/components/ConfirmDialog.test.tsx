/**
 * Tests for the cross-platform ConfirmProvider / useConfirm — confirms that the
 * dialog renders on demand and resolves true/false (unlike Alert.alert, which is
 * a no-op on web).
 */
import React from "react";
import { Text } from "react-native";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string) => (k === "common.confirm" ? "Confirm" : k === "common.cancel" ? "Cancel" : k),
  }),
}));

import { ConfirmProvider, useConfirm } from "~/components/ui/ConfirmDialog";

function Harness({ onResult }: { onResult: (v: boolean) => void }) {
  const confirm = useConfirm();
  return (
    <Text
      onPress={async () => {
        const ok = await confirm({ title: "Delete?", message: "Sure?", confirmLabel: "Delete" });
        onResult(ok);
      }}
    >
      trigger
    </Text>
  );
}

function renderWithProvider(onResult: (v: boolean) => void) {
  return render(
    <ConfirmProvider>
      <Harness onResult={onResult} />
    </ConfirmProvider>,
  );
}

describe("useConfirm", () => {
  it("resolves true when the confirm button is pressed", async () => {
    const onResult = jest.fn();
    const { getByText } = renderWithProvider(onResult);

    act(() => {
      fireEvent.press(getByText("trigger"));
    });

    // Dialog appears with our title + custom confirm label.
    await waitFor(() => expect(getByText("Delete?")).toBeTruthy());
    fireEvent.press(getByText("Delete"));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
  });

  it("resolves false when cancelled", async () => {
    const onResult = jest.fn();
    const { getByText } = renderWithProvider(onResult);

    act(() => {
      fireEvent.press(getByText("trigger"));
    });
    await waitFor(() => expect(getByText("Sure?")).toBeTruthy());
    fireEvent.press(getByText("Cancel"));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
  });
});
