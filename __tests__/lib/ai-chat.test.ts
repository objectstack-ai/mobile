import { parseAiSdkStream, sendAiChat } from "~/lib/ai-chat";

jest.mock("~/lib/objectstack", () => ({
  apiFetch: jest.fn(),
}));
import { apiFetch } from "~/lib/objectstack";
const mockApiFetch = apiFetch as jest.Mock;

/** A realistic AI-SDK UI message stream (captured from the 8.0 server). */
const STREAM = [
  `data: {"type":"start"}`,
  ``,
  `data: {"type":"start-step"}`,
  ``,
  `data: {"type":"text-start","id":"0"}`,
  ``,
  `data: {"type":"tool-input-available","toolCallId":"tc1","toolName":"query_data","input":{"request":"hi"}}`,
  ``,
  `data: {"type":"tool-output-available","toolCallId":"tc1","output":{"type":"text","value":"{}"}}`,
  ``,
  `data: {"type":"text-delta","id":"0","delta":"Here are "}`,
  ``,
  `data: {"type":"text-delta","id":"0","delta":"your results."}`,
  ``,
  `data: {"type":"text-end","id":"0"}`,
  ``,
  `data: {"type":"finish-step"}`,
  ``,
  `data: {"type":"finish","finishReason":"stop"}`,
  ``,
  `data: [DONE]`,
  ``,
].join("\n");

describe("parseAiSdkStream", () => {
  it("concatenates text-delta events into the assistant reply", () => {
    const parsed = parseAiSdkStream(STREAM);
    expect(parsed.text).toBe("Here are your results.");
    expect(parsed.toolCalls).toEqual(["query_data"]);
    expect(parsed.finishReason).toBe("stop");
    expect(parsed.error).toBeUndefined();
  });

  it("supports a single full `text` event", () => {
    const raw = `data: {"type":"text","text":"All done."}\ndata: [DONE]`;
    expect(parseAiSdkStream(raw).text).toBe("All done.");
  });

  it("captures an error event", () => {
    const raw = `data: {"type":"start"}\ndata: {"type":"error","errorText":"model unavailable"}`;
    const parsed = parseAiSdkStream(raw);
    expect(parsed.error).toBe("model unavailable");
  });

  it("collects multiple distinct tool calls", () => {
    const raw = [
      `data: {"type":"tool-input-available","toolName":"list_objects"}`,
      `data: {"type":"tool-input-available","toolName":"query_data"}`,
    ].join("\n");
    expect(parseAiSdkStream(raw).toolCalls).toEqual(["list_objects", "query_data"]);
  });

  it("is tolerant of malformed lines, blanks, and [DONE]", () => {
    const raw = [
      `: comment`,
      `data: not-json`,
      ``,
      `data: {"type":"text-delta","delta":"ok"}`,
      `data: [DONE]`,
    ].join("\n");
    const parsed = parseAiSdkStream(raw);
    expect(parsed.text).toBe("ok");
  });

  it("returns an empty result for empty input", () => {
    expect(parseAiSdkStream("")).toEqual({ text: "", toolCalls: [] });
  });
});

describe("sendAiChat", () => {
  afterEach(() => jest.clearAllMocks());

  it("POSTs the messages to /api/v1/ai/chat and returns the parsed reply", async () => {
    mockApiFetch.mockResolvedValue({ ok: true, status: 200, text: async () => STREAM });

    const result = await sendAiChat([{ role: "user", content: "hi" }]);

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/v1/ai/chat",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
      }),
    );
    expect(result.text).toBe("Here are your results.");
  });

  it("throws with the server error message on a non-OK response", async () => {
    mockApiFetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error: { message: "messages array is required" } }),
    });
    await expect(sendAiChat([])).rejects.toThrow("messages array is required");
  });

  it("throws a generic error when the error body isn't JSON", async () => {
    mockApiFetch.mockResolvedValue({ ok: false, status: 500, text: async () => "Internal Error" });
    await expect(sendAiChat([{ role: "user", content: "x" }])).rejects.toThrow("AI chat failed (500)");
  });
});
