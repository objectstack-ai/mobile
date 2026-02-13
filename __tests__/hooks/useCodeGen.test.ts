/**
 * Tests for useCodeGen – validates AI code generation
 * and code review operations.
 */
import { renderHook, act } from "@testing-library/react-native";

/* ---- Mock useClient from SDK ---- */
const mockGenerate = jest.fn();
const mockReview = jest.fn();

const mockClient = {
  ai: { codegen: { generate: mockGenerate, review: mockReview } },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useCodeGen } from "~/hooks/useCodeGen";

beforeEach(() => {
  mockGenerate.mockReset();
  mockReview.mockReset();
});

describe("useCodeGen", () => {
  it("generates code from prompt", async () => {
    const generated = {
      id: "gen-1",
      target: "plugin",
      files: [{ path: "src/plugin.ts", content: "export default {}", language: "typescript" }],
      explanation: "Created a basic plugin",
      createdAt: "2026-01-01T00:00:00Z",
    };
    mockGenerate.mockResolvedValue(generated);

    const { result } = renderHook(() => useCodeGen());

    let code: unknown;
    await act(async () => {
      code = await result.current.generate({ target: "plugin", prompt: "Create a logger plugin" });
    });

    expect(mockGenerate).toHaveBeenCalledWith({ target: "plugin", prompt: "Create a logger plugin" });
    expect(code).toEqual(generated);
    expect(result.current.generations).toContainEqual(generated);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("reviews code and returns issues", async () => {
    const reviewResult = {
      id: "rev-1",
      issues: [{ severity: "warning", line: 5, message: "Unused variable", suggestion: "Remove x" }],
      score: 85,
      summary: "Good quality with minor issues",
    };
    mockReview.mockResolvedValue(reviewResult);

    const { result } = renderHook(() => useCodeGen());

    let reviewed: unknown;
    await act(async () => {
      reviewed = await result.current.reviewCode("const x = 1;", "typescript");
    });

    expect(mockReview).toHaveBeenCalledWith({ code: "const x = 1;", language: "typescript" });
    expect(reviewed).toEqual(reviewResult);
    expect(result.current.review).toEqual(reviewResult);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("accumulates multiple generations", async () => {
    const gen1 = { id: "gen-1", target: "plugin", files: [], explanation: "Gen 1", createdAt: "2026-01-01T00:00:00Z" };
    const gen2 = { id: "gen-2", target: "component", files: [], explanation: "Gen 2", createdAt: "2026-01-02T00:00:00Z" };
    mockGenerate.mockResolvedValueOnce(gen1).mockResolvedValueOnce(gen2);

    const { result } = renderHook(() => useCodeGen());

    await act(async () => {
      await result.current.generate({ target: "plugin", prompt: "p1" });
    });
    await act(async () => {
      await result.current.generate({ target: "component", prompt: "p2" });
    });

    expect(result.current.generations).toHaveLength(2);
  });

  it("handles generate error", async () => {
    mockGenerate.mockRejectedValue(new Error("Failed to generate code"));

    const { result } = renderHook(() => useCodeGen());

    await act(async () => {
      await expect(
        result.current.generate({ target: "plugin", prompt: "bad" }),
      ).rejects.toThrow("Failed to generate code");
    });

    expect(result.current.error?.message).toBe("Failed to generate code");
  });

  it("handles review error", async () => {
    mockReview.mockRejectedValue(new Error("Failed to review code"));

    const { result } = renderHook(() => useCodeGen());

    await act(async () => {
      await expect(
        result.current.reviewCode("code", "ts"),
      ).rejects.toThrow("Failed to review code");
    });

    expect(result.current.error?.message).toBe("Failed to review code");
  });
});
