import React from "react";
import { View, Text, ScrollView } from "react-native";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface FlowViewerProps {
  /** Flow nodes to render */
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    x?: number;
    y?: number;
  }>;
  /** Edges connecting nodes */
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
  }>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getNodeLabel(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function findEdgesForNode(
  nodeId: string,
  edges: FlowViewerProps["edges"],
): FlowViewerProps["edges"] {
  return edges.filter((e) => e.source === nodeId);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * Read-only flow diagram showing automation nodes and edges.
 */
export function FlowViewer({ nodes, edges }: FlowViewerProps) {
  if (nodes.length === 0) {
    return (
      <View className="items-center py-8">
        <Text className="text-sm text-muted-foreground">
          No flow steps defined
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1">
      <View className="gap-3 px-4 py-3">
        {nodes.map((node, index) => {
          const outEdges = findEdgesForNode(node.id, edges);

          return (
            <View key={node.id}>
              {/* Node */}
              <View className="rounded-xl border border-border bg-card px-4 py-3">
                <Text className="text-xs text-muted-foreground">
                  {getNodeLabel(node.type)}
                </Text>
                <Text className="mt-0.5 text-sm font-semibold text-foreground">
                  {node.label}
                </Text>
              </View>

              {/* Edges */}
              {outEdges.map((edge) => (
                <View
                  key={edge.id}
                  className="items-center gap-0.5 py-1.5"
                >
                  <View className="h-4 w-px bg-muted-foreground/30" />
                  {edge.label && (
                    <Text className="text-[10px] text-muted-foreground">
                      {edge.label}
                    </Text>
                  )}
                  <Text className="text-xs text-muted-foreground">↓</Text>
                </View>
              ))}

              {/* Spacer between unconnected nodes at the end */}
              {outEdges.length === 0 && index < nodes.length - 1 && (
                <View className="items-center py-1.5">
                  <View className="h-4 w-px bg-muted-foreground/20" />
                  <Text className="text-xs text-muted-foreground">↓</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
