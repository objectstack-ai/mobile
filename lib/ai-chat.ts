/**
 * Conversational AI chat against the ObjectStack 8.0 `/api/v1/ai/chat`
 * endpoint.
 *
 * Unlike the object-scoped `client.ai.nlq` primitive (which this 8.0 server
 * does not expose — it 404s), `/ai/chat` is a tool-using agent: you POST the
 * full `{ messages }` conversation and it streams back an AI-SDK "UI message
 * stream" (Server-Sent-Events), running tools like `list_objects` / `query_data`
 * to answer over the user's data. It is object-agnostic — the agent discovers
 * objects itself — so no object context is sent.
 *
 * React Native's `fetch` buffers the response body rather than exposing a
 * readable stream, so we read the whole SSE payload with `.text()` once the
 * stream closes and parse it here. (Token-by-token streaming would need
 * `expo/fetch`; that's a future enhancement — the parser already supports
 * incremental accumulation.)
 */

import { apiFetch } from "~/lib/objectstack";

/** A single conversation turn, as sent to `/ai/chat`. */
export interface AiChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** The result of parsing an AI-SDK UI message stream. */
export interface ParsedAiStream {
  /** Concatenated assistant text (from `text-delta` / `text` events). */
  text: string;
  /** Names of tools the agent invoked (for optional "thinking" UI). */
  toolCalls: string[];
  /** Error text from an `error` event, if the run failed. */
  error?: string;
  /** The model's finish reason (`stop`, `length`, …), if present. */
  finishReason?: string;
}

/* ------------------------------------------------------------------ */
/*  SSE parser (pure)                                                  */
/* ------------------------------------------------------------------ */

/**
 * Parse an AI-SDK UI message stream into the visible assistant text plus the
 * tool/error/finish metadata. Accepts the full buffered SSE payload (lines of
 * `data: {json}`, blank-line separated, terminated by `data: [DONE]`).
 *
 * Tolerant by design: unknown event types and unparseable lines are skipped,
 * so a protocol addition never throws.
 */
export function parseAiSdkStream(raw: string): ParsedAiStream {
  const result: ParsedAiStream = { text: "", toolCalls: [] };
  if (!raw) return result;

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const payload = trimmed.slice("data:".length).trim();
    if (payload === "" || payload === "[DONE]") continue;

    let event: Record<string, unknown>;
    try {
      event = JSON.parse(payload);
    } catch {
      continue; // skip malformed event lines
    }

    switch (event.type) {
      case "text-delta":
        if (typeof event.delta === "string") result.text += event.delta;
        break;
      case "text":
        // Some servers emit a single full-text event instead of deltas.
        if (typeof event.text === "string") result.text += event.text;
        break;
      case "tool-input-available":
        if (typeof event.toolName === "string") result.toolCalls.push(event.toolName);
        break;
      case "error":
        result.error =
          (typeof event.errorText === "string" && event.errorText) ||
          (typeof event.error === "string" && event.error) ||
          "The assistant encountered an error.";
        break;
      case "finish":
        if (typeof event.finishReason === "string") result.finishReason = event.finishReason;
        break;
      default:
        break; // start, start-step, text-start/-end, tool-output-available, finish-step, …
    }
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  Request                                                            */
/* ------------------------------------------------------------------ */

export interface SendAiChatOptions {
  signal?: AbortSignal;
}

/**
 * Send the conversation to `/api/v1/ai/chat` and return the parsed assistant
 * reply. Throws on a non-OK HTTP response.
 */
export async function sendAiChat(
  messages: AiChatMessage[],
  options: SendAiChatOptions = {},
): Promise<ParsedAiStream> {
  const res = await apiFetch("/api/v1/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    ...(options.signal ? { signal: options.signal } : {}),
  });

  const raw = await res.text();

  if (!res.ok) {
    // The server may return a JSON error body rather than an SSE stream.
    let message = `AI chat failed (${res.status})`;
    try {
      const body = JSON.parse(raw);
      message = body?.error?.message ?? body?.error ?? body?.message ?? message;
    } catch {
      /* keep default */
    }
    throw new Error(typeof message === "string" ? message : `AI chat failed (${res.status})`);
  }

  return parseAiSdkStream(raw);
}
