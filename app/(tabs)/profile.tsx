import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { UserCircle } from "lucide-react-native";
import { Button } from "~/components/ui/Button";

export default function ProfileScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8 pt-4"
      >
        <View className="items-center pt-10">
          <View className="rounded-full bg-muted p-5">
            <UserCircle size={56} color="#94a3b8" />
          </View>
          <Text className="mt-4 text-xl font-bold text-foreground">
            John Doe
          </Text>
          <Text className="mt-1 text-sm text-muted-foreground">
            john.doe@company.com
          </Text>
        </View>

        <View className="mt-8 gap-3">
          <Button variant="outline">Edit Profile</Button>
          <Button variant="outline">Settings</Button>
          <Button variant="ghost">Help &amp; Support</Button>
          <Button variant="destructive">Sign Out</Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
