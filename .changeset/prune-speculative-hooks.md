---
"mobile": minor
---

Reconcile hooks against the real platform v7 client surface — prune 19 speculative hooks.

Audited every hook against the actual `@objectstack/client@7.3.0` API (introspected from
the SDK types and a live CLI server). 19 hooks called namespaces/methods that **do not
exist** in 7.x — they were built against `@objectstack/spec@3.1.1` schemas the platform
removed in the v6 AI reset / module consolidation, had **zero screen consumers**, and only
"passed" via self-mocked tests.

Deleted (42 files): the hooks, their tests, and the 2 unused components that used them:

- AI: `useRAG`, `useMCPTools`, `useAgent`, `useAICost`, `useAISession`, `useCodeGen`,
  `useDevOpsAgent`, `usePredictive` (`client.ai` is now just nlq/suggest/insights)
- Security: `useRLS`, `useSecurityPolicies`, `useSharing`, `useTerritory` (no `client.security`)
- Realtime: `useChannels`, `useMessaging`, `useCollaboration` (realtime = connect/sub/presence)
- `useETLPipeline`, `useConnector`, `useAuditLog`, `useGlobalSearch`
- Components: `AgentProgress`, `CollaborationOverlay`

Hook count 95 → 76; every retained hook maps to a verified 7.3.0 namespace. Audit,
record sharing, territory, and global search can be rebuilt later on the data API
(`sys_audit_log`, `sys_record_share`, `sys_department`, multi-object `data.find`).

lint green; 1040/1040 tests pass.
