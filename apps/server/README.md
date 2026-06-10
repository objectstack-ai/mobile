# Server

The ObjectStack dev server for the mobile app (`@objectstack/runtime` + service
plugins). Defined in [`objectstack.config.ts`](./objectstack.config.ts).

## Run

```bash
pnpm dev      # objectstack dev  --port 3100  (watch mode)
pnpm start    # objectstack serve --port 3100  (production mode)
pnpm validate # validate the stack against the ObjectStack protocol
```

API: `http://localhost:3100/` · Console: `http://localhost:3100/_console/`

## Enabling the AI Assistant (real answers)

The mobile **AI Assistant** (`app/ai.tsx`) talks to `POST /api/v1/ai/chat`, a
tool-using agent served by `@objectstack/service-ai`. By **default the server
uses an in-memory LLM stub** (`MemoryLLMAdapter`) that cannot answer free-form
questions — it returns a "wire a real LLM adapter" notice.

To get real answers, point the service at an LLM via the
[Vercel AI Gateway](https://vercel.com/docs/ai-gateway). **Both** env vars are
required (the gateway adapter is skipped if the model is unset):

| Env var | Required | Example |
|---------|----------|---------|
| `AI_GATEWAY_API_KEY` | yes | `vck_…` (your gateway key — never commit it) |
| `AI_GATEWAY_MODEL`   | yes | `openai/gpt-4o-mini` |

```bash
AI_GATEWAY_API_KEY=vck_xxx AI_GATEWAY_MODEL=openai/gpt-4o-mini pnpm start
```

Keep the key out of version control — pass it via the shell, a gitignored
`.env*.local`, or your secrets manager.

> Note: the agent's data tools (`query_records`, `aggregate_data`, …) require an
> authenticated session. The mobile app sends the better-auth session through
> `apiFetch` automatically; an anonymous `curl` to `/ai/chat` will get
> conversational answers but be denied record access.
