import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useClient } from "@objectstack/client-react";
import { AlertCircle } from "lucide-react-native";
import { ScreenHeader } from "~/components/common/ScreenHeader";
import { EmptyState } from "~/components/ui/EmptyState";
import { PageRenderer } from "~/components/renderers/PageRenderer";
import {
  validatePageSchema,
  type PageSchema,
} from "~/lib/page-renderer";

/**
 * Dynamic SDUI page route.
 * Fetches a PageSchema by ID from the server and renders it
 * using the PageRenderer component.
 *
 * Route: app/(app)/page/[id].tsx
 */
export default function SDUIPageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = useClient();
  const [schema, setSchema] = useState<PageSchema | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function fetchPage() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await client.meta.getItem("page", id!);
        if (cancelled) return;
        const validated = validatePageSchema(result);
        if (!validated) {
          setError(new Error(`Invalid page schema for "${id}"`));
        } else {
          setSchema(validated);
        }
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err : new Error("Failed to load page"),
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchPage();
    return () => {
      cancelled = true;
    };
  }, [client, id]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <ScreenHeader title={schema?.label ?? id ?? "Page"} />
      {error && !isLoading ? (
        <EmptyState
          icon={AlertCircle}
          variant="error"
          title="Couldn't Load Page"
          description={error.message}
        />
      ) : schema ? (
        <PageRenderer schema={schema} isLoading={isLoading} />
      ) : (
        <PageRenderer
          schema={{ name: id ?? "", regions: [] }}
          isLoading={isLoading}
          error={error}
        />
      )}
    </SafeAreaView>
  );
}
