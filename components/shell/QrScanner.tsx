import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Flashlight, FlashlightOff, X } from "lucide-react-native";
import { Button } from "~/components/ui/Button";

/** How long "not a … code" stays up after a refused code leaves the frame. */
export const REJECT_MESSAGE_MS = 3000;

export interface QrScannerProps<T> {
  /**
   * Turn a scanned code into a result, or `null` when it is not a code this
   * scan accepts. Called for every code the camera reads until one is accepted.
   */
  accept: (code: string) => T | null;
  /** Called once, with the first accepted result; the scanner then stops reading. */
  onResult: (result: T) => void;
  /** The close control (and the way out from the permission panel). */
  onClose: () => void;
  /** Shown after a code `accept` refused, e.g. "That isn't a connect QR code". */
  rejectMessage: string;
  /** The line under the frame; defaults to "Place the QR code inside the frame". */
  hint?: string;
  /** A second line under the hint, e.g. what the code contains. */
  note?: string;
  /** A way to finish without the camera, e.g. "Enter address manually". */
  manualAction?: { label: string; onPress: () => void };
}

const WHITE = "#ffffff";

/**
 * Full-screen native QR scanner: the camera behind a frame, with close and
 * torch controls, a hint, an optional note and an optional manual way out.
 *
 * It knows nothing about what the code means — `accept` decides — so the
 * server picker's connect scan and the bridge's `scan()` for Console fields
 * use the same screen. It asks for camera permission when it opens; when the
 * permission is refused for good it offers the system settings instead.
 */
export function QrScanner<T>({
  accept,
  onResult,
  onClose,
  rejectMessage,
  hint,
  note,
  manualAction,
}: QrScannerProps<T>) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = React.useState(false);
  const [rejected, setRejected] = React.useState(false);
  const [done, setDone] = React.useState(false);
  // Refs, not state: the camera reports the same code many times a second, and
  // a second report can arrive before React re-renders with `done` set.
  const doneRef = React.useRef(false);
  const lastRejectedRef = React.useRef<string | null>(null);
  const rejectTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const askedRef = React.useRef(false);

  React.useEffect(() => {
    if (!permission || permission.granted || !permission.canAskAgain) return;
    if (askedRef.current) return;
    askedRef.current = true;
    void requestPermission();
  }, [permission, requestPermission]);

  React.useEffect(
    () => () => {
      if (rejectTimer.current) clearTimeout(rejectTimer.current);
    },
    []
  );

  const handleScanned = React.useCallback(
    ({ data }: BarcodeScanningResult) => {
      if (doneRef.current) return;
      const result = accept(data);
      if (result !== null) {
        doneRef.current = true;
        setDone(true);
        setRejected(false);
        onResult(result);
        return;
      }
      // Keep the message up while the refused code stays in view; let it go a
      // moment after the camera stops reading it.
      if (rejectTimer.current) clearTimeout(rejectTimer.current);
      rejectTimer.current = setTimeout(() => {
        lastRejectedRef.current = null;
        setRejected(false);
      }, REJECT_MESSAGE_MS);
      if (lastRejectedRef.current === data) return;
      lastRejectedRef.current = data;
      setRejected(true);
    },
    [accept, onResult]
  );

  const closeButton = (
    <Pressable
      testID="qr-scanner-close"
      accessibilityRole="button"
      accessibilityLabel={t("scanner.close")}
      hitSlop={12}
      onPress={onClose}
      className="h-11 w-11 items-center justify-center rounded-full bg-black/50"
    >
      <X size={22} color={WHITE} />
    </Pressable>
  );

  const manualButton = manualAction ? (
    <Button
      testID="qr-scanner-manual"
      variant="ghost"
      textClassName="text-white"
      onPress={manualAction.onPress}
    >
      {manualAction.label}
    </Button>
  ) : null;

  if (!permission || !permission.granted) {
    const blocked = !!permission && !permission.canAskAgain;
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-row px-4 pt-2">{closeButton}</View>
        {permission ? (
          <View testID="qr-scanner-permission" className="flex-1 justify-center gap-4 px-8">
            <Text className="text-center text-xl font-semibold text-white">
              {t("scanner.permission.title")}
            </Text>
            <Text className="text-center text-base text-white/80">
              {t(blocked ? "scanner.permission.blocked" : "scanner.permission.body")}
            </Text>
            {blocked ? (
              <Button testID="qr-scanner-settings" onPress={() => void Linking.openSettings()}>
                {t("scanner.permission.settings")}
              </Button>
            ) : (
              <Button testID="qr-scanner-allow" onPress={() => void requestPermission()}>
                {t("scanner.permission.allow")}
              </Button>
            )}
            {manualButton}
          </View>
        ) : null}
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        testID="qr-scanner-camera"
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={done ? undefined : handleScanned}
      />
      <SafeAreaView className="flex-1" pointerEvents="box-none">
        <View className="flex-row justify-between px-4 pt-2">
          {closeButton}
          <Pressable
            testID="qr-scanner-torch"
            accessibilityRole="button"
            accessibilityLabel={t(torch ? "scanner.torchOff" : "scanner.torchOn")}
            accessibilityState={{ selected: torch }}
            hitSlop={12}
            onPress={() => setTorch((on) => !on)}
            className="h-11 w-11 items-center justify-center rounded-full bg-black/50"
          >
            {torch ? (
              <FlashlightOff size={22} color={WHITE} />
            ) : (
              <Flashlight size={22} color={WHITE} />
            )}
          </Pressable>
        </View>

        <View className="flex-1 items-center justify-center px-8" pointerEvents="none">
          <View className="h-64 w-64 rounded-3xl border-2 border-white" />
          <Text testID="qr-scanner-hint" className="mt-6 text-center text-base text-white">
            {hint ?? t("scanner.hint")}
          </Text>
          {note ? (
            <Text testID="qr-scanner-note" className="mt-2 text-center text-sm text-white/80">
              {note}
            </Text>
          ) : null}
          {rejected ? (
            <Text
              testID="qr-scanner-rejected"
              accessibilityLiveRegion="polite"
              className="mt-4 rounded-lg bg-black/70 px-3 py-2 text-center text-sm text-white"
            >
              {rejectMessage}
            </Text>
          ) : null}
        </View>

        <View className="px-8 pb-6">{manualButton}</View>
      </SafeAreaView>
    </View>
  );
}
