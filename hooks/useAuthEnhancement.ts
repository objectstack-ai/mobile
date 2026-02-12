import { useCallback, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface PasswordStrength {
  score: number; // 0-4
  label: "weak" | "fair" | "good" | "strong" | "excellent";
  suggestions: string[];
}

export interface UseAuthEnhancementResult {
  passwordVisible: boolean;
  togglePasswordVisibility: () => void;
  getPasswordStrength: (password: string) => PasswordStrength;
  validateEmail: (email: string) => boolean;
  validatePassword: (password: string) => { valid: boolean; errors: string[] };
  registrationStep: number;
  setRegistrationStep: (step: number) => void;
  totalSteps: number;
  tosAccepted: boolean;
  setTosAccepted: (accepted: boolean) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for sign-in / sign-up enhancement utilities.
 *
 * ```ts
 * const { getPasswordStrength, validateEmail } = useAuthEnhancement();
 * ```
 */
export function useAuthEnhancement(): UseAuthEnhancementResult {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [registrationStep, setRegistrationStep] = useState(1);
  const [tosAccepted, setTosAccepted] = useState(false);

  const togglePasswordVisibility = useCallback(() => {
    setPasswordVisible((prev) => !prev);
  }, []);

  const getPasswordStrength = useCallback(
    (password: string): PasswordStrength => {
      const suggestions: string[] = [];

      if (password.length < 8)
        suggestions.push("Use at least 8 characters");
      if (!/[A-Z]/.test(password))
        suggestions.push("Add an uppercase letter");
      if (!/[a-z]/.test(password))
        suggestions.push("Add a lowercase letter");
      if (!/[0-9]/.test(password)) suggestions.push("Add a number");
      if (!SPECIAL_CHAR_REGEX.test(password))
        suggestions.push("Add a special character");

      if (password.length < 6)
        return { score: 0, label: "weak", suggestions };
      if (password.length < 8)
        return { score: 1, label: "fair", suggestions };
      if (password.length < 10)
        return { score: 2, label: "good", suggestions };
      if (password.length >= 12 && SPECIAL_CHAR_REGEX.test(password))
        return { score: 4, label: "excellent", suggestions };
      return { score: 3, label: "strong", suggestions };
    },
    [],
  );

  const validateEmail = useCallback((email: string): boolean => {
    return EMAIL_REGEX.test(email);
  }, []);

  const validatePassword = useCallback(
    (password: string): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];
      if (password.length < 8)
        errors.push("Password must be at least 8 characters");
      if (!/[A-Z]/.test(password))
        errors.push("Password must contain an uppercase letter");
      if (!/[a-z]/.test(password))
        errors.push("Password must contain a lowercase letter");
      if (!/[0-9]/.test(password))
        errors.push("Password must contain a number");
      if (!SPECIAL_CHAR_REGEX.test(password))
        errors.push("Password must contain a special character");
      return { valid: errors.length === 0, errors };
    },
    [],
  );

  return {
    passwordVisible,
    togglePasswordVisibility,
    getPasswordStrength,
    validateEmail,
    validatePassword,
    registrationStep,
    setRegistrationStep,
    totalSteps: 3,
    tosAccepted,
    setTosAccepted,
  };
}
