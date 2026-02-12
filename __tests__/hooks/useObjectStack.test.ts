/**
 * Tests for useObjectStack – validates the barrel re-export file
 * that provides all SDK hooks and custom hook aliases.
 */
import * as ObjectStackHooks from "~/hooks/useObjectStack";

describe("useObjectStack (barrel exports)", () => {
  it("re-exports core SDK hooks", () => {
    expect(ObjectStackHooks.useClient).toBeDefined();
    expect(ObjectStackHooks.useQuery).toBeDefined();
    expect(ObjectStackHooks.useMutation).toBeDefined();
    expect(ObjectStackHooks.usePagination).toBeDefined();
    expect(ObjectStackHooks.useInfiniteQuery).toBeDefined();
    expect(ObjectStackHooks.useObject).toBeDefined();
    expect(ObjectStackHooks.useView).toBeDefined();
    expect(ObjectStackHooks.useFields).toBeDefined();
    expect(ObjectStackHooks.useMetadata).toBeDefined();
  });

  it("re-exports Phase 5B SDK-compatible aliases", () => {
    expect(ObjectStackHooks.useBatchMutation).toBeDefined();
    expect(ObjectStackHooks.usePackages).toBeDefined();
    expect(ObjectStackHooks.useSavedViews).toBeDefined();
    expect(ObjectStackHooks.useAI).toBeDefined();
    expect(ObjectStackHooks.useServerTranslations).toBeDefined();
    expect(ObjectStackHooks.useAnalyticsQuery).toBeDefined();
    expect(ObjectStackHooks.useAnalyticsMeta).toBeDefined();
    expect(ObjectStackHooks.useFileUpload).toBeDefined();
  });

  it("re-exports Phase 14 hooks (UX Foundation)", () => {
    expect(ObjectStackHooks.useGlobalSearch).toBeDefined();
    expect(ObjectStackHooks.useRecentItems).toBeDefined();
    expect(ObjectStackHooks.useFavorites).toBeDefined();
    expect(ObjectStackHooks.usePageTransition).toBeDefined();
  });

  it("re-exports Phase 15 hooks (UX Polish — Home & Detail)", () => {
    expect(ObjectStackHooks.useInlineEdit).toBeDefined();
    expect(ObjectStackHooks.useContextualActions).toBeDefined();
    expect(ObjectStackHooks.useUndoRedo).toBeDefined();
    expect(ObjectStackHooks.useQuickActions).toBeDefined();
  });

  it("re-exports Phase 16 hooks (Forms, Lists & Interactions)", () => {
    expect(ObjectStackHooks.useFormDraft).toBeDefined();
    expect(ObjectStackHooks.useListEnhancement).toBeDefined();
  });

  it("re-exports Phase 17 hooks (Settings, Onboarding & Notifications)", () => {
    expect(ObjectStackHooks.useSettings).toBeDefined();
    expect(ObjectStackHooks.useOnboarding).toBeDefined();
    expect(ObjectStackHooks.useNotificationEnhancement).toBeDefined();
    expect(ObjectStackHooks.useAuthEnhancement).toBeDefined();
  });

  it("re-exports Phase 18 hooks (Advanced Views)", () => {
    expect(ObjectStackHooks.useDashboardDrillDown).toBeDefined();
    expect(ObjectStackHooks.useKanbanDragDrop).toBeDefined();
    expect(ObjectStackHooks.useCalendarView).toBeDefined();
    expect(ObjectStackHooks.useMapView).toBeDefined();
    expect(ObjectStackHooks.useChartInteraction).toBeDefined();
  });

  it("re-exports Phase 19 hooks (Accessibility & Performance)", () => {
    expect(ObjectStackHooks.useDynamicType).toBeDefined();
    expect(ObjectStackHooks.useReducedMotion).toBeDefined();
    expect(ObjectStackHooks.useOptimisticUpdate).toBeDefined();
    expect(ObjectStackHooks.usePrefetch).toBeDefined();
  });

  it("re-exports Phase 20 hooks (Platform Integration)", () => {
    expect(ObjectStackHooks.useDeepLink).toBeDefined();
    expect(ObjectStackHooks.useWidgetKit).toBeDefined();
    expect(ObjectStackHooks.useVoiceShortcuts).toBeDefined();
    expect(ObjectStackHooks.useWatchConnectivity).toBeDefined();
  });
});
