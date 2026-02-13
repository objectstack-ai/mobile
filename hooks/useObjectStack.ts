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

/* ---- Phase 14: UX Foundation — Navigation & Loading ---- */
export { useGlobalSearch } from "./useGlobalSearch";
export { useRecentItems } from "./useRecentItems";
export { useFavorites } from "./useFavorites";
export { usePageTransition } from "./usePageTransition";

/* ---- Phase 15: UX Polish — Home & Detail ---- */
export { useInlineEdit } from "./useInlineEdit";
export { useContextualActions } from "./useContextualActions";
export { useUndoRedo } from "./useUndoRedo";
export { useQuickActions } from "./useQuickActions";

/* ---- Phase 16: Forms, Lists & Interactions ---- */
export { useFormDraft } from "./useFormDraft";
export { useListEnhancement } from "./useListEnhancement";

/* ---- Phase 17: Settings, Onboarding & Notifications ---- */
export { useSettings } from "./useSettings";
export { useOnboarding } from "./useOnboarding";
export { useNotificationEnhancement } from "./useNotificationEnhancement";
export { useAuthEnhancement } from "./useAuthEnhancement";

/* ---- Phase 18: Advanced Views ---- */
export { useDashboardDrillDown } from "./useDashboardDrillDown";
export { useKanbanDragDrop } from "./useKanbanDragDrop";
export { useCalendarView } from "./useCalendarView";
export { useMapView } from "./useMapView";
export { useChartInteraction } from "./useChartInteraction";

/* ---- Phase 19: Accessibility & Performance ---- */
export { useDynamicType } from "./useDynamicType";
export { useReducedMotion } from "./useReducedMotion";
export { useOptimisticUpdate } from "./useOptimisticUpdate";
export { usePrefetch } from "./usePrefetch";

/* ---- Phase 20: Platform Integration ---- */
export { useDeepLink } from "./useDeepLink";
export { useWidgetKit } from "./useWidgetKit";
export { useVoiceShortcuts } from "./useVoiceShortcuts";
export { useWatchConnectivity } from "./useWatchConnectivity";

/* ---- Phase 21: Spec Gap — AI DevOps/CodeGen/Predictive ---- */
export { useDevOpsAgent } from "./useDevOpsAgent";
export { useCodeGen } from "./useCodeGen";
export { usePredictive } from "./usePredictive";

/* ---- Phase 22: Spec Gap — ETL & Connectors ---- */
export { useETLPipeline } from "./useETLPipeline";
export { useConnector } from "./useConnector";

/* ---- v1.4: Notification Center ---- */
export { useNotificationCenter } from "./useNotificationCenter";

/* ---- v1.5: Messaging & Channels ---- */
export { useMessaging } from "./useMessaging";
export { useChannels } from "./useChannels";

/* ---- v1.6: Advanced Offline ---- */
export { useSelectiveSync } from "./useSelectiveSync";
export { useConflictResolution } from "./useConflictResolution";
export { useOfflineAnalytics } from "./useOfflineAnalytics";
