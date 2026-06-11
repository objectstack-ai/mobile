import { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { authClient } from "~/lib/auth-client";
import { useAccount } from "~/hooks/useAccount";
import { useTwoFactor } from "~/hooks/useTwoFactor";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { ScreenHeader } from "~/components/common/ScreenHeader";
import { useToast } from "~/components/ui/Toast";

function Field({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof Input>) {
  return (
    <View className="gap-1.5">
      <Text className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </Text>
      <Input {...props} />
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-6 px-5">
      <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </Text>
      <View className="gap-3 rounded-xl border border-border bg-card p-4">{children}</View>
    </View>
  );
}

/**
 * Account — self-service identity management (spec v7 Account App surface).
 * Update profile name, change email (verification-gated), change password, and
 * resend the verification email. Backed by `useAccount` → `client.auth.*`.
 */
export default function AccountScreen() {
  const { t } = useTranslation();
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const { updateProfile, changePassword, changeEmail, resendVerification, isSaving } =
    useAccount();
  const twoFactor = useTwoFactor();

  const [name, setName] = useState(user?.name ?? "");
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // 2FA enrolment state
  const twoFactorEnabled = (user as { twoFactorEnabled?: boolean } | undefined)?.twoFactorEnabled === true;
  const [tfPassword, setTfPassword] = useState("");
  const [tfUri, setTfUri] = useState<string | null>(null);
  const [tfBackupCodes, setTfBackupCodes] = useState<string[]>([]);
  const [tfCode, setTfCode] = useState("");

  const { toastSuccess, toastError } = useToast();
  const notify = (msg: string) => toastSuccess(msg);
  const fail = (e: unknown) =>
    toastError(e instanceof Error ? e.message : t("account.genericError"));

  const onSaveName = async () => {
    if (!name.trim()) return;
    try {
      await updateProfile(name.trim());
      notify(t("account.profileUpdated"));
    } catch (e) {
      fail(e);
    }
  };

  const onChangeEmail = async () => {
    if (!newEmail.trim()) return;
    try {
      await changeEmail(newEmail.trim());
      setNewEmail("");
      notify(t("account.emailChangeSent"));
    } catch (e) {
      fail(e);
    }
  };

  const onResendVerification = async () => {
    if (!user?.email) return;
    try {
      await resendVerification(user.email);
      notify(t("account.verificationSent"));
    } catch (e) {
      fail(e);
    }
  };

  const onChangePassword = async () => {
    if (!currentPassword || !newPassword) return;
    if (newPassword.length < 8) {
      notify(t("account.passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      notify(t("account.passwordMismatch"));
      return;
    }
    try {
      await changePassword(currentPassword, newPassword, true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      notify(t("account.passwordChanged"));
    } catch (e) {
      fail(e);
    }
  };

  const onEnable2FA = async () => {
    if (!tfPassword) return;
    try {
      const { totpURI, backupCodes } = await twoFactor.enable(tfPassword);
      setTfUri(totpURI);
      setTfBackupCodes(backupCodes);
      setTfPassword("");
    } catch (e) {
      fail(e);
    }
  };

  const onVerify2FA = async () => {
    if (tfCode.length < 6) return;
    try {
      await twoFactor.verifyTotp(tfCode);
      setTfCode("");
      setTfUri(null);
      setTfBackupCodes([]);
      notify(t("account.twoFaEnabledToast"));
    } catch (e) {
      fail(e);
    }
  };

  const onDisable2FA = async () => {
    if (!tfPassword) return;
    try {
      await twoFactor.disable(tfPassword);
      setTfPassword("");
      notify(t("account.twoFaDisabledToast"));
    } catch (e) {
      fail(e);
    }
  };

  /** Extract the otpauth secret for manual entry into an authenticator app. */
  const totpSecret = tfUri ? /[?&]secret=([^&]+)/.exec(tfUri)?.[1] ?? null : null;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <ScreenHeader title={t("more.sectionAccount")} />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <Section title={t("account.sectionProfile")}>
          <Field
            label={t("account.name")}
            value={name}
            onChangeText={setName}
            placeholder={t("account.namePlaceholder")}
            autoCapitalize="words"
          />
          <Button onPress={onSaveName} loading={isSaving} disabled={!name.trim()}>
            {t("account.saveProfile")}
          </Button>
        </Section>

        <Section title={t("account.sectionEmail")}>
          <Text className="text-sm text-muted-foreground">
            {t("account.currentColon")}{" "}
            <Text className="text-foreground">{user?.email ?? "—"}</Text>
            {user?.emailVerified === false ? t("account.unverifiedSuffix") : ""}
          </Text>
          <Field
            label={t("account.newEmail")}
            value={newEmail}
            onChangeText={setNewEmail}
            placeholder="new@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Button onPress={onChangeEmail} loading={isSaving} disabled={!newEmail.trim()}>
            {t("account.changeEmail")}
          </Button>
          <Button variant="outline" onPress={onResendVerification} disabled={isSaving || !user?.email}>
            {t("account.resendVerification")}
          </Button>
        </Section>

        <Section title={t("account.sectionPassword")}>
          <Field
            label={t("account.currentPassword")}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="••••••••"
            secureTextEntry
            autoCapitalize="none"
          />
          <Field
            label={t("account.newPassword")}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder={t("account.passwordHint")}
            secureTextEntry
            autoCapitalize="none"
          />
          <Field
            label={t("account.confirmPassword")}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t("account.confirmPlaceholder")}
            secureTextEntry
            autoCapitalize="none"
          />
          <Button onPress={onChangePassword} loading={isSaving} disabled={!currentPassword || !newPassword}>
            {t("account.changePassword")}
          </Button>
        </Section>

        <Section title={t("account.section2fa")}>
          {twoFactorEnabled ? (
            <>
              <Text className="text-sm text-muted-foreground">
                {t("account.twoFaStatusEnabled")}
              </Text>
              <Field
                label={t("account.passwordToDisable")}
                value={tfPassword}
                onChangeText={setTfPassword}
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
              />
              <Button variant="destructive" onPress={onDisable2FA} loading={twoFactor.isBusy} disabled={!tfPassword}>
                {t("account.disable2fa")}
              </Button>
            </>
          ) : tfUri ? (
            <>
              <Text className="text-sm text-muted-foreground">
                {t("account.setupInstructions")}
              </Text>
              {!!totpSecret && (
                <View className="rounded-lg bg-muted px-3 py-2">
                  <Text className="text-xs uppercase text-muted-foreground">
                    {t("account.secret")}
                  </Text>
                  <Text className="font-mono text-sm text-foreground" selectable>
                    {totpSecret}
                  </Text>
                </View>
              )}
              {tfBackupCodes.length > 0 && (
                <View className="rounded-lg bg-muted px-3 py-2">
                  <Text className="mb-1 text-xs uppercase text-muted-foreground">
                    {t("account.backupCodes")}
                  </Text>
                  <Text className="font-mono text-sm text-foreground" selectable>
                    {tfBackupCodes.join("\n")}
                  </Text>
                </View>
              )}
              <Field
                label={t("account.code6")}
                value={tfCode}
                onChangeText={setTfCode}
                placeholder="123456"
                keyboardType="number-pad"
                maxLength={6}
              />
              <Button onPress={onVerify2FA} loading={twoFactor.isBusy} disabled={tfCode.length < 6}>
                {t("account.confirmEnable")}
              </Button>
            </>
          ) : (
            <>
              <Text className="text-sm text-muted-foreground">
                {t("account.twoFaPromo")}
              </Text>
              <Field
                label={t("account.passwordToEnable")}
                value={tfPassword}
                onChangeText={setTfPassword}
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
              />
              <Button onPress={onEnable2FA} loading={twoFactor.isBusy} disabled={!tfPassword}>
                {t("account.enable2fa")}
              </Button>
            </>
          )}
        </Section>

        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
