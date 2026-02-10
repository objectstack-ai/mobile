import React from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import {
  resolvePageSchema,
  type PageSchema,
  type ResolvedPage,
  type ResolvedComponent,
} from "~/lib/page-renderer";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface PageRendererProps {
  /** Raw or pre-validated PageSchema */
  schema: PageSchema;
  /** Variable overrides for template bindings */
  variables?: Record<string, unknown>;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Error */
  error?: Error | null;
  /** Custom component renderer override */
  renderComponent?: (component: ResolvedComponent) => React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Default component renderers                                        */
/* ------------------------------------------------------------------ */

function DefaultComponentRenderer({
  component,
}: {
  component: ResolvedComponent;
}) {
  const { type, props } = component;

  switch (type) {
    case "page:header":
      return (
        <View className="px-4 py-3">
          <Text className="text-xl font-bold text-foreground">
            {String(props.title ?? "")}
          </Text>
          {props.subtitle ? (
            <Text className="text-sm text-muted-foreground mt-1">
              {String(props.subtitle)}
            </Text>
          ) : null}
        </View>
      );

    case "page:tabs":
      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="border-b border-border"
        >
          <View className="flex-row px-4 gap-4">
            {(Array.isArray(props.tabs) ? props.tabs : []).map(
              (tab: unknown, idx: number) => {
                const tabObj = tab as Record<string, unknown>;
                return (
                  <View key={idx} className="py-2 border-b-2 border-primary">
                    <Text className="text-sm font-medium text-primary">
                      {String(tabObj?.label ?? tabObj?.name ?? `Tab ${idx + 1}`)}
                    </Text>
                  </View>
                );
              },
            )}
          </View>
        </ScrollView>
      );

    case "page:card":
      return (
        <Card className="mx-4 my-2">
          {props.title ? (
            <CardHeader>
              <CardTitle>{String(props.title)}</CardTitle>
            </CardHeader>
          ) : null}
          <CardContent>
            {props.content ? (
              <Text className="text-sm text-foreground">
                {String(props.content)}
              </Text>
            ) : (
              <Text className="text-sm text-muted-foreground">
                Card component
              </Text>
            )}
          </CardContent>
        </Card>
      );

    case "record:details":
      return (
        <Card className="mx-4 my-2">
          <CardHeader>
            <CardTitle>
              {String(props.title ?? "Record Details")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Text className="text-sm text-muted-foreground">
              Record details for {String(props.object ?? "unknown")}
              {props.recordId ? ` #${String(props.recordId)}` : ""}
            </Text>
          </CardContent>
        </Card>
      );

    case "record:related_list":
      return (
        <Card className="mx-4 my-2">
          <CardHeader>
            <CardTitle>
              {String(props.title ?? "Related Records")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Text className="text-sm text-muted-foreground">
              Related list: {String(props.relatedObject ?? "—")}
            </Text>
          </CardContent>
        </Card>
      );

    case "record:highlights":
      return (
        <View className="mx-4 my-2 flex-row flex-wrap gap-3">
          {(Array.isArray(props.fields) ? props.fields : []).map(
            (field: unknown, idx: number) => {
              const f = field as Record<string, unknown>;
              return (
                <View key={idx} className="bg-muted/50 rounded-lg px-3 py-2">
                  <Text className="text-xs text-muted-foreground">
                    {String(f?.label ?? f?.field ?? `Field ${idx + 1}`)}
                  </Text>
                  <Text className="text-sm font-semibold text-foreground">
                    {String(f?.value ?? "—")}
                  </Text>
                </View>
              );
            },
          )}
        </View>
      );

    default:
      return (
        <View className="mx-4 my-2 bg-muted/30 rounded-lg px-3 py-2">
          <Text className="text-xs text-muted-foreground">
            Component: {type}
          </Text>
        </View>
      );
  }
}

/* ------------------------------------------------------------------ */
/*  Layout renderers                                                   */
/* ------------------------------------------------------------------ */

function SingleColumnLayout({
  page,
  renderComp,
}: {
  page: ResolvedPage;
  renderComp: (c: ResolvedComponent) => React.ReactNode;
}) {
  return (
    <View className="flex-1">
      {page.regions.map((region) => (
        <View key={region.name}>
          {region.components.map((comp, idx) => (
            <React.Fragment key={`${region.name}-${idx}`}>
              {renderComp(comp)}
            </React.Fragment>
          ))}
        </View>
      ))}
    </View>
  );
}

function TwoColumnLayout({
  page,
  renderComp,
}: {
  page: ResolvedPage;
  renderComp: (c: ResolvedComponent) => React.ReactNode;
}) {
  const [left, right] = [
    page.regions.find((r) => r.name === "left" || r.name === "main") ??
      page.regions[0],
    page.regions.find((r) => r.name === "right" || r.name === "sidebar") ??
      page.regions[1],
  ];

  return (
    <View className="flex-1 flex-row">
      <View className="flex-1">
        {left?.components.map((comp, idx) => (
          <React.Fragment key={`left-${idx}`}>
            {renderComp(comp)}
          </React.Fragment>
        ))}
      </View>
      {right && (
        <View className="w-1/3">
          {right.components.map((comp, idx) => (
            <React.Fragment key={`right-${idx}`}>
              {renderComp(comp)}
            </React.Fragment>
          ))}
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Renderer                                                      */
/* ------------------------------------------------------------------ */

/**
 * SDUI Page renderer – renders a server-driven page from a PageSchema.
 *
 * Spec compliance: Rule #1 SDUI (render from PageSchema).
 */
export function PageRenderer({
  schema,
  variables,
  isLoading,
  error,
  renderComponent,
}: PageRendererProps) {
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center px-6 py-12">
        <Text className="text-destructive text-center">{error.message}</Text>
      </View>
    );
  }

  const page: ResolvedPage = resolvePageSchema(schema, variables);

  const renderComp = (comp: ResolvedComponent): React.ReactNode => {
    if (renderComponent) return renderComponent(comp);
    return <DefaultComponentRenderer component={comp} />;
  };

  return (
    <ScrollView className="flex-1">
      {page.layout === "two-column" ? (
        <TwoColumnLayout page={page} renderComp={renderComp} />
      ) : (
        <SingleColumnLayout page={page} renderComp={renderComp} />
      )}
    </ScrollView>
  );
}
