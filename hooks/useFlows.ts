import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiFetch } from "~/lib/objectstack";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface FlowNode {
  id: string;
  type: string;
  label: string;
  config?: Record<string, unknown>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface FlowVariable {
  name: string;
  type?: string;
  isInput?: boolean;
  isOutput?: boolean;
}

/**
 * A flow definition as returned by the metadata API (`/api/v1/meta/flow`).
 * Shape mirrors `@objectstack/spec` flow metadata: a list of `nodes` plus the
 * `edges` connecting them, which map directly onto the `FlowViewer` diagram.
 */
export interface FlowDefinition {
  name: string;
  label: string;
  description?: string;
  version?: number;
  status?: string;
  /** Trigger kind: `schedule`, `record`, `manual`, … */
  type?: string;
  active?: boolean;
  variables: FlowVariable[];
  nodes: FlowNode[];
  edges: FlowEdge[];
}

/* ------------------------------------------------------------------ */
/*  Fetch + normalize                                                  */
/* ------------------------------------------------------------------ */

function normalizeFlow(raw: Record<string, unknown>): FlowDefinition {
  const nodes = Array.isArray(raw.nodes) ? (raw.nodes as Record<string, unknown>[]) : [];
  const edges = Array.isArray(raw.edges) ? (raw.edges as Record<string, unknown>[]) : [];
  const variables = Array.isArray(raw.variables)
    ? (raw.variables as Record<string, unknown>[])
    : [];
  const name = String(raw.name ?? "");
  return {
    name,
    label: String(raw.label ?? name),
    description: raw.description ? String(raw.description) : undefined,
    version: typeof raw.version === "number" ? raw.version : undefined,
    status: raw.status ? String(raw.status) : undefined,
    type: raw.type ? String(raw.type) : undefined,
    active: typeof raw.active === "boolean" ? raw.active : undefined,
    variables: variables.map((v) => ({
      name: String(v.name ?? ""),
      type: v.type ? String(v.type) : undefined,
      isInput: v.isInput === true,
      isOutput: v.isOutput === true,
    })),
    nodes: nodes.map((n, i) => ({
      id: String(n.id ?? `node-${i}`),
      type: String(n.type ?? "step"),
      label: String(n.label ?? n.id ?? `Step ${i + 1}`),
      config: (n.config as Record<string, unknown>) ?? undefined,
    })),
    edges: edges.map((e, i) => ({
      id: String(e.id ?? `edge-${i}`),
      source: String(e.source ?? ""),
      target: String(e.target ?? ""),
      label: e.label ? String(e.label) : undefined,
    })),
  };
}

async function fetchFlows(): Promise<FlowDefinition[]> {
  const res = await apiFetch("/api/v1/meta/flow");
  if (!res.ok) {
    throw new Error(`Failed to load flows (HTTP ${res.status})`);
  }
  const json = (await res.json()) as { items?: unknown };
  const items = Array.isArray(json?.items) ? (json.items as Record<string, unknown>[]) : [];
  return items.map(normalizeFlow).filter((f) => f.name.length > 0);
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

/**
 * Load all automation flow definitions exposed by the connected server.
 * Backed by react-query so the list and any detail view share one fetch.
 */
export function useFlows(): UseQueryResult<FlowDefinition[], Error> {
  return useQuery({
    queryKey: ["flows"],
    queryFn: fetchFlows,
    staleTime: 60_000,
  });
}

/**
 * Convenience selector for a single flow by name, reusing the cached list.
 */
export function useFlow(name: string | undefined): {
  flow: FlowDefinition | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const { data, isLoading, error } = useFlows();
  return {
    flow: name ? data?.find((f) => f.name === name) : undefined,
    isLoading,
    error: error ?? null,
  };
}
