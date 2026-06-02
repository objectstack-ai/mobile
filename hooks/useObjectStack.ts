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
export { usePackageManagement } from "./usePackageManagement";

/* ---- Phase 14: UX Foundation — Navigation & Loading ---- */
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

/* ---- v1.4: Notification Center ---- */
export { useNotificationCenter } from "./useNotificationCenter";

/* ---- v1.6: Advanced Offline ---- */
export { useSelectiveSync } from "./useSelectiveSync";
export { useConflictResolution } from "./useConflictResolution";
export { useOfflineAnalytics } from "./useOfflineAnalytics";

/* ---- Phase 23: SDUI Record Page Protocol ---- */
export { useRecordDetails } from "./useRecordDetails";
export { useRecordHighlights } from "./useRecordHighlights";
export { useRecordActivity } from "./useRecordActivity";
export { useRecordChatter } from "./useRecordChatter";
export { useRecordPath } from "./useRecordPath";
export { useRecordRelatedList } from "./useRecordRelatedList";
export { useRecordReview } from "./useRecordReview";
export { useInterfacePageConfig } from "./useInterfacePageConfig";
export { useBlankPageLayout } from "./useBlankPageLayout";

/* ---- Phase 24: Interaction Protocol (DnD, Gesture, Animation) ---- */
export { useDndProtocol } from "./useDndProtocol";
export { useGestureProtocol } from "./useGestureProtocol";
export { useAnimationProtocol } from "./useAnimationProtocol";
export { usePageTransitionProtocol } from "./usePageTransitionProtocol";
export { useComponentAnimation } from "./useComponentAnimation";

/* ---- Phase 25: Focus, Keyboard, Offline & Notification Protocol ---- */
export { useFocusManagement } from "./useFocusManagement";
export { useKeyboardNavigation } from "./useKeyboardNavigation";
export { useOfflineConfig } from "./useOfflineConfig";
export { useSyncConfig } from "./useSyncConfig";
export { useNotificationUI } from "./useNotificationUI";
export { useEmbedConfig } from "./useEmbedConfig";
export { useViewSharing } from "./useViewSharing";
