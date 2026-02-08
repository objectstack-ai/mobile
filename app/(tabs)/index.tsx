import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign, Activity } from "lucide-react-native";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";

interface DashboardCardMeta {
  type: "card";
  title: string;
  value: string;
  trend: string;
  icon: string;
}

const dashboardMetadata: DashboardCardMeta[] = [
  { type: "card", title: "Monthly Sales", value: "$120,000", trend: "+12%", icon: "dollar-sign" },
  { type: "card", title: "Active Users", value: "8,420", trend: "+5.2%", icon: "users" },
  { type: "card", title: "Orders", value: "1,340", trend: "-2.1%", icon: "shopping-cart" },
  { type: "card", title: "Revenue Growth", value: "23.5%", trend: "+8.7%", icon: "activity" },
];

const iconMap: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  "dollar-sign": DollarSign,
  users: Users,
  "shopping-cart": ShoppingCart,
  activity: Activity,
};

function TrendBadge({ trend }: { trend: string }) {
  const isPositive = trend.startsWith("+");
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  return (
    <View
      className={`flex-row items-center rounded-full px-2.5 py-1 ${
        isPositive ? "bg-emerald-50" : "bg-red-50"
      }`}
    >
      <TrendIcon size={12} color={isPositive ? "#059669" : "#dc2626"} />
      <Text
        className={`ml-1 text-xs font-semibold ${
          isPositive ? "text-emerald-700" : "text-red-600"
        }`}
      >
        {trend}
      </Text>
    </View>
  );
}

function MetadataCardRenderer({ meta }: { meta: DashboardCardMeta }) {
  const IconComponent = iconMap[meta.icon] ?? Activity;

  return (
    <Card className="mb-3">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {meta.title}
        </CardTitle>
        <View className="rounded-lg bg-primary/10 p-2">
          <IconComponent size={18} color="#1e40af" />
        </View>
      </CardHeader>
      <CardContent>
        <Text className="text-2xl font-bold text-card-foreground">
          {meta.value}
        </Text>
        <View className="mt-2">
          <TrendBadge trend={meta.trend} />
        </View>
      </CardContent>
    </Card>
  );
}

function renderFromMetadata(metadata: DashboardCardMeta[]) {
  return metadata.map((item, index) => {
    switch (item.type) {
      case "card":
        return <MetadataCardRenderer key={index} meta={item} />;
      default:
        return null;
    }
  });
}

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-5">
          <Text className="text-2xl font-bold text-foreground">
            Dashboard
          </Text>
          <Text className="mt-1 text-sm text-muted-foreground">
            Welcome back. Here&apos;s your overview.
          </Text>
        </View>

        {renderFromMetadata(dashboardMetadata)}
      </ScrollView>
    </SafeAreaView>
  );
}
