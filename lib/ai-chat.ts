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

import { fetch as expoFetch } from "expo/fetch";
import { apiFetch, buildAuthInit, resolveApiUrl } from "~/lib/objectstack";

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
/** Apply one parsed SSE event to the running accumulator. */
function applyEvent(event: Record<string, unknown>, acc: ParsedAiStream): void {
  switch (event.type) {
    case "text-delta":
      if (typeof event.delta === "string") acc.text += event.delta;
      break;
    case "text":
      // Some servers emit a single full-text event instead of deltas.
      if (typeof event.text === "string") acc.text += event.text;
      break;
    case "tool-input-available":
      if (typeof event.toolName === "string") acc.toolCalls.push(event.toolName);
      break;
    case "error":
      acc.error =
        (typeof event.errorText === "string" && event.errorText) ||
        (typeof event.error === "string" && event.error) ||
        "The assistant encountered an error.";
      break;
    case "finish":
      if (typeof event.finishReason === "string") acc.finishReason = event.finishReason;
      break;
    default:
      break; // start, start-step, text-start/-end, tool-output-available, finish-step, …
  }
}

/** Parse a single `data: {json}` SSE line; returns the event or null. */
function parseEventLine(line: string): Record<string, unknown> | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;
  const payload = trimmed.slice("data:".length).trim();
  if (payload === "" || payload === "[DONE]") return null;
  try {
    return JSON.parse(payload);
  } catch {
    return null; // skip malformed event lines
  }
}

export function parseAiSdkStream(raw: string): ParsedAiStream {
  const result: ParsedAiStream = { text: "", toolCalls: [] };
  if (!raw) return result;
  for (const line of raw.split("\n")) {
    const event = parseEventLine(line);
    if (event) applyEvent(event, result);
  }
  return result;
}

/* ------------------------------------------------------------------ */
/*  Request                                                            */
/* ------------------------------------------------------------------ */

export interface SendAiChatOptions {
  signal?: AbortSignal;
  /** Bind the turn to a server conversation (for server-side persistence). */
  conversationId?: string;
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
    body: JSON.stringify({
      messages,
      ...(options.conversationId ? { conversationId: options.conversationId } : {}),
    }),
    ...(options.signal ? { signal: options.signal } : {}),
  });

  const raw = await res.text();

  if (!res.ok) {
    throw new Error(errorMessageFromBody(raw, res.status));
  }

  return parseAiSdkStream(raw);
}

function errorMessageFromBody(raw: string, status: number): string {
  // The server may return a JSON error body rather than an SSE stream.
  try {
    const body = JSON.parse(raw);
    const message = body?.error?.message ?? body?.error ?? body?.message;
    if (typeof message === "string") return message;
  } catch {
    /* fall through */
  }
  return `AI chat failed (${status})`;
}

/* ------------------------------------------------------------------ */
/*  Streaming request                                                  */
/* ------------------------------------------------------------------ */

export interface StreamAiChatOptions {
  signal?: AbortSignal;
  /** Called as text accumulates, with the full reply so far + tools seen. */
  onUpdate?: (text: string, toolCalls: string[]) => void;
  /** Bind the turn to a server conversation (for server-side persistence). */
  conversationId?: string;
}

/**
 * Stream the conversation from `/api/v1/ai/chat`, invoking `onUpdate` as text
 * arrives so the UI can render the reply token-by-token. Uses `expo/fetch`
 * (whose response body is a real readable stream on native; on web it maps to
 * the standard streaming fetch). Falls back to the buffered {@link sendAiChat}
 * if streaming is unavailable (no body, no `TextDecoder`, or an early error),
 * so a turn never fails just because streaming couldn't start.
 */
export async function streamAiChat(
  messages: AiChatMessage[],
  options: StreamAiChatOptions = {},
): Promise<ParsedAiStream> {
  const { signal, onUpdate, conversationId } = options;

  let res: Awaited<ReturnType<typeof expoFetch>>;
  try {
    res = await expoFetch(resolveApiUrl("/api/v1/ai/chat"), {
      ...buildAuthInit({
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ messages, ...(conversationId ? { conversationId } : {}) }),
      }),
      ...(signal ? { signal } : {}),
    } as Parameters<typeof expoFetch>[1]);
  } catch {
    return sendAiChat(messages, { ...(signal ? { signal } : {}), ...(conversationId ? { conversationId } : {}) });
  }

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    throw new Error(errorMessageFromBody(raw, res.status));
  }

  const body = (res as unknown as { body?: ReadableStream<Uint8Array> }).body;
  if (!body || typeof TextDecoder === "undefined") {
    // Streaming not supported in this runtime — read it whole.
    const raw = await res.text();
    const parsed = parseAiSdkStream(raw);
    onUpdate?.(parsed.text, parsed.toolCalls);
    return parsed;
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  const acc: ParsedAiStream = { text: "", toolCalls: [] };
  let buffer = "";

  const drainLine = (line: string) => {
    const event = parseEventLine(line);
    if (!event) return;
    const before = acc.text;
    const toolsBefore = acc.toolCalls.length;
    applyEvent(event, acc);
    if (acc.text !== before || acc.toolCalls.length !== toolsBefore) {
      onUpdate?.(acc.text, acc.toolCalls);
    }
  };

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        drainLine(buffer.slice(0, nl));
        buffer = buffer.slice(nl + 1);
      }
    }
    if (buffer.trim() !== "") drainLine(buffer);
  } catch (err) {
    // A user-initiated stop (AbortController) keeps whatever streamed so far;
    // any other read error after partial text also degrades to the partial.
    if (!signal?.aborted) {
      void reader.cancel().catch(() => {});
      if (acc.text === "") throw err;
    }
  }

  return acc;
}
