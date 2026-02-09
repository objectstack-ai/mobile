/**
 * SDK-compatible hook alias for batch mutations.
 *
 * Re-exports useBatchOperations with the SDK naming convention
 * (`useBatchMutation`) until @objectstack/client-react provides
 * a built-in implementation.
 *
 * @see hooks/useBatchOperations.ts for the implementation
 */
export { useBatchOperations as useBatchMutation } from "./useBatchOperations";
export type { BatchOperation, BatchItem, BatchProgress, BatchResult } from "./useBatchOperations";
