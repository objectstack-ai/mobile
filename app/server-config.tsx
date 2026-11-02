import React from "react";
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Building2, ScanQrCode, ServerCog } from "lucide-react-native";
import { ServerConfirm } from "~/components/shell/ServerConfirm";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import {
  probeServer,
  xhrFetch,
  type ProbedServer,
  type ProbeFailureKind,
} from "~/lib/server-probe";
import {
  findManagedConnection,
  initialAddress,
  isLocked,
  managedPending,
  managedServerKey,
} from "~/lib/managed-config/model";
import { shellConfig } from "~/lib/shell/config";
import { useLayoutDirection } from "~/lib/rtl";
import { parseUrl } from "~/lib/shell/console-url";
import { useThemeColors } from "~/lib/theme-colors";
import { useServerStore } from "~/stores/server-store";

/** Copy key for each probe failure — one message per kind. */
const ERROR_KEYS: Readonly<Record<ProbeFailureKind, string>> = {
  empty: "serverConfig.error.empty",
  invalid: "serverConfig.error.invalid",
  "insecure-http": "serverConfig.error.insecure",
  unreachable: "serverConfig.error.unreachable",
  tls: "serverConfig.error.tls",
  timeout: "serverConfig.error.timeout",
  "not-objectos": "serverConfig.error.notObjectOS",
  "server-error": "serverConfig.error.serverError",
};

const HELP_STEPS = [
  "serverConfig.where.step1",
  "serverConfig.where.step2",
  "serverConfig.where.step3",
];

/**
 * Native server picker — the one screen the shell must render itself, because
 * it decides which Console to load. Two steps:
 *
 * 1. Address (screen 5): accepts a bare host, a full URL, or a pasted Console
 *    link, and probes it (`lib/server-probe.ts`).
 * 2. Confirm (screen 7): shows who answered. The server is saved only when the
 *    user confirms: as a new connection, or refreshing the saved connection
 *    with the same host, and it becomes the current one.
 *
 * The switcher's "Add an organization or company server" opens this screen
 * with `?add=1`: the address starts empty (or the build's default server)
 * rather than showing the current connection's.
 *
 * Scan entry point: the button in the address field opens the scanner
 * (`app/connect-scan.tsx`, screen 6). The scanner, and an incoming
 * `objectos://connect?server=…` link, come back here as `?server=…&n=…`: the
 * address is filled in and probed, so the user always sees the confirm step,
 * or the error beside the address that failed.
 *
 * Way back: a connect link can cold-start the app straight onto this screen
 * while a server is already saved, with nothing behind it to go back to. The
 * address step then offers "Back to <host>" (and Android back does the same),
 * which opens the saved server's Console. Nothing is saved by leaving.
 *
 * Managed deployment (`lib/managed-config/`): while the MDM's `serverUrl` waits
 * for its confirm step, the screen skips the address step and the scanner. It
 * probes the managed address at once and shows the confirm step, which saves
 * it — the probe is never skipped. A failed probe shows its error with "contact
 * your IT administrator" and "Try again". Unlocked, "Enter a different address"
 * (and "Not this server") declines the managed address for the session and
 * opens the address step with it filled in. Locked (`lockServer`), there is no
 * way to edit, and while the managed server is saved the picker opens nothing
 * else: it goes back to the Console.
 */
export default function ServerConfigScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeColors();
  const direction = useLayoutDirection();
  const current = useServerStore((s) => s.serverUrl);
  const connect = useServerStore((s) => s.connect);
  const connections = useServerStore((s) => s.connections);
  const managed = useServerStore((s) => s.managed);
  const managedDeclined = useServerStore((s) => s.managedDeclined);
  const declineManaged = useServerStore((s) => s.declineManaged);
  const params = useLocalSearchParams<{ server?: string; n?: string; add?: string }>();
  const linkedServer = typeof params.server === "string" ? params.server : null;
  const adding = params.add === "1";
  const locked = isLocked(managed);
  const managedSaved = findManagedConnection(connections, managed) !== null;
  // The managed address waits for its confirm step: probe it with no address
  // step. Unlocked, a connect link or "add" still opens the address step.
  const managedFlow =
    managedPending(connections, managed, managedDeclined) &&
    (locked || (linkedServer === null && !adding));
  const managedAddress = managedFlow ? managed.serverUrl : null;
  const [url, setUrl] = React.useState(() =>
    initialAddress({
      linked: linkedServer,
      adding,
      current,
      managed,
      managedSaved,
      buildDefault: shellConfig.defaultServerUrl,
    })
  );
  const [probing, setProbing] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [probed, setProbed] = React.useState<ProbedServer | null>(null);
  const [connecting, setConnecting] = React.useState(false);
  const [connectError, setConnectError] = React.useState<string | null>(null);
  // Locked: the user said "Not this server" to the managed one.
  const [managedRejected, setManagedRejected] = React.useState(false);
  const [managedAttempt, setManagedAttempt] = React.useState(0);
  // Set once a confirm starts, so the save itself never reads as "locked away".
  const confirmed = React.useRef(false);
  // Only the latest probe may move the screen on; an edit makes older ones stale.
  const probeSeq = React.useRef(0);

  const runProbe = async (address: string) => {
    const seq = ++probeSeq.current;
    setErrorMsg(null);
    setProbing(true);
    try {
      const result = await probeServer(address, { fetch: xhrFetch, allowInsecure: __DEV__ });
      if (seq !== probeSeq.current) return;
      if (result.kind === "ok") {
        setConnectError(null);
        setProbed(result.server);
      } else {
        setErrorMsg(
          t(
            ERROR_KEYS[result.kind],
            result.kind === "server-error" ? { status: result.status } : {}
          )
        );
      }
    } finally {
      if (seq === probeSeq.current) setProbing(false);
    }
  };

  // A scanned code or a connect link: fill in the address and probe it. `n`
  // changes on every request, so the same address scanned twice probes twice.
  const runProbeRef = React.useRef(runProbe);
  runProbeRef.current = runProbe;
  // Locked to a managed server, a link cannot bring another address in.
  const linkedProbe = managedAddress === null ? linkedServer : null;
  React.useEffect(() => {
    if (linkedProbe === null) return;
    setUrl(linkedProbe);
    setProbed(null);
    void runProbeRef.current(linkedProbe);
  }, [linkedProbe, params.n]);

  // The managed address: probe it on open, when the MDM changes it, and on "Try again".
  React.useEffect(() => {
    if (managedAddress === null) return;
    setUrl(managedAddress);
    setProbed(null);
    setManagedRejected(false);
    void runProbeRef.current(managedAddress);
  }, [managedAddress, managedAttempt]);

  const handleConfirm = async () => {
    if (!probed) return;
    setConnecting(true);
    setConnectError(null);
    confirmed.current = true;
    try {
      await connect(
        probed,
        managedAddress !== null ? { managedFrom: managedServerKey(managedAddress) } : undefined
      );
      router.dismissTo("/console");
    } catch {
      confirmed.current = false;
      setConnectError(t("serverConfig.error.unknown"));
    } finally {
      setConnecting(false);
    }
  };

  const handleReject = React.useCallback(() => setProbed(null), []);
  // The managed server, refused: locked, nothing else can be entered; else the
  // address step opens with the managed address (and declines it for the session).
  const rejectManaged = React.useCallback(() => {
    setProbed(null);
    if (locked) setManagedRejected(true);
    else declineManaged();
  }, [locked, declineManaged]);

  // Only when there is a saved server and no screen behind this one: pushed
  // over the Console, the back gesture already returns there.
  const showWayBack = !!current && !probed && !managedFlow && !router.canGoBack();
  const backToSaved = React.useCallback(() => router.dismissTo("/console"), [router]);
  React.useEffect(() => {
    if (!showWayBack) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      backToSaved();
      return true;
    });
    return () => sub.remove();
  }, [showWayBack, backToSaved]);

  // Locked to a managed server that is saved: nothing else can be entered here.
  if (locked && managedSaved && !confirmed.current) return <Redirect href="/console" />;

  if (probed) {
    return (
      <SafeAreaView className="flex-1 bg-background" style={{ direction }}>
        <ServerConfirm
          server={probed}
          onConfirm={handleConfirm}
          onReject={managedAddress !== null ? rejectManaged : handleReject}
          connecting={connecting}
          error={connectError}
        />
      </SafeAreaView>
    );
  }

  if (managedAddress !== null) {
    const failed = errorMsg !== null || managedRejected;
    return (
      <SafeAreaView className="flex-1 bg-background" style={{ direction }}>
        <ScrollView className="flex-1" contentContainerClassName="px-6 pb-8 pt-16">
          <View className="mb-8 items-center">
            <View className="mb-6 h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Building2 size={32} color={colors.accent} />
            </View>
            <Text className="text-center text-3xl font-bold text-foreground">
              {t("serverConfig.managed.title")}
            </Text>
            <Text
              testID="managed-address"
              className="mt-2 text-center text-base text-muted-foreground"
            >
              {parseUrl(managedServerKey(managedAddress))?.host ?? managedAddress}
            </Text>
          </View>

          {failed ? (
            <View testID="managed-failure" className="gap-2">
              {errorMsg !== null ? (
                <Text testID="managed-error" className="text-sm text-destructive">
                  {errorMsg}
                </Text>
              ) : null}
              {locked ? (
                <Text testID="managed-locked" className="text-sm text-foreground">
                  {t("serverConfig.managed.locked")}
                </Text>
              ) : null}
              <Text testID="managed-contact-it" className="text-sm font-semibold text-foreground">
                {t("serverConfig.managed.contactIt")}
              </Text>
            </View>
          ) : (
            <View testID="managed-checking" className="items-center gap-3">
              <ActivityIndicator />
              <Text className="text-center text-sm text-muted-foreground">
                {t("serverConfig.managed.checking")}
              </Text>
            </View>
          )}

          <View className="mt-8 gap-3">
            {failed ? (
              <Button
                testID="managed-retry"
                loading={probing}
                onPress={() => setManagedAttempt((n) => n + 1)}
              >
                {t("serverConfig.managed.retry")}
              </Button>
            ) : null}
            {!locked ? (
              <Button variant="ghost" testID="managed-edit" onPress={declineManaged}>
                {t("serverConfig.managed.edit")}
              </Button>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" style={{ direction }}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pb-8 pt-16"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View className="mb-10 items-center">
            <View className="mb-6 h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <ServerCog size={32} color={colors.accent} />
            </View>
            <Text className="text-center text-3xl font-bold text-foreground">
              {t("serverConfig.title")}
            </Text>
            <Text className="mt-2 text-center text-base text-muted-foreground">
              {t("serverConfig.subtitle")}
            </Text>
          </View>

          <View className="gap-4">
            <View>
              <Text className="mb-1.5 text-sm font-medium text-foreground">
                {t("serverConfig.label")}
              </Text>
              <Input
                testID="server-url-input"
                placeholder="https://your-server.example.com"
                autoCapitalize="none"
                keyboardType="url"
                textContentType="URL"
                autoCorrect={false}
                returnKeyType="go"
                error={!!errorMsg}
                rightSlot={
                  <Pressable
                    testID="server-scan"
                    accessibilityRole="button"
                    accessibilityLabel={t("serverConfig.scan")}
                    hitSlop={8}
                    onPress={() => router.push("/connect-scan")}
                  >
                    <ScanQrCode size={22} color={colors.accent} />
                  </Pressable>
                }
                value={url}
                onChangeText={(text) => {
                  setUrl(text);
                  if (errorMsg) setErrorMsg(null);
                  if (probing) {
                    probeSeq.current += 1;
                    setProbing(false);
                  }
                }}
                onSubmitEditing={() => runProbe(url)}
              />
              <Text
                testID="server-url-message"
                className={
                  errorMsg
                    ? "mt-1.5 text-xs text-destructive"
                    : "mt-1.5 text-xs text-muted-foreground"
                }
              >
                {errorMsg ?? t("serverConfig.hint")}
              </Text>
            </View>

            <Button
              className="mt-4"
              onPress={() => runProbe(url)}
              loading={probing}
              testID="server-connect"
            >
              {t("serverConfig.connect")}
            </Button>

            {showWayBack && current ? (
              <Button variant="ghost" onPress={backToSaved} testID="server-back-to-saved">
                {t("serverConfig.backTo", { server: parseUrl(current)?.host ?? current })}
              </Button>
            ) : null}
          </View>

          <View className="mt-10 gap-2">
            <Text className="text-sm font-medium text-foreground">
              {t("serverConfig.where.title")}
            </Text>
            {HELP_STEPS.map((key, i) => (
              <Text key={key} className="text-xs text-muted-foreground">
                {i + 1}. {t(key)}
              </Text>
            ))}
            <Text className="mt-2 text-xs text-muted-foreground">{t("serverConfig.vpnHint")}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
