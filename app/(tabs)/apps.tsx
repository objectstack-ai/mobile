import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LayoutGrid } from "lucide-react-native";

export default function AppsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8 pt-4"
      >
        <View className="flex-1 items-center justify-center pt-20">
          <View className="rounded-2xl bg-muted p-6">
            <LayoutGrid size={40} color="#94a3b8" />
          </View>
          <Text className="mt-5 text-lg font-semibold text-foreground">
            Apps
          </Text>
          <Text className="mt-2 text-center text-sm text-muted-foreground">
            Your enterprise applications will appear here.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
