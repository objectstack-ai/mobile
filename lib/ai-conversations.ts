/**
 * Server-backed AI conversation persistence (ObjectStack AI service).
 *
 * Mirrors the web (`objectui`) model: conversations + messages are stored on
 * the server under the signed-in user, via `/api/v1/ai/conversations`. This
 * gives cross-device, multi-conversation history (vs. the local MMKV cache,
 * which only survives restart on one device).
 *
 *   GET    /api/v1/ai/conversations            list (summaries)
 *   POST   /api/v1/ai/conversations            create  → { id, title, messages }
 *   GET    /api/v1/ai/conversations/:id        load with full message history
 *   DELETE /api/v1/ai/conversations/:id        delete
 *   POST   /api/v1/ai/conversations/:id/messages   append a message
 *
 * Not every server build exposes these (published service-ai 8.0.1 does not),
 * so {@link conversationsAvailable} probes once and callers fall back to the
 * local cache when absent.
 */

import { apiFetch } from "~/lib/objectstack";

const BASE = "/api/v1/ai/conversations";

export interface ConversationSummary {
  id: string;
  title?: string;
  updatedAt?: string;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ServerConversation {
  id: string;
  title?: string | null;
  messages: ConversationMessage[];
  updatedAt?: string;
}

/* ------------------------------------------------------------------ */
/*  Availability probe (cached)                                        */
/* ------------------------------------------------------------------ */

let availabilityProbe: Promise<boolean> | undefined;

/**
 * Whether the connected server exposes the conversation API. Probes
 * `GET /conversations` once and caches the result for the session. A 404
 * (route absent) → false; a network error → false (degrade to local cache).
 */
export function conversationsAvailable(): Promise<boolean> {
  if (!availabilityProbe) {
    availabilityProbe = apiFetch(BASE, { method: "GET" })
      .then((res) => res.status !== 404 && res.status !== 501)
      .catch(() => false);
  }
  return availabilityProbe;
}

/** Reset the cached probe (e.g. after the server URL changes). */
export function resetConversationsAvailability(): void {
  availabilityProbe = undefined;
}

/* ------------------------------------------------------------------ */
/*  CRUD                                                               */
/* ------------------------------------------------------------------ */

function normalizeMessages(raw: unknown): ConversationMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: ConversationMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") continue;
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    if ((role === "user" || role === "assistant") && content != null) {
      out.push({ role, content: typeof content === "string" ? content : JSON.stringify(content) });
    }
  }
  return out;
}

function normalizeConversation(raw: Record<string, unknown>): ServerConversation {
  return {
    id: String(raw.id),
    title: (raw.title as string | null | undefined) ?? null,
    messages: normalizeMessages(raw.messages),
    updatedAt: raw.updatedAt as string | undefined,
  };
}

export async function listConversations(limit = 50): Promise<ConversationSummary[]> {
  const res = await apiFetch(`${BASE}?limit=${encodeURIComponent(String(limit))}`, { method: "GET" });
  if (!res.ok) return [];
  const body = (await res.json().catch(() => ({}))) as { conversations?: unknown };
  const list = Array.isArray(body.conversations) ? body.conversations : [];
  return list
    .filter((c): c is Record<string, unknown> => Boolean(c) && typeof c === "object")
    .map((c) => ({
      id: String(c.id),
      title: typeof c.title === "string" && c.title.trim() !== "" ? c.title : undefined,
      updatedAt: c.updatedAt as string | undefined,
    }));
}

export async function createConversation(title?: string): Promise<ServerConversation> {
  const res = await apiFetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(title ? { title } : {}),
  });
  if (!res.ok) throw new Error(`Failed to create conversation (${res.status})`);
  return normalizeConversation((await res.json()) as Record<string, unknown>);
}

/** Load a conversation with its messages; `null` if it's gone (404/403). */
export async function getConversation(id: string): Promise<ServerConversation | null> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: "GET" });
  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok) throw new Error(`Failed to load conversation (${res.status})`);
  return normalizeConversation((await res.json()) as Record<string, unknown>);
}

export async function deleteConversation(id: string): Promise<void> {
  await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
}

export async function addMessage(id: string, message: ConversationMessage): Promise<void> {
  await apiFetch(`${BASE}/${encodeURIComponent(id)}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });
}
