import React from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Boxes, Eye, EyeOff } from "lucide-react-native";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { authClient } from "~/lib/auth-client";
import { useServerStore } from "~/stores/server-store";

/** Brand names for SSO providers — not translated; only the surrounding copy is. */
const SSO_PROVIDER_NAMES: Record<string, string> = {
  google: "Google",
  apple: "Apple",
  github: "GitHub",
};

const PLATFORM_RESTRICTED: Record<string, string[]> = {
  apple: ["ios"],
};

export default function SignInScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const ssoProviders = useServerStore((s) => s.ssoProviders);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSignIn = async () => {
    if (!email || !password) {
      setErrorMsg(t("auth.errEmailPassword"));
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      const { error } = await authClient.signIn.email({
        email: email.trim(),
        password,
      });
      if (error) {
        setErrorMsg(error.message ?? t("auth.errSignInFailed"));
      } else {
        router.replace("/(tabs)");
      }
    } catch {
      setErrorMsg(t("auth.errGeneric"));
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignIn = async (provider: string) => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await authClient.signIn.social({
        provider: provider as Parameters<typeof authClient.signIn.social>[0]["provider"],
        callbackURL: "/(tabs)",
      });
    } catch {
      setErrorMsg(t("auth.errGeneric"));
    } finally {
      setLoading(false);
    }
  };

  const visibleProviders = (ssoProviders ?? []).filter((id) => {
    const platforms = PLATFORM_RESTRICTED[id];
    return !platforms || platforms.includes(Platform.OS);
  });

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pb-8 pt-10"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View className="mb-8 items-center">
            <View className="mb-5 h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Boxes size={32} color="rgb(30 64 175)" />
            </View>
            <Text className="text-center text-3xl font-bold text-foreground">
              {t("auth.welcomeBack")}
            </Text>
            <Text className="mt-2 text-center text-base text-muted-foreground">
              {t("auth.signInSubtitle")}
            </Text>
          </View>

          <View className="gap-4">
            <View>
              <Text className="mb-1.5 text-sm font-medium text-foreground">
                {t("auth.email")}
              </Text>
              <Input
                placeholder={t("auth.emailPlaceholder")}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="next"
                error={!!errorMsg}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (errorMsg) setErrorMsg(null);
                }}
              />
            </View>

            <View>
              <Text className="mb-1.5 text-sm font-medium text-foreground">
                {t("auth.password")}
              </Text>
              <Input
                placeholder={t("auth.passwordPlaceholder")}
                secureTextEntry={!showPassword}
                textContentType="password"
                returnKeyType="go"
                error={!!errorMsg}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (errorMsg) setErrorMsg(null);
                }}
                onSubmitEditing={handleSignIn}
                rightSlot={
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showPassword ? t("auth.hidePassword") : t("auth.showPassword")
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={20} color="#94a3b8" />
                    ) : (
                      <Eye size={20} color="#94a3b8" />
                    )}
                  </Pressable>
                }
              />
            </View>

            {errorMsg ? (
              <Text className="text-sm text-destructive">{errorMsg}</Text>
            ) : null}

            <Button className="mt-2" onPress={handleSignIn} loading={loading}>
              {loading ? t("auth.signingIn") : t("auth.signIn")}
            </Button>
          </View>

          {visibleProviders.length > 0 && (
            <>
              <View className="my-8 flex-row items-center">
                <View className="h-px flex-1 bg-border" />
                <Text className="mx-4 text-sm text-muted-foreground">{t("auth.or")}</Text>
                <View className="h-px flex-1 bg-border" />
              </View>

              <View className="gap-3">
                {visibleProviders.map((id) => (
                  <Button
                    key={id}
                    variant="outline"
                    onPress={() => handleSocialSignIn(id)}
                    disabled={loading}
                  >
                    {t("auth.continueWith", {
                      provider: SSO_PROVIDER_NAMES[id] ?? id,
                    })}
                  </Button>
                ))}
              </View>
            </>
          )}

          <View className="mt-8 flex-row justify-center">
            <Text className="text-sm text-muted-foreground">
              {t("auth.noAccount")}{" "}
            </Text>
            <Link href="/(auth)/sign-up">
              <Text className="text-sm font-semibold text-primary">
                {t("auth.signUp")}
              </Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
