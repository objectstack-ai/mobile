import React from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { QrScanner } from "~/components/shell/QrScanner";
import { serverAddressFromCode, serverConfigHref } from "~/lib/shell/incoming-link";

/**
 * Screen 6 — scan the connect QR code from the Console's mobile-app page.
 *
 * Accepts `objectos://connect?server=…` codes and plain `https://` server URLs
 * (`serverAddressFromCode`), and hands the address back to the server picker,
 * which probes it and asks the user to confirm. Nothing is saved here.
 */
export default function ConnectScanScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const back = React.useCallback(() => router.back(), [router]);
  const handleResult = React.useCallback(
    (address: string) => router.dismissTo(serverConfigHref(address, Date.now())),
    [router]
  );

  return (
    <QrScanner
      accept={serverAddressFromCode}
      onResult={handleResult}
      onClose={back}
      rejectMessage={t("scanner.notConnectCode")}
      note={t("scanner.connectNote")}
      manualAction={{ label: t("scanner.manual"), onPress: back }}
    />
  );
}
