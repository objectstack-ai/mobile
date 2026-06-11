import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Package, ToggleLeft, ToggleRight, Trash2 } from "lucide-react-native";
import { usePackageManagement } from "~/hooks/usePackageManagement";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { ScreenHeader } from "~/components/common/ScreenHeader";
import { EmptyState } from "~/components/ui/EmptyState";
import { ListSkeleton } from "~/components/ui/ListSkeleton";
import { useConfirm } from "~/components/ui/ConfirmDialog";
import { useThemeColors } from "~/lib/theme-colors";

/**
 * Package management screen – list, enable, disable, uninstall packages.
 *
 * Route: app/(app)/packages.tsx
 */
export default function PackagesScreen() {
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  const { packages, isLoading, error, refetch, enable, disable, uninstall } =
    usePackageManagement();
  const confirm = useConfirm();

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

  const handleUninstall = async (id: string, name: string) => {
    const ok = await confirm({
      title: "Uninstall Package",
      message: `Are you sure you want to uninstall "${name}"?`,
      confirmLabel: "Uninstall",
      destructive: true,
    });
    if (!ok) return;
    try {
      await uninstall(id);
    } catch {
      // Error is already set in the hook
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <ScreenHeader title={t("common.packages")} />
      <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-4">
        {isLoading && !packages.length ? (
          <View className="p-4">
            <ListSkeleton count={5} />
          </View>
        ) : error ? (
          <View className="pt-24">
            <EmptyState
              icon={Package}
              variant="error"
              title={t("empty.loadPackages")}
              description={error.message}
              actionLabel="Retry"
              onAction={refetch}
            />
          </View>
        ) : !packages.length ? (
          <View className="pt-24">
            <EmptyState
              icon={Package}
              title={t("empty.packagesTitle")}
              description={t("empty.packagesDesc")}
            />
          </View>
        ) : (
          <View className="p-4 gap-3">
            {packages.map((pkg) => (
              <Card key={pkg.id}>
                <CardHeader>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2 flex-1">
                      <Package size={18} color={accent} />
                      <CardTitle>{pkg.label}</CardTitle>
                    </View>
                    <View className="flex-row items-center gap-3">
                      <TouchableOpacity
                        onPress={() => handleToggle(pkg.id, pkg.enabled)}
                        hitSlop={8}
                        accessibilityRole="switch"
                        accessibilityState={{ checked: pkg.enabled }}
                        accessibilityLabel={`${pkg.enabled ? "Disable" : "Enable"} ${pkg.label}`}
                      >
                        {pkg.enabled ? (
                          <ToggleRight size={24} color="#16a34a" />
                        ) : (
                          <ToggleLeft size={24} color="#9ca3af" />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleUninstall(pkg.id, pkg.label)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`Uninstall ${pkg.label}`}
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
    </SafeAreaView>
  );
}
