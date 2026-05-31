import { useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authClient } from "~/lib/auth-client";
import { useAccount } from "~/hooks/useAccount";
import { useTwoFactor } from "~/hooks/useTwoFactor";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { ScreenHeader } from "~/components/common/ScreenHeader";

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

  const notify = (msg: string) => Alert.alert("Account", msg);
  const fail = (e: unknown) =>
    Alert.alert("Account", e instanceof Error ? e.message : "Something went wrong");

  const onSaveName = async () => {
    if (!name.trim()) return;
    try {
      await updateProfile(name.trim());
      notify("Profile updated.");
    } catch (e) {
      fail(e);
    }
  };

  const onChangeEmail = async () => {
    if (!newEmail.trim()) return;
    try {
      await changeEmail(newEmail.trim());
      setNewEmail("");
      notify("Verification sent to the new address. The change applies once you confirm it.");
    } catch (e) {
      fail(e);
    }
  };

  const onResendVerification = async () => {
    if (!user?.email) return;
    try {
      await resendVerification(user.email);
      notify("Verification email sent.");
    } catch (e) {
      fail(e);
    }
  };

  const onChangePassword = async () => {
    if (!currentPassword || !newPassword) return;
    if (newPassword.length < 8) {
      notify("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      notify("New password and confirmation do not match.");
      return;
    }
    try {
      await changePassword(currentPassword, newPassword, true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      notify("Password changed. Other sessions were signed out.");
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
      notify("Two-factor authentication is now enabled.");
    } catch (e) {
      fail(e);
    }
  };

  const onDisable2FA = async () => {
    if (!tfPassword) return;
    try {
      await twoFactor.disable(tfPassword);
      setTfPassword("");
      notify("Two-factor authentication disabled.");
    } catch (e) {
      fail(e);
    }
  };

  /** Extract the otpauth secret for manual entry into an authenticator app. */
  const totpSecret = tfUri ? /[?&]secret=([^&]+)/.exec(tfUri)?.[1] ?? null : null;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <ScreenHeader title="Account" />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <Section title="Profile">
          <Field
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            autoCapitalize="words"
          />
          <Button onPress={onSaveName} loading={isSaving} disabled={!name.trim()}>
            Save profile
          </Button>
        </Section>

        <Section title="Email">
          <Text className="text-sm text-muted-foreground">
            Current: <Text className="text-foreground">{user?.email ?? "—"}</Text>
            {user?.emailVerified === false ? " (unverified)" : ""}
          </Text>
          <Field
            label="New email"
            value={newEmail}
            onChangeText={setNewEmail}
            placeholder="new@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Button onPress={onChangeEmail} loading={isSaving} disabled={!newEmail.trim()}>
            Change email
          </Button>
          <Button variant="outline" onPress={onResendVerification} disabled={isSaving || !user?.email}>
            Resend verification
          </Button>
        </Section>

        <Section title="Password">
          <Field
            label="Current password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="••••••••"
            secureTextEntry
            autoCapitalize="none"
          />
          <Field
            label="New password"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="At least 8 characters"
            secureTextEntry
            autoCapitalize="none"
          />
          <Field
            label="Confirm new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter new password"
            secureTextEntry
            autoCapitalize="none"
          />
          <Button onPress={onChangePassword} loading={isSaving} disabled={!currentPassword || !newPassword}>
            Change password
          </Button>
        </Section>

        <Section title="Two-Factor Authentication">
          {twoFactorEnabled ? (
            <>
              <Text className="text-sm text-muted-foreground">
                Two-factor authentication is <Text className="text-foreground">enabled</Text>.
              </Text>
              <Field
                label="Password (to disable)"
                value={tfPassword}
                onChangeText={setTfPassword}
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
              />
              <Button variant="destructive" onPress={onDisable2FA} loading={twoFactor.isBusy} disabled={!tfPassword}>
                Disable 2FA
              </Button>
            </>
          ) : tfUri ? (
            <>
              <Text className="text-sm text-muted-foreground">
                Add this secret to your authenticator app, then enter the 6-digit code to confirm.
              </Text>
              {!!totpSecret && (
                <View className="rounded-lg bg-muted px-3 py-2">
                  <Text className="text-xs uppercase text-muted-foreground">Secret</Text>
                  <Text className="font-mono text-sm text-foreground" selectable>
                    {totpSecret}
                  </Text>
                </View>
              )}
              {tfBackupCodes.length > 0 && (
                <View className="rounded-lg bg-muted px-3 py-2">
                  <Text className="mb-1 text-xs uppercase text-muted-foreground">
                    Backup codes (save these)
                  </Text>
                  <Text className="font-mono text-sm text-foreground" selectable>
                    {tfBackupCodes.join("\n")}
                  </Text>
                </View>
              )}
              <Field
                label="6-digit code"
                value={tfCode}
                onChangeText={setTfCode}
                placeholder="123456"
                keyboardType="number-pad"
                maxLength={6}
              />
              <Button onPress={onVerify2FA} loading={twoFactor.isBusy} disabled={tfCode.length < 6}>
                Confirm &amp; enable
              </Button>
            </>
          ) : (
            <>
              <Text className="text-sm text-muted-foreground">
                Protect your account with a time-based one-time code (TOTP).
              </Text>
              <Field
                label="Password (to enable)"
                value={tfPassword}
                onChangeText={setTfPassword}
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
              />
              <Button onPress={onEnable2FA} loading={twoFactor.isBusy} disabled={!tfPassword}>
                Enable 2FA
              </Button>
            </>
          )}
        </Section>

        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
