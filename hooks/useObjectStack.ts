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
