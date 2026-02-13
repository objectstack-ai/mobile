import { useCallback, useState } from "react";
import { useClient } from "@objectstack/client-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface PredictiveModel {
  id: string;
  name: string;
  type: "classification" | "regression" | "timeseries" | "anomaly";
  status: "training" | "ready" | "failed" | "deprecated";
  accuracy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PredictionRequest {
  modelId: string;
  input: Record<string, unknown>;
}

export interface PredictionResult {
  id: string;
  modelId: string;
  prediction: unknown;
  confidence: number;
  explanations?: Array<{ feature: string; importance: number }>;
  createdAt: string;
}

export interface UsePredictiveResult {
  /** Available predictive models */
  models: PredictiveModel[];
  /** Latest prediction result */
  lastPrediction: PredictionResult | null;
  /** List available models */
  listModels: (object?: string) => Promise<PredictiveModel[]>;
  /** Run a prediction */
  predict: (request: PredictionRequest) => Promise<PredictionResult>;
  /** Train or retrain a model */
  trainModel: (modelId: string, config?: Record<string, unknown>) => Promise<PredictiveModel>;
  /** Whether an operation is in progress */
  isLoading: boolean;
  /** Last error */
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for predictive AI models — training, prediction, and management
 * via `client.ai.predictive.*`.
 *
 * Satisfies spec/ai: PredictiveModel, PredictionRequest, PredictionResult schemas.
 *
 * ```ts
 * const { models, predict, trainModel } = usePredictive();
 * const result = await predict({ modelId: "model-1", input: { revenue: 50000 } });
 * ```
 */
export function usePredictive(): UsePredictiveResult {
  const client = useClient();
  const [models, setModels] = useState<PredictiveModel[]>([]);
  const [lastPrediction, setLastPrediction] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const listModels = useCallback(
    async (object?: string): Promise<PredictiveModel[]> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (client as any).ai.predictive.list({ object });
        setModels(result);
        return result;
      } catch (err: unknown) {
        const e = err instanceof Error ? err : new Error("Failed to list predictive models");
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const predict = useCallback(
    async (request: PredictionRequest): Promise<PredictionResult> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (client as any).ai.predictive.predict(request);
        setLastPrediction(result);
        return result;
      } catch (err: unknown) {
        const e = err instanceof Error ? err : new Error("Failed to run prediction");
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const trainModel = useCallback(
    async (modelId: string, config?: Record<string, unknown>): Promise<PredictiveModel> => {
      setIsLoading(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (client as any).ai.predictive.train({ modelId, ...config });
        setModels((prev) =>
          prev.map((m) => (m.id === modelId ? result : m)),
        );
        return result;
      } catch (err: unknown) {
        const e = err instanceof Error ? err : new Error("Failed to train model");
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  return { models, lastPrediction, listModels, predict, trainModel, isLoading, error };
}
