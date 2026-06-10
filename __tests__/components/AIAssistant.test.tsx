import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AIAssistantScreen from "~/app/ai";

jest.mock("~/hooks/useAIChat");
import { useAIChat } from "~/hooks/useAIChat";
const mockUseAIChat = useAIChat as jest.Mock;

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
    send: jest.fn().mockResolvedValue(undefined),
    retry: jest.fn(),
    clear: jest.fn(),
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

  it("renders the conversation and tool activity", () => {
    mockChat({
      messages: [
        { role: "user", content: "how many?" },
        { role: "assistant", content: "There are 5.", toolCalls: ["query_data"] },
      ],
    });
    const { getByText } = renderScreen();
    expect(getByText("how many?")).toBeTruthy();
    expect(getByText("There are 5.")).toBeTruthy();
    expect(getByText("Ran query_data")).toBeTruthy();
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
});
