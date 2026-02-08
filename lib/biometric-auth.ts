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

export interface AuthenticateOptions {
  /** User-facing reason for authentication */
  promptMessage?: string;
  /** Label for the cancel button */
  cancelLabel?: string;
  /** Allow device passcode as fallback */
  fallbackToPasscode?: boolean;
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
