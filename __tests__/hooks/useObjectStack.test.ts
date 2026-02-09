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
});
