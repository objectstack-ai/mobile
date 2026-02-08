import React from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { authClient } from "~/lib/auth-client";

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await authClient.signIn.email({
        email,
        password,
      });
      if (error) {
        Alert.alert("Sign In Failed", error.message ?? "An error occurred.");
      } else {
        router.replace("/(tabs)");
      }
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignIn = async (provider: "google" | "apple") => {
    setLoading(true);
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: "/(tabs)",
      });
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
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
          contentContainerClassName="px-6 pb-8 pt-12"
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-10">
            <Text className="text-3xl font-bold text-foreground">
              Welcome back
            </Text>
            <Text className="mt-2 text-base text-muted-foreground">
              Sign in to your account to continue.
            </Text>
          </View>

          <View className="gap-4">
            <View>
              <Text className="mb-1.5 text-sm font-medium text-foreground">
                Email
              </Text>
              <View className="flex-row items-center">
                <Input
                  className="flex-1"
                  containerClassName="flex-1"
                  placeholder="you@company.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            <View>
              <Text className="mb-1.5 text-sm font-medium text-foreground">
                Password
              </Text>
              <Input
                placeholder="Enter your password"
                secureTextEntry
                textContentType="password"
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <Button
              className="mt-2"
              onPress={handleSignIn}
              disabled={loading}
            >
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
