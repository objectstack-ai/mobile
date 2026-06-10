import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AIAssistantScreen from "~/app/ai";

jest.mock("~/hooks/useAIChat");
import { useAIChat } from "~/hooks/useAIChat";
const mockUseAIChat = useAIChat as jest.Mock;

// Resolve `t(key)` against the real English bundle so the screen renders its
// actual copy (the assertions below match the English strings) without spinning
// up the full i18n runtime that `_layout` initializes.
jest.mock("react-i18next", () => {
  const en = jest.requireActual("~/locales/en.json") as Record<string, unknown>;
  const lookup = (key: string): unknown =>
    key.split(".").reduce<unknown>(
      (o, k) => (o as Record<string, unknown> | undefined)?.[k],
      en,
    );
  return {
    useTranslation: () => ({
      t: (key: string, opts?: Record<string, unknown>) => {
        const value = lookup(key);
        if (opts?.returnObjects) return Array.isArray(value) ? value : [];
        if (typeof value !== "string") return key;
        return opts
          ? value.replace(/\{\{(\w+)\}\}/g, (_m, name) => String(opts[name] ?? ""))
          : value;
      },
    }),
  };
});

const mockSetString = jest.fn().mockResolvedValue(undefined);
jest.mock("expo-clipboard", () => ({
  setStringAsync: (...args: unknown[]) => mockSetString(...args),
}));

const SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function mockChat(overrides: Partial<ReturnType<typeof useAIChat>> = {}) {
  const base = {
    messages: [],
    isLoading: false,
    error: null,
    serverBacked: false,
    conversationId: null,
    conversations: [],
    init: jest.fn().mockResolvedValue(undefined),
    send: jest.fn().mockResolvedValue(undefined),
    retry: jest.fn(),
    stop: jest.fn(),
    clear: jest.fn(),
    newConversation: jest.fn().mockResolvedValue(undefined),
    loadConversation: jest.fn().mockResolvedValue(undefined),
    removeConversation: jest.fn().mockResolvedValue(undefined),
    renameConversation: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  mockUseAIChat.mockReturnValue(base);
  return base;
}

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
      <AIAssistantScreen />
    </SafeAreaProvider>,
  );
}

beforeEach(() => mockChat());
afterEach(() => jest.clearAllMocks());

describe("AIAssistantScreen", () => {
  it("shows the empty state with example prompts", () => {
    const { getByText } = renderScreen();
    expect(getByText("Ask the assistant")).toBeTruthy();
    expect(getByText("What objects can I ask about?")).toBeTruthy();
  });

  it("sends a typed message", () => {
    const chat = mockChat();
    const { getByLabelText } = renderScreen();
    fireEvent.changeText(getByLabelText("Message"), "how many orders?");
    fireEvent.press(getByLabelText("Send"));
    expect(chat.send).toHaveBeenCalledWith("how many orders?");
  });

  it("does not send an empty / whitespace message", () => {
    const chat = mockChat();
    const { getByLabelText } = renderScreen();
    fireEvent.changeText(getByLabelText("Message"), "   ");
    fireEvent.press(getByLabelText("Send"));
    expect(chat.send).not.toHaveBeenCalled();
  });

  it("sends an example prompt on tap", () => {
    const chat = mockChat();
    const { getByText } = renderScreen();
    fireEvent.press(getByText("Show me the most recent records"));
    expect(chat.send).toHaveBeenCalledWith("Show me the most recent records");
  });

  it("renders the conversation and structured tool activity", () => {
    mockChat({
      messages: [
        { role: "user", content: "how many?" },
        {
          role: "assistant",
          content: "There are 5.",
          tools: [{ id: "t1", name: "query_data", input: { q: "count" }, output: "5", state: "done" }],
        },
      ],
    });
    const { getByText, getByLabelText } = renderScreen();
    expect(getByText("how many?")).toBeTruthy();
    expect(getByText("There are 5.")).toBeTruthy();
    // The tool row shows the humanized tool name; expanding reveals input/result.
    expect(getByText("Query Data")).toBeTruthy();
    fireEvent.press(getByLabelText("Tool query_data, done"));
    expect(getByText("Result")).toBeTruthy();
  });

  it("shows the thinking indicator for an empty (streaming) assistant turn", () => {
    mockChat({
      messages: [
        { role: "user", content: "how many?" },
        { role: "assistant", content: "" },
      ],
      isLoading: true,
    });
    const { getByText } = renderScreen();
    expect(getByText("Thinking…")).toBeTruthy();
  });

  it("shows a Stop button while generating and calls stop()", () => {
    const chat = mockChat({ isLoading: true, messages: [{ role: "user", content: "x" }] });
    const { getByLabelText, queryByLabelText } = renderScreen();
    expect(queryByLabelText("Send")).toBeNull();
    fireEvent.press(getByLabelText("Stop generating"));
    expect(chat.stop).toHaveBeenCalled();
  });

  it("clears the conversation from the header action", () => {
    const chat = mockChat({ messages: [{ role: "user", content: "hi" }] });
    const { getByLabelText } = renderScreen();
    fireEvent.press(getByLabelText("Clear conversation"));
    expect(chat.clear).toHaveBeenCalled();
  });

  it("surfaces an error message with a retry action", () => {
    const chat = mockChat({ error: new Error("model unavailable") });
    const { getByText, getByLabelText } = renderScreen();
    expect(getByText("model unavailable")).toBeTruthy();
    fireEvent.press(getByLabelText("Retry"));
    expect(chat.retry).toHaveBeenCalled();
  });

  it("copies an assistant message to the clipboard", () => {
    mockChat({
      messages: [
        { role: "user", content: "hi" },
        { role: "assistant", content: "**Hello** there" },
      ],
    });
    const { getByLabelText } = renderScreen();
    fireEvent.press(getByLabelText("Copy message"));
    expect(mockSetString).toHaveBeenCalledWith("**Hello** there");
  });

  it("calls init() on mount", () => {
    const chat = mockChat();
    renderScreen();
    expect(chat.init).toHaveBeenCalled();
  });

  describe("server-backed mode (conversation history)", () => {
    it("shows New chat + history actions instead of Clear", () => {
      const chat = mockChat({ serverBacked: true, messages: [{ role: "user", content: "hi" }] });
      const { getByLabelText, queryByLabelText } = renderScreen();
      expect(queryByLabelText("Clear conversation")).toBeNull();
      fireEvent.press(getByLabelText("New chat"));
      expect(chat.newConversation).toHaveBeenCalled();
    });

    it("loads a conversation from the drawer", () => {
      const chat = mockChat({
        serverBacked: true,
        conversations: [
          { id: "c1", title: "First chat" },
          { id: "c2", title: "Second chat" },
        ],
      });
      const { getByLabelText, getByText } = renderScreen();
      fireEvent.press(getByLabelText("Conversation history"));
      fireEvent.press(getByText("First chat"));
      expect(chat.loadConversation).toHaveBeenCalledWith("c1");
    });

    it("deletes a conversation from the drawer", () => {
      const chat = mockChat({
        serverBacked: true,
        conversations: [{ id: "c1", title: "First chat" }],
      });
      const { getByLabelText } = renderScreen();
      fireEvent.press(getByLabelText("Conversation history"));
      fireEvent.press(getByLabelText("Delete conversation"));
      expect(chat.removeConversation).toHaveBeenCalledWith("c1");
    });

    it("renames a conversation via the dialog", () => {
      const chat = mockChat({
        serverBacked: true,
        conversations: [{ id: "c1", title: "Old name" }],
      });
      const { getByLabelText, getByRole } = renderScreen();
      fireEvent.press(getByLabelText("Conversation history"));
      fireEvent.press(getByLabelText("Rename conversation"));
      // The dialog opens prefilled with the current title.
      const input = getByLabelText("Conversation title");
      fireEvent.changeText(input, "New name");
      fireEvent.press(getByRole("button", { name: "Save" }));
      expect(chat.renameConversation).toHaveBeenCalledWith("c1", "New name");
    });
  });

  it("renders a reasoning block when the message has reasoning", () => {
    mockChat({
      messages: [
        { role: "user", content: "why?" },
        { role: "assistant", content: "Because.", reasoning: "Considered the trade-offs." },
      ],
    });
    const { getByText, getByLabelText } = renderScreen();
    expect(getByText("Reasoning")).toBeTruthy();
    fireEvent.press(getByLabelText("Reasoning"));
    expect(getByText("Considered the trade-offs.")).toBeTruthy();
  });
});
