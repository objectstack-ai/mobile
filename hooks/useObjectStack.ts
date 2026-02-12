/**
 * Re-export all hooks from @objectstack/client-react for convenience.
 * Consumers import from ~/hooks/useObjectStack instead of directly from the SDK.
 */
export {
  useClient,
  useQuery,
  useMutation,
  usePagination,
  useInfiniteQuery,
  useObject,
  useView,
  useFields,
  useMetadata,
} from "@objectstack/client-react";

/* ---- Phase 5B: SDK-compatible hook aliases ---- */
export { useBatchMutation } from "./useBatchMutation";
export { usePackages } from "./usePackages";
export { useSavedViews } from "./useSavedViews";
export { useAI } from "./useAI";
export { useServerTranslations } from "./useServerTranslations";
export { useAnalyticsQuery } from "./useAnalyticsQuery";
export { useAnalyticsMeta } from "./useAnalyticsMeta";
export { useFileUpload } from "./useFileUpload";

/* ---- Phase 9: Spec v2.0.4 Alignment ---- */
export { useAutomation } from "./useAutomation";
export { usePackageManagement } from "./usePackageManagement";

/* ---- Phase 11: AI & Intelligence ---- */
export { useAISession } from "./useAISession";
export { useRAG } from "./useRAG";
export { useMCPTools } from "./useMCPTools";
export { useAgent } from "./useAgent";
export { useAICost } from "./useAICost";

/* ---- Phase 12: Security Module ---- */
export { useRLS } from "./useRLS";
export { useSecurityPolicies } from "./useSecurityPolicies";
export { useSharing } from "./useSharing";
export { useTerritory } from "./useTerritory";

/* ---- Phase 13: Advanced Platform Features ---- */
export { useCollaboration } from "./useCollaboration";
export { useAuditLog } from "./useAuditLog";
