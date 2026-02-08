/**
 * Certificate pinning configuration.
 *
 * Provides a pinning policy that can be consumed by the network layer
 * to validate that the TLS certificate presented by the API server
 * matches one of the expected public-key hashes.
 *
 * NOTE: In the Expo managed workflow, full native TLS pinning requires
 * a custom dev-client build.  This module encapsulates the policy so
 * that it is ready to activate once the native modules are in place.
 */

export interface PinningPolicy {
  /** The hostname to pin (e.g. "api.objectstack.com") */
  hostname: string;
  /**
   * SHA-256 hashes of the Subject Public Key Info (SPKI).
   * At least two pins should be provided (primary + backup).
   * Format: "sha256/base64EncodedHash"
   */
  pins: string[];
  /** Whether pinning is enforced (true) or report-only (false) */
  enforced: boolean;
  /** Maximum certificate chain depth to validate */
  maxChainLength: number;
}

/**
 * Build the default pinning policy from the API base URL.
 *
 * Consumers should call this once at app startup and pass the result
 * into their HTTP client configuration.
 */
export function buildPinningPolicy(
  apiUrl: string,
  pins: string[] = [],
): PinningPolicy {
  let hostname: string;
  try {
    hostname = new URL(apiUrl).hostname;
  } catch {
    hostname = apiUrl;
  }

  return {
    hostname,
    pins,
    enforced: pins.length > 0,
    maxChainLength: 3,
  };
}

/**
 * Validate that a certificate hash matches the pinning policy.
 *
 * This is a pure-function validation helper. In production the
 * actual TLS handshake validation is handled by the native layer;
 * this helper is useful for testing and diagnostics.
 */
export function validateCertificatePin(
  policy: PinningPolicy,
  certHash: string,
): boolean {
  if (!policy.enforced || policy.pins.length === 0) {
    return true; // pinning not active
  }
  return policy.pins.includes(certHash);
}
