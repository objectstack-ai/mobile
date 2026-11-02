import React from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { PermissionStatus } from "expo-camera";
import { QrScanner } from "~/components/shell/QrScanner";
import { currentScan, settleScan, type ScanOutcome } from "~/lib/shell/bridge/scan-session";

const acceptAny = (code: string) => (code.length > 0 ? code : null);

/**
 * The scanner a Console page opens with the bridge's `scan()`: reads the
 * formats of the open scan (`lib/shell/bridge/scan-session.ts`) and settles it
 * with the first code read, `null` when the user closes it, or a failure when
 * the camera permission is refused.
 *
 * Every way out settles the scan — the close control, Android back and the
 * iOS swipe alike, the last two through the unmount. Opened with no scan for
 * it (a link to the route), it closes at once.
 */
export default function BridgeScanScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const scan = React.useRef(currentScan()).current;
  const deniedRef = React.useRef(false);

  const leave = React.useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [router]);

  const giveUp = React.useCallback((): ScanOutcome => {
    return deniedRef.current ? { kind: "denied" } : { kind: "cancel" };
  }, []);

  React.useEffect(() => {
    if (!scan) {
      leave();
      return;
    }
    return () => {
      settleScan(scan.token, giveUp());
    };
  }, [scan, leave, giveUp]);

  const onPermissionStatus = React.useCallback((status: PermissionStatus) => {
    deniedRef.current = (status as string) === "denied";
  }, []);

  const onResult = React.useCallback(
    (text: string) => {
      if (scan) settleScan(scan.token, { kind: "result", text });
      leave();
    },
    [scan, leave]
  );

  const onClose = React.useCallback(() => {
    if (scan) settleScan(scan.token, giveUp());
    leave();
  }, [scan, leave, giveUp]);

  const barcodeTypes = React.useMemo(() => (scan ? [...scan.formats] : []), [scan]);

  if (!scan) return null;

  return (
    <QrScanner
      accept={acceptAny}
      onResult={onResult}
      onClose={onClose}
      barcodeTypes={barcodeTypes}
      hint={t("scanner.codeHint")}
      rejectMessage={t("scanner.unreadable")}
      permissionText={{
        body: t("scanner.permission.codeBody"),
        blocked: t("scanner.permission.codeBlocked"),
      }}
      onPermissionStatus={onPermissionStatus}
    />
  );
}
