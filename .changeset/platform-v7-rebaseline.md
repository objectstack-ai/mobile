---
"mobile": minor
---

Re-baseline to ObjectStack platform v7 (`@objectstack/*` 3.1.1 → 7.3.0).

- Bump all `@objectstack/*` dependencies to ^7.3.0.
- `useAI().chat` is now layered on the surviving `client.ai.nlq` primitive (the
  server-side `client.ai.chat` capability was removed in the v6 AI protocol reset);
  multi-turn context is preserved via a client-generated `conversationId`.
- Isolate the better-auth Expo client plugin typing cast in `lib/auth-client.ts`.
- Register ObjectQL as a kernel engine plugin (`ObjectQLPlugin`) in `server/dev.ts`
  so the auth plugin's `com.objectstack.engine.objectql` dependency resolves under v7.

Verified end-to-end against a local 7.3.0 server (discovery, `client.connect()`,
auth register/me, `data.find`). The 7.x client retains backward compatibility for
legacy query options (`filter`/`select`/`sort`) and the `project→environment` route
rename, so the query builder and data hooks required no changes.
