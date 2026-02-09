/**
 * SDK-compatible hook alias for package/app discovery.
 *
 * Re-exports useAppDiscovery with the SDK naming convention
 * (`usePackages`) until @objectstack/client-react provides
 * a built-in implementation.
 *
 * @see hooks/useAppDiscovery.ts for the implementation
 */
export { useAppDiscovery as usePackages } from "./useAppDiscovery";
export type { AppManifest } from "./useAppDiscovery";
