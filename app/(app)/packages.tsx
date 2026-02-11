import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Stack } from "expo-router";
import { Package, ToggleLeft, ToggleRight, Trash2 } from "lucide-react-native";
import { usePackageManagement } from "~/hooks/usePackageManagement";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";

/**
 * Package management screen – list, enable, disable, uninstall packages.
 *
 * Route: app/(app)/packages.tsx
 */
export default function PackagesScreen() {
  const { packages, isLoading, error, refetch, enable, disable, uninstall } =
    usePackageManagement();

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      if (enabled) {
        await disable(id);
      } else {
        await enable(id);
      }
    } catch {
      // Error is already set in the hook
    }
  };

  const handleUninstall = (id: string, name: string) => {
    Alert.alert(
      "Uninstall Package",
      `Are you sure you want to uninstall "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Uninstall",
          style: "destructive",
          onPress: async () => {
            try {
              await uninstall(id);
            } catch {
              // Error is already set in the hook
            }
          },
        },
      ],
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: "Packages" }} />
      <ScrollView className="flex-1 bg-background">
        {isLoading && !packages.length ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color="#1e40af" />
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center px-6 py-20">
            <Text className="text-destructive text-center mb-4">
              {error.message}
            </Text>
            <TouchableOpacity
              onPress={refetch}
              className="bg-primary px-4 py-2 rounded-lg"
            >
              <Text className="text-primary-foreground font-medium">
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : !packages.length ? (
          <View className="flex-1 items-center justify-center px-6 py-20">
            <Package size={48} color="#9ca3af" />
            <Text className="text-muted-foreground mt-4">
              No packages installed
            </Text>
          </View>
        ) : (
          <View className="p-4 gap-3">
            {packages.map((pkg) => (
              <Card key={pkg.id}>
                <CardHeader>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2 flex-1">
                      <Package size={18} color="#1e40af" />
                      <CardTitle>{pkg.label}</CardTitle>
                    </View>
                    <View className="flex-row items-center gap-3">
                      <TouchableOpacity
                        onPress={() => handleToggle(pkg.id, pkg.enabled)}
                      >
                        {pkg.enabled ? (
                          <ToggleRight size={24} color="#16a34a" />
                        ) : (
                          <ToggleLeft size={24} color="#9ca3af" />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleUninstall(pkg.id, pkg.label)}
                      >
                        <Trash2 size={18} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </CardHeader>
                <CardContent>
                  {pkg.description && (
                    <Text className="text-sm text-muted-foreground mb-1">
                      {pkg.description}
                    </Text>
                  )}
                  <View className="flex-row items-center gap-2">
                    {pkg.version && (
                      <Text className="text-xs text-muted-foreground">
                        v{pkg.version}
                      </Text>
                    )}
                    <View
                      className={`px-2 py-0.5 rounded-full ${
                        pkg.enabled ? "bg-green-100" : "bg-gray-100"
                      }`}
                    >
                      <Text
                        className={`text-xs ${
                          pkg.enabled
                            ? "text-green-700"
                            : "text-gray-500"
                        }`}
                      >
                        {pkg.enabled ? "Enabled" : "Disabled"}
                      </Text>
                    </View>
                  </View>
                </CardContent>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
}
