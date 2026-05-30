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

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSignIn = async () => {
    if (!email || !password) {
      setErrorMsg("Please enter your email and password.");
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
        setErrorMsg(error.message ?? "Sign in failed. Please try again.");
      } else {
        router.replace("/(tabs)");
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignIn = async (provider: "google" | "apple") => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: "/(tabs)",
      });
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
              Welcome back
            </Text>
            <Text className="mt-2 text-center text-base text-muted-foreground">
              Sign in to your account to continue.
            </Text>
          </View>

          <View className="gap-4">
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
                Password
              </Text>
              <Input
                placeholder="Enter your password"
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

            <Button className="mt-2" onPress={handleSignIn} loading={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </Button>
          </View>

          <View className="my-8 flex-row items-center">
            <View className="h-px flex-1 bg-border" />
            <Text className="mx-4 text-sm text-muted-foreground">or</Text>
            <View className="h-px flex-1 bg-border" />
          </View>

          <View className="gap-3">
            <Button
              variant="outline"
              onPress={() => handleSocialSignIn("google")}
              disabled={loading}
            >
              Continue with Google
            </Button>
            {Platform.OS === "ios" && (
              <Button
                variant="outline"
                onPress={() => handleSocialSignIn("apple")}
                disabled={loading}
              >
                Continue with Apple
              </Button>
            )}
          </View>

          <View className="mt-8 flex-row justify-center">
            <Text className="text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
            </Text>
            <Link href="/(auth)/sign-up">
              <Text className="text-sm font-semibold text-primary">
                Sign Up
              </Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
