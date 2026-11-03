/**
 * Biometric authentication utilities.
 *
 * Wraps expo-local-authentication to provide Face ID / Fingerprint
 * enrollment checks and authentication prompts.
 */
import * as LocalAuthentication from "expo-local-authentication";

export type BiometricType = "fingerprint" | "facial" | "iris" | "none";

export interface BiometricStatus {
  /** Whether the device has biometric hardware */
  isHardwareAvailable: boolean;
  /** Whether the user has enrolled biometrics */
  isEnrolled: boolean;
  /** Available biometric types on the device */
  biometricTypes: BiometricType[];
}

/**
 * Map SDK authentication types to our simplified type union.
 */
function mapAuthType(
  type: LocalAuthentication.AuthenticationType,
): BiometricType {
  switch (type) {
    case LocalAuthentication.AuthenticationType.FINGERPRINT:
      return "fingerprint";
    case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
      return "facial";
    case LocalAuthentication.AuthenticationType.IRIS:
      return "iris";
    default:
      return "none";
  }
}

/**
 * Query the device biometric capabilities and enrollment status.
 */
export async function getBiometricStatus(): Promise<BiometricStatus> {
  const isHardwareAvailable =
    await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  const raw =
    await LocalAuthentication.supportedAuthenticationTypesAsync();
  const biometricTypes = raw.map(mapAuthType).filter((t) => t !== "none");

  return { isHardwareAvailable, isEnrolled, biometricTypes };
}

/**
 * What the device can unlock with: `none` (no passcode or biometrics set up —
 * nothing to authenticate with), `passcode`, or `biometric`. The app lock can
 * be turned on only above `none`.
 */
export type DeviceLockLevel = "none" | "passcode" | "biometric";

export async function getDeviceLockLevel(): Promise<DeviceLockLevel> {
  const level = await LocalAuthentication.getEnrolledLevelAsync();
  if (level === LocalAuthentication.SecurityLevel.NONE) return "none";
  if (level === LocalAuthentication.SecurityLevel.SECRET) return "passcode";
  return "biometric";
}

export interface AuthenticateOptions {
  /** User-facing reason for authentication */
  promptMessage?: string;
  /** Label for the cancel button */
  cancelLabel?: string;
  /** Allow device passcode as fallback */
  fallbackToPasscode?: boolean;
}

/** Errors that mean the device has nothing to authenticate with. */
const NO_DEVICE_LOCK_ERRORS: ReadonlySet<string> = new Set([
  "not_enrolled",
  "passcode_not_set",
  "not_available",
]);

/** Errors that mean the prompt was dismissed rather than failed. */
const CANCEL_ERRORS: ReadonlySet<string> = new Set(["user_cancel", "system_cancel", "app_cancel"]);

/** How a failed {@link authenticate} ended: dismissed, nothing to use, or failed. */
export function authFailureKind(error: string | undefined): "cancelled" | "no-device-lock" | "failed" {
  if (error !== undefined && CANCEL_ERRORS.has(error)) return "cancelled";
  if (error !== undefined && NO_DEVICE_LOCK_ERRORS.has(error)) return "no-device-lock";
  return "failed";
}

export interface AuthenticateResult {
  success: boolean;
  error?: string;
}

/**
 * Prompt the user for biometric (or fallback passcode) authentication.
 */
export async function authenticate(
  options: AuthenticateOptions = {},
): Promise<AuthenticateResult> {
  const {
    promptMessage = "Authenticate to continue",
    cancelLabel = "Cancel",
    fallbackToPasscode = true,
  } = options;

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel,
    disableDeviceFallback: !fallbackToPasscode,
  });

  if (result.success) {
    return { success: true };
  }

  return { success: false, error: result.error };
}
