/**
 * Standard error codes from ObjectStack API
 */
export type ObjectStackErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "NETWORK_ERROR"
  | "TIMEOUT";

export interface ObjectStackError {
  code: ObjectStackErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * User-friendly error messages for common error codes
 */
const ERROR_MESSAGES: Record<ObjectStackErrorCode, string> = {
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
  FORBIDDEN: "You don't have permission to perform this action.",
  NOT_FOUND: "The requested resource was not found.",
  VALIDATION_ERROR: "Please check your input and try again.",
  CONFLICT: "A conflict occurred. The data may have been modified by someone else.",
  RATE_LIMITED: "Too many requests. Please wait a moment and try again.",
  INTERNAL_ERROR: "Something went wrong on the server. Please try again later.",
  NETWORK_ERROR: "Unable to connect to the server. Please check your internet connection.",
  TIMEOUT: "The request timed out. Please try again.",
};

/**
 * Parse an error into a standardized ObjectStackError
 */
export function parseError(error: unknown): ObjectStackError {
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes("Network request failed") || error.message.includes("fetch")) {
      return {
        code: "NETWORK_ERROR",
        message: ERROR_MESSAGES.NETWORK_ERROR,
      };
    }

    // Try to parse structured error from API
    try {
      const parsed = JSON.parse(error.message);
      if (parsed.code && parsed.code in ERROR_MESSAGES) {
        return {
          code: parsed.code as ObjectStackErrorCode,
          message: ERROR_MESSAGES[parsed.code as ObjectStackErrorCode],
          details: parsed.details,
        };
      }
    } catch {
      // Not a JSON error, use generic message
    }

    return {
      code: "INTERNAL_ERROR",
      message: error.message || ERROR_MESSAGES.INTERNAL_ERROR,
    };
  }

  return {
    code: "INTERNAL_ERROR",
    message: ERROR_MESSAGES.INTERNAL_ERROR,
  };
}

/**
 * Get user-friendly error message
 */
export function getUserErrorMessage(error: unknown): string {
  return parseError(error).message;
}
