/**
 * SDK-compatible hook alias for saved views.
 *
 * Re-exports useViewStorage with the SDK naming convention
 * (`useSavedViews`) until @objectstack/client-react provides
 * a built-in implementation.
 *
 * @see hooks/useViewStorage.ts for the implementation
 */
export { useViewStorage as useSavedViews } from "./useViewStorage";
export type { SavedView, SaveViewInput } from "./useViewStorage";
