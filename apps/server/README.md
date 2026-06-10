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

Use **`pnpm dev`** for local work: it auto-provisions a SQLite datasource
(`.objectstack/data/dev.db`, persisted across restarts) that backs both your
data and the identity tables. `serve` (production) expects a real datasource to
be configured, so it won't have a driver for `sys_user` out of the box.

> SQLite uses the native `better-sqlite3` module. If you see
> *"Could not locate the bindings file"*, its native build was skipped — run
> `pnpm rebuild better-sqlite3` (it's in `pnpm-workspace.yaml`'s
> `onlyBuiltDependencies`, but pnpm can skip the build script on a fresh
> install).

## Authentication (sign-in)

Email/password auth is enabled via `@objectstack/plugin-auth`, mounted at
`/api/v1/auth/*` — the same base path the mobile `authClient` uses. The mobile
sign-in / sign-up screens work against it directly.

```bash
# sign up
curl -X POST localhost:3100/api/v1/auth/sign-up/email -H 'Content-Type: application/json' \
  -d '{"email":"demo@example.com","password":"Password123!","name":"Demo"}'
```

- Set `OS_AUTH_SECRET` in any real deploy (the config falls back to a dev-only
  secret). `trustedOrigins` lists the local web origin for CSRF.
- The agent's data tools require a session, so once signed in the **AI Assistant
  answers over your real records** (verified: it correctly counts + names seeded
  `server_item` rows).

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
