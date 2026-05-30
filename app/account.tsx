import { useState } from "react";
import { View, Text, ScrollView, Alert, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { authClient } from "~/lib/auth-client";
import { useAccount } from "~/hooks/useAccount";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";

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
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const { updateProfile, changePassword, changeEmail, resendVerification, isSaving } =
    useAccount();

  const [name, setName] = useState(user?.name ?? "");
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      {/* Header */}
      <View className="flex-row items-center border-b border-border/30 px-3 py-2">
        <TouchableOpacity
          className="p-2"
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-foreground">Account</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <Section title="Profile">
          <Field
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            autoCapitalize="words"
          />
          <Button onPress={onSaveName} disabled={isSaving || !name.trim()}>
            <Text className="font-semibold text-primary-foreground">Save profile</Text>
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
          <Button onPress={onChangeEmail} disabled={isSaving || !newEmail.trim()}>
            <Text className="font-semibold text-primary-foreground">Change email</Text>
          </Button>
          <Button variant="outline" onPress={onResendVerification} disabled={isSaving || !user?.email}>
            <Text className="font-semibold text-foreground">Resend verification</Text>
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
          <Button onPress={onChangePassword} disabled={isSaving || !currentPassword || !newPassword}>
            <Text className="font-semibold text-primary-foreground">Change password</Text>
          </Button>
        </Section>

        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
