import React from "react";
import { Linking } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
// Types for the matchers jest.config registers through setupFilesAfterEnv.
import type {} from "@testing-library/react-native/extend-expect";
import "~/lib/i18n";

interface MockPermission {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
}

// The camera: `CameraView` renders a plain view and records its props, so a
// test can read the torch / scanner settings and "scan" by calling
// `onBarcodeScanned`; `useCameraPermissions` answers with `mockCamera.permission`.
const mockCamera: {
  permission: MockPermission | null;
  props: Record<string, any> | null;
  request: jest.Mock;
} = {
  permission: null,
  props: null,
  request: jest.fn(),
};
jest.mock("expo-camera", () => {
  const { View } = require("react-native");
  return {
    CameraView: (props: Record<string, any>) => {
      mockCamera.props = props;
      return <View testID={props.testID} />;
    },
    useCameraPermissions: () => [mockCamera.permission, mockCamera.request, jest.fn()],
  };
});

jest.mock("react-native-safe-area-context", () => {
  const { View } = require("react-native");
  return { SafeAreaView: View };
});

const mockBack = jest.fn();
const mockDismissTo = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack, dismissTo: mockDismissTo, push: jest.fn() }),
}));

import { QrScanner, REJECT_MESSAGE_MS } from "~/components/shell/QrScanner";
import ConnectScanScreen from "~/app/connect-scan";

const GRANTED: MockPermission = { granted: true, canAskAgain: true, status: "granted" };
const UNDETERMINED: MockPermission = { granted: false, canAskAgain: true, status: "undetermined" };
const BLOCKED: MockPermission = { granted: false, canAskAgain: false, status: "denied" };

/** Report a code read by the camera. */
function scan(data: string) {
  act(() => {
    mockCamera.props?.onBarcodeScanned?.({ type: "qr", data });
  });
}

const accept = (code: string) => (code.startsWith("ok:") ? code.slice(3) : null);

function renderScanner(overrides: Partial<React.ComponentProps<typeof QrScanner<string>>> = {}) {
  const props = {
    accept,
    onResult: jest.fn(),
    onClose: jest.fn(),
    rejectMessage: "Not a code for this",
    note: "Only the address",
    manualAction: { label: "Type it", onPress: jest.fn() },
    ...overrides,
  };
  render(<QrScanner {...props} />);
  return props;
}

/**
 * Cold-load cost, paid once outside any test's 5 s budget: the first render
 * requires and babel-transforms react-native's lazily exported components
 * (see ServerConfigScreen.test.tsx for the measurement). Both permission
 * branches are rendered so each loads its components here.
 */
const COLD_LOAD_TIMEOUT_MS = 30_000;
beforeAll(() => {
  mockCamera.permission = GRANTED;
  render(<QrScanner accept={accept} onResult={() => {}} onClose={() => {}} rejectMessage="" />).unmount();
  mockCamera.permission = BLOCKED;
  render(<QrScanner accept={accept} onResult={() => {}} onClose={() => {}} rejectMessage="" />).unmount();
}, COLD_LOAD_TIMEOUT_MS);

beforeEach(() => {
  mockCamera.permission = GRANTED;
  mockCamera.props = null;
  mockCamera.request.mockReset().mockResolvedValue(GRANTED);
  mockBack.mockReset();
  mockDismissTo.mockReset();
});

describe("QrScanner — camera allowed", () => {
  it("shows the back camera reading QR codes only, with the hint and the note", () => {
    renderScanner();
    expect(screen.getByTestId("qr-scanner-camera")).toBeTruthy();
    expect(mockCamera.props).toMatchObject({
      facing: "back",
      enableTorch: false,
      barcodeScannerSettings: { barcodeTypes: ["qr"] },
    });
    expect(screen.getByTestId("qr-scanner-hint")).toHaveTextContent(
      "Place the QR code inside the frame"
    );
    expect(screen.getByTestId("qr-scanner-note")).toHaveTextContent("Only the address");
    expect(screen.queryByTestId("qr-scanner-rejected")).toBeNull();
    expect(mockCamera.request).not.toHaveBeenCalled();
  });

  it("says so when a code is refused, and keeps scanning", () => {
    const props = renderScanner();
    scan("WIFI:S:office;;");
    expect(screen.getByTestId("qr-scanner-rejected")).toHaveTextContent("Not a code for this");
    expect(props.onResult).not.toHaveBeenCalled();
    expect(mockCamera.props?.onBarcodeScanned).toEqual(expect.any(Function));
  });

  it("lets the refusal go a moment after the camera stops reading that code", () => {
    jest.useFakeTimers();
    try {
      renderScanner();
      scan("nope");
      act(() => {
        jest.advanceTimersByTime(REJECT_MESSAGE_MS - 1);
      });
      scan("nope"); // still in view: the message stays and its timer restarts
      act(() => {
        jest.advanceTimersByTime(REJECT_MESSAGE_MS - 1);
      });
      expect(screen.getByTestId("qr-scanner-rejected")).toBeTruthy();
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(screen.queryByTestId("qr-scanner-rejected")).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it("hands over the first accepted code once and stops reading", () => {
    const props = renderScanner();
    scan("nope");
    scan("ok:https://erp.example.com");
    // The camera reports the same code again before the screen re-renders.
    scan("ok:https://other.example.com");

    expect(props.onResult).toHaveBeenCalledTimes(1);
    expect(props.onResult).toHaveBeenCalledWith("https://erp.example.com");
    expect(screen.queryByTestId("qr-scanner-rejected")).toBeNull();
    expect(mockCamera.props?.onBarcodeScanned).toBeUndefined();
  });

  it("toggles the torch", () => {
    renderScanner();
    const torch = screen.getByTestId("qr-scanner-torch");
    expect(torch).toHaveProp("accessibilityLabel", "Turn on flashlight");
    fireEvent.press(torch);
    expect(mockCamera.props?.enableTorch).toBe(true);
    expect(screen.getByTestId("qr-scanner-torch")).toHaveProp(
      "accessibilityLabel",
      "Turn off flashlight"
    );
    fireEvent.press(screen.getByTestId("qr-scanner-torch"));
    expect(mockCamera.props?.enableTorch).toBe(false);
  });

  it("closes, and offers the manual way out", () => {
    const props = renderScanner();
    fireEvent.press(screen.getByTestId("qr-scanner-close"));
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("qr-scanner-manual")).toHaveTextContent("Type it");
    fireEvent.press(screen.getByTestId("qr-scanner-manual"));
    expect(props.manualAction.onPress).toHaveBeenCalledTimes(1);
  });

  it("renders no manual button when none is given", () => {
    renderScanner({ manualAction: undefined, note: undefined, hint: "Scan the field code" });
    expect(screen.queryByTestId("qr-scanner-manual")).toBeNull();
    expect(screen.queryByTestId("qr-scanner-note")).toBeNull();
    expect(screen.getByTestId("qr-scanner-hint")).toHaveTextContent("Scan the field code");
  });
});

describe("QrScanner — camera permission", () => {
  it("shows no camera while the permission is still being read", () => {
    mockCamera.permission = null;
    const props = renderScanner();
    expect(screen.queryByTestId("qr-scanner-camera")).toBeNull();
    expect(screen.queryByTestId("qr-scanner-permission")).toBeNull();
    fireEvent.press(screen.getByTestId("qr-scanner-close"));
    expect(props.onClose).toHaveBeenCalled();
  });

  it("asks once on open, and again from the allow button", () => {
    mockCamera.permission = UNDETERMINED;
    mockCamera.request.mockResolvedValue(UNDETERMINED);
    renderScanner();
    expect(mockCamera.request).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("qr-scanner-camera")).toBeNull();
    expect(screen.getByTestId("qr-scanner-permission")).toHaveTextContent(
      "Allow camera access to scan the QR code.",
      { exact: false }
    );
    fireEvent.press(screen.getByTestId("qr-scanner-allow"));
    expect(mockCamera.request).toHaveBeenCalledTimes(2);
  });

  it("when refused for good, points to Settings and the manual way, without asking", () => {
    mockCamera.permission = BLOCKED;
    const openSettings = jest.spyOn(Linking, "openSettings").mockResolvedValue(undefined);
    const props = renderScanner();

    expect(mockCamera.request).not.toHaveBeenCalled();
    expect(screen.queryByTestId("qr-scanner-camera")).toBeNull();
    expect(screen.queryByTestId("qr-scanner-allow")).toBeNull();
    expect(screen.getByTestId("qr-scanner-permission")).toHaveTextContent(
      "Turn it on in Settings",
      { exact: false }
    );
    fireEvent.press(screen.getByTestId("qr-scanner-settings"));
    expect(openSettings).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByTestId("qr-scanner-manual"));
    expect(props.manualAction.onPress).toHaveBeenCalledTimes(1);
    openSettings.mockRestore();
  });
});

describe("ConnectScanScreen (screen 6)", () => {
  it("shows the connect copy", () => {
    render(<ConnectScanScreen />);
    expect(screen.getByTestId("qr-scanner-note")).toHaveTextContent(
      "Contains only the server address, no account information"
    );
    expect(screen.getByTestId("qr-scanner-manual")).toHaveTextContent("Enter address manually");
  });

  it("refuses a code that is not a connect code", () => {
    render(<ConnectScanScreen />);
    scan("objectos://connect?server=https%3A%2F%2Ferp.example.com&token=abc");
    expect(screen.getByTestId("qr-scanner-rejected")).toHaveTextContent(
      "This isn't a connect QR code"
    );
    expect(mockDismissTo).not.toHaveBeenCalled();
  });

  it("returns a connect code's address to the picker, which probes and confirms it", () => {
    render(<ConnectScanScreen />);
    scan("objectos://connect?server=https%3A%2F%2Ferp.example.com");
    expect(mockDismissTo).toHaveBeenCalledTimes(1);
    expect(mockDismissTo.mock.calls[0][0]).toMatch(
      /^\/server-config\?server=https%3A%2F%2Ferp\.example\.com&n=\d+$/
    );
  });

  it("takes a plain https server URL too", () => {
    render(<ConnectScanScreen />);
    scan("https://erp.example.com/_console/apps");
    expect(mockDismissTo.mock.calls[0][0]).toMatch(
      /^\/server-config\?server=https%3A%2F%2Ferp\.example\.com&n=\d+$/
    );
  });

  it("goes back to the address field on close and on manual entry", () => {
    render(<ConnectScanScreen />);
    fireEvent.press(screen.getByTestId("qr-scanner-close"));
    fireEvent.press(screen.getByTestId("qr-scanner-manual"));
    expect(mockBack).toHaveBeenCalledTimes(2);
  });
});
