/**
 * Tests for usePredictive – validates predictive model
 * listing, prediction, and training operations.
 */
import { renderHook, act } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockList = jest.fn();
const mockPredict = jest.fn();
const mockTrain = jest.fn();

const mockClient = {
  ai: { predictive: { list: mockList, predict: mockPredict, train: mockTrain } },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { usePredictive } from "~/hooks/usePredictive";

beforeEach(() => {
  mockList.mockReset();
  mockPredict.mockReset();
  mockTrain.mockReset();
});

describe("usePredictive", () => {
  it("lists available predictive models", async () => {
    const models = [
      { id: "model-1", name: "Churn Predictor", type: "classification", status: "ready", accuracy: 0.92, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
      { id: "model-2", name: "Revenue Forecast", type: "timeseries", status: "ready", accuracy: 0.87, createdAt: "2026-01-02T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z" },
    ];
    mockList.mockResolvedValue(models);

    const { result } = renderHook(() => usePredictive());

    let listed: unknown;
    await act(async () => {
      listed = await result.current.listModels("accounts");
    });

    expect(mockList).toHaveBeenCalledWith({ object: "accounts" });
    expect(listed).toEqual(models);
    expect(result.current.models).toEqual(models);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("runs a prediction", async () => {
    const prediction = {
      id: "pred-1",
      modelId: "model-1",
      prediction: { churn: true },
      confidence: 0.89,
      explanations: [{ feature: "usage_days", importance: 0.45 }],
      createdAt: "2026-01-01T00:00:00Z",
    };
    mockPredict.mockResolvedValue(prediction);

    const { result } = renderHook(() => usePredictive());

    let predicted: unknown;
    await act(async () => {
      predicted = await result.current.predict({ modelId: "model-1", input: { usage_days: 5 } });
    });

    expect(mockPredict).toHaveBeenCalledWith({ modelId: "model-1", input: { usage_days: 5 } });
    expect(predicted).toEqual(prediction);
    expect(result.current.lastPrediction).toEqual(prediction);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("trains a model", async () => {
    const model = {
      id: "model-1",
      name: "Churn Predictor",
      type: "classification",
      status: "training",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-03T00:00:00Z",
    };
    mockTrain.mockResolvedValue(model);
    mockList.mockResolvedValue([
      { id: "model-1", name: "Churn Predictor", type: "classification", status: "ready", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
    ]);

    const { result } = renderHook(() => usePredictive());

    // Pre-populate models
    await act(async () => {
      await result.current.listModels();
    });

    let trained: unknown;
    await act(async () => {
      trained = await result.current.trainModel("model-1", { epochs: 10 });
    });

    expect(mockTrain).toHaveBeenCalledWith({ modelId: "model-1", epochs: 10 });
    expect(trained).toEqual(model);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("handles prediction error", async () => {
    mockPredict.mockRejectedValue(new Error("Failed to run prediction"));

    const { result } = renderHook(() => usePredictive());

    await act(async () => {
      await expect(
        result.current.predict({ modelId: "bad", input: {} }),
      ).rejects.toThrow("Failed to run prediction");
    });

    expect(result.current.error?.message).toBe("Failed to run prediction");
  });

  it("handles train error", async () => {
    mockTrain.mockRejectedValue(new Error("Failed to train model"));

    const { result } = renderHook(() => usePredictive());

    await act(async () => {
      await expect(
        result.current.trainModel("model-1"),
      ).rejects.toThrow("Failed to train model");
    });

    expect(result.current.error?.message).toBe("Failed to train model");
  });
});
