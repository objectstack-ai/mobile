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
import { Boxes, Eye, EyeOff } from "lucide-react-native";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { authClient } from "~/lib/auth-client";
import { useServerStore } from "~/stores/server-store";

const SSO_PROVIDER_LABELS: Record<string, string> = {
  google: "Continue with Google",
  apple: "Continue with Apple",
  github: "Continue with GitHub",
};

const PLATFORM_RESTRICTED: Record<string, string[]> = {
  apple: ["ios"],
};

export default function SignUpScreen() {
  const router = useRouter();
  const ssoProviders = useServerStore((s) => s.ssoProviders);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSignUp = async () => {
    if (!name || !email || !password) {
      setErrorMsg("Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      const { error } = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      if (error) {
        setErrorMsg(error.message ?? "Sign up failed. Please try again.");
      } else {
        router.replace("/(tabs)");
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
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
      setErrorMsg("Something went wrong. Please try again.");
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
              Create account
            </Text>
            <Text className="mt-2 text-center text-base text-muted-foreground">
              Sign up to get started with ObjectStack.
            </Text>
          </View>

          <View className="gap-4">
            <View>
              <Text className="mb-1.5 text-sm font-medium text-foreground">
                Full Name
              </Text>
              <Input
                placeholder="John Doe"
                textContentType="name"
                autoComplete="name"
                autoCapitalize="words"
                returnKeyType="next"
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  if (errorMsg) setErrorMsg(null);
                }}
              />
            </View>

            <View>
              <Text className="mb-1.5 text-sm font-medium text-foreground">
                Email
              </Text>
              <Input
                placeholder="you@company.com"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="next"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (errorMsg) setErrorMsg(null);
                }}
              />
            </View>

            <View>
              <Text className="mb-1.5 text-sm font-medium text-foreground">
                Password
              </Text>
              <Input
                placeholder="At least 8 characters"
                secureTextEntry={!showPassword}
                textContentType="newPassword"
                returnKeyType="go"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (errorMsg) setErrorMsg(null);
                }}
                onSubmitEditing={handleSignUp}
                rightSlot={
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showPassword ? "Hide password" : "Show password"
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

            <Button className="mt-2" onPress={handleSignUp} loading={loading}>
              {loading ? "Creating account…" : "Create Account"}
            </Button>
          </View>

          {visibleProviders.length > 0 && (
            <>
              <View className="my-8 flex-row items-center">
                <View className="h-px flex-1 bg-border" />
                <Text className="mx-4 text-sm text-muted-foreground">or</Text>
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
                    {SSO_PROVIDER_LABELS[id] ?? `Continue with ${id}`}
                  </Button>
                ))}
              </View>
            </>
          )}

          <View className="mt-8 flex-row justify-center">
            <Text className="text-sm text-muted-foreground">
              Already have an account?{" "}
            </Text>
            <Link href="/(auth)/sign-in">
              <Text className="text-sm font-semibold text-primary">
                Sign In
              </Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
