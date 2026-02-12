import { useCallback, useState } from "react";
import { useClient } from "@objectstack/client-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface RAGSource {
  id: string;
  title: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface RAGResult {
  answer: string;
  sources: RAGSource[];
  confidence: number;
  pipelineId?: string;
}

export interface UseRAGResult {
  /** Query the RAG pipeline with a natural-language question */
  query: (
    question: string,
    options?: { pipelineId?: string; topK?: number; minScore?: number },
  ) => Promise<RAGResult>;
  /** Sources returned by the last query */
  sources: RAGSource[];
  /** Whether a RAG operation is in progress */
  isLoading: boolean;
  /** Last error */
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for Retrieval-Augmented Generation via `client.ai.rag.*`.
 *
 * Satisfies spec/ai: RAGPipelineSchema – submit a question and receive
 * an answer grounded in retrieved source documents.
 *
 * ```ts
 * const { query, sources, isLoading } = useRAG();
 * const result = await query("What are our Q4 targets?", { topK: 5 });
 * ```
 */
export function useRAG(): UseRAGResult {
  const client = useClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [sources, setSources] = useState<RAGSource[]>([]);

  const query = useCallback(
    async (
      question: string,
      options?: { pipelineId?: string; topK?: number; minScore?: number },
    ): Promise<RAGResult> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (client as any).ai.rag.query({
          question,
          ...options,
        });
        setSources(result.sources ?? []);
        return result;
      } catch (err: unknown) {
        const ragError =
          err instanceof Error ? err : new Error("RAG query failed");
        setError(ragError);
        throw ragError;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  return { query, sources, isLoading, error };
}
