/**
 * Tests for useServerTranslations – validates server-side i18n
 * integration via client.i18n.*.
 */
import { renderHook, act, waitFor } from "@testing-library/react-native";

/* ---- Mock i18n ---- */
jest.mock("~/lib/i18n", () => ({
  __esModule: true,
  default: {
    addResourceBundle: jest.fn(),
    language: "en",
  },
}));

/* ---- Mock useClient from SDK ---- */
const mockGetLocales = jest.fn();
const mockGetTranslations = jest.fn();
const mockGetFieldLabels = jest.fn();

const mockClient = {
  i18n: {
    getLocales: mockGetLocales,
    getTranslations: mockGetTranslations,
    getFieldLabels: mockGetFieldLabels,
  },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

import { useServerTranslations } from "~/hooks/useServerTranslations";

beforeEach(() => {
  mockGetLocales.mockReset();
  mockGetTranslations.mockReset();
  mockGetFieldLabels.mockReset();
});

describe("useServerTranslations", () => {
  it("fetches available locales on mount", async () => {
    mockGetLocales.mockResolvedValue({
      locales: [
        { code: "en", label: "English", isDefault: true },
        { code: "zh", label: "中文" },
        { code: "ar", label: "العربية" },
      ],
    });

    const { result } = renderHook(() => useServerTranslations());

    await waitFor(() => {
      expect(result.current.isLoadingLocales).toBe(false);
    });

    expect(result.current.locales).toHaveLength(3);
    expect(result.current.locales[0]).toEqual({
      code: "en",
      label: "English",
      isDefault: true,
    });
    expect(result.current.error).toBeNull();
  });

  it("handles locale fetch error", async () => {
    mockGetLocales.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useServerTranslations());

    await waitFor(() => {
      expect(result.current.isLoadingLocales).toBe(false);
    });

    expect(result.current.locales).toHaveLength(0);
    expect(result.current.error?.message).toBe("Network error");
  });

  it("fetches translations and merges into i18next", async () => {
    mockGetLocales.mockResolvedValue({ locales: [] });
    mockGetTranslations.mockResolvedValue({
      locale: "zh",
      translations: {
        objects: {
          tasks: { label: "任务", pluralLabel: "任务列表" },
        },
        apps: {
          crm: { label: "客户管理", description: "CRM应用" },
        },
        messages: {
          "save.success": "保存成功",
          "delete.confirm": "确认删除？",
        },
      },
    });

    const { result } = renderHook(() => useServerTranslations());

    await waitFor(() => {
      expect(result.current.isLoadingLocales).toBe(false);
    });

    await act(async () => {
      await result.current.fetchTranslations("zh");
    });

    expect(mockGetTranslations).toHaveBeenCalledWith("zh", {});
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("fetches translations with namespace", async () => {
    mockGetLocales.mockResolvedValue({ locales: [] });
    mockGetTranslations.mockResolvedValue({
      locale: "en",
      translations: { messages: { hello: "Hello" } },
    });

    const { result } = renderHook(() => useServerTranslations());

    await waitFor(() => {
      expect(result.current.isLoadingLocales).toBe(false);
    });

    await act(async () => {
      await result.current.fetchTranslations("en", "objects");
    });

    expect(mockGetTranslations).toHaveBeenCalledWith("en", {
      namespace: "objects",
    });
  });

  it("handles translation fetch error", async () => {
    mockGetLocales.mockResolvedValue({ locales: [] });
    mockGetTranslations.mockRejectedValue(new Error("Translation service down"));

    const { result } = renderHook(() => useServerTranslations());

    await waitFor(() => {
      expect(result.current.isLoadingLocales).toBe(false);
    });

    let response: any;
    await act(async () => {
      response = await result.current.fetchTranslations("zh");
    });

    expect(response).toBeNull();
    expect(result.current.error?.message).toBe("Translation service down");
  });

  it("fetches field labels for an object", async () => {
    mockGetLocales.mockResolvedValue({ locales: [] });
    mockGetFieldLabels.mockResolvedValue({
      object: "tasks",
      locale: "zh",
      labels: {
        name: { label: "名称", help: "任务名称" },
        status: {
          label: "状态",
          options: { open: "打开", closed: "关闭" },
        },
      },
    });

    const { result } = renderHook(() => useServerTranslations());

    await waitFor(() => {
      expect(result.current.isLoadingLocales).toBe(false);
    });

    let labels: Record<string, any>;
    await act(async () => {
      labels = await result.current.fetchFieldLabels("tasks", "zh");
    });

    expect(mockGetFieldLabels).toHaveBeenCalledWith("tasks", "zh");
    expect(labels!).toEqual({
      name: { label: "名称", help: "任务名称" },
      status: {
        label: "状态",
        options: { open: "打开", closed: "关闭" },
      },
    });
  });

  it("handles field labels fetch error gracefully", async () => {
    mockGetLocales.mockResolvedValue({ locales: [] });
    mockGetFieldLabels.mockRejectedValue(new Error("Not found"));

    const { result } = renderHook(() => useServerTranslations());

    await waitFor(() => {
      expect(result.current.isLoadingLocales).toBe(false);
    });

    let labels: Record<string, any>;
    await act(async () => {
      labels = await result.current.fetchFieldLabels("unknown", "en");
    });

    expect(labels!).toEqual({});
    expect(result.current.error?.message).toBe("Not found");
  });
});
