import { useCallback, useState } from "react";
import { useClient } from "@objectstack/client-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface CodeGenRequest {
  target: "plugin" | "component" | "api" | "migration" | "test";
  prompt: string;
  context?: Record<string, unknown>;
  language?: string;
}

export interface GeneratedCode {
  id: string;
  target: string;
  files: Array<{ path: string; content: string; language: string }>;
  explanation: string;
  createdAt: string;
}

export interface CodeReviewResult {
  id: string;
  issues: Array<{ severity: "error" | "warning" | "info"; line: number; message: string; suggestion?: string }>;
  score: number;
  summary: string;
}

export interface UseCodeGenResult {
  /** Generated code results */
  generations: GeneratedCode[];
  /** Latest code review */
  review: CodeReviewResult | null;
  /** Generate code from prompt */
  generate: (request: CodeGenRequest) => Promise<GeneratedCode>;
  /** Review existing code */
  reviewCode: (code: string, language: string) => Promise<CodeReviewResult>;
  /** Whether an operation is in progress */
  isLoading: boolean;
  /** Last error */
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for AI-powered code generation and review
 * via `client.ai.codegen.*`.
 *
 * Satisfies spec/ai: CodeGenerationConfig, GeneratedCode, AICodeReviewResult schemas.
 *
 * ```ts
 * const { generate, reviewCode, isLoading } = useCodeGen();
 * const result = await generate({ target: "plugin", prompt: "Create a logger plugin" });
 * ```
 */
export function useCodeGen(): UseCodeGenResult {
  const client = useClient();
  const [generations, setGenerations] = useState<GeneratedCode[]>([]);
  const [review, setReview] = useState<CodeReviewResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generate = useCallback(
    async (request: CodeGenRequest): Promise<GeneratedCode> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (client as any).ai.codegen.generate(request);
        setGenerations((prev) => [result, ...prev]);
        return result;
      } catch (err: unknown) {
        const e = err instanceof Error ? err : new Error("Failed to generate code");
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const reviewCode = useCallback(
    async (code: string, language: string): Promise<CodeReviewResult> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (client as any).ai.codegen.review({ code, language });
        setReview(result);
        return result;
      } catch (err: unknown) {
        const e = err instanceof Error ? err : new Error("Failed to review code");
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  return { generations, review, generate, reviewCode, isLoading, error };
}
