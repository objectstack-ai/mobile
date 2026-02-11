import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useClient } from "@objectstack/client-react";
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
    <>
      <Stack.Screen options={{ title: schema?.label ?? id ?? "Page" }} />
      {error && !isLoading ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-destructive text-center">{error.message}</Text>
        </View>
      ) : schema ? (
        <PageRenderer schema={schema} isLoading={isLoading} />
      ) : (
        <PageRenderer
          schema={{ name: id ?? "", regions: [] }}
          isLoading={isLoading}
          error={error}
        />
      )}
    </>
  );
}
