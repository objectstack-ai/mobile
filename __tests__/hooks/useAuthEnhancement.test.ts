/**
 * Tests for useAuthEnhancement – validates password visibility,
 * strength scoring, email/password validation, and registration state.
 */
import { renderHook, act } from "@testing-library/react-native";

jest.mock("@objectstack/client-react", () => ({
  useClient: () => ({}),
}));

import { useAuthEnhancement } from "~/hooks/useAuthEnhancement";

describe("useAuthEnhancement", () => {
  it("returns default state", () => {
    const { result } = renderHook(() => useAuthEnhancement());

    expect(result.current.passwordVisible).toBe(false);
    expect(result.current.registrationStep).toBe(1);
    expect(result.current.totalSteps).toBe(3);
    expect(result.current.tosAccepted).toBe(false);
  });

  it("togglePasswordVisibility toggles visibility", () => {
    const { result } = renderHook(() => useAuthEnhancement());

    act(() => {
      result.current.togglePasswordVisibility();
    });
    expect(result.current.passwordVisible).toBe(true);

    act(() => {
      result.current.togglePasswordVisibility();
    });
    expect(result.current.passwordVisible).toBe(false);
  });

  it("getPasswordStrength returns weak for short passwords", () => {
    const { result } = renderHook(() => useAuthEnhancement());

    const strength = result.current.getPasswordStrength("abc");
    expect(strength.score).toBe(0);
    expect(strength.label).toBe("weak");
    expect(strength.suggestions.length).toBeGreaterThan(0);
  });

  it("getPasswordStrength returns fair for 6-7 char passwords", () => {
    const { result } = renderHook(() => useAuthEnhancement());

    const strength = result.current.getPasswordStrength("abcdefg");
    expect(strength.score).toBe(1);
    expect(strength.label).toBe("fair");
  });

  it("getPasswordStrength returns good for 8-9 char passwords", () => {
    const { result } = renderHook(() => useAuthEnhancement());

    const strength = result.current.getPasswordStrength("abcdefgh");
    expect(strength.score).toBe(2);
    expect(strength.label).toBe("good");
  });

  it("getPasswordStrength returns strong for 12+ with special chars", () => {
    const { result } = renderHook(() => useAuthEnhancement());

    const strength = result.current.getPasswordStrength("Abcdefgh123!");
    expect(strength.score).toBe(4);
    expect(strength.label).toBe("excellent");
  });

  it("getPasswordStrength returns strong for 10-11 chars without special", () => {
    const { result } = renderHook(() => useAuthEnhancement());

    const strength = result.current.getPasswordStrength("abcdefghij");
    expect(strength.score).toBe(3);
    expect(strength.label).toBe("strong");
  });

  it("validateEmail accepts valid emails", () => {
    const { result } = renderHook(() => useAuthEnhancement());

    expect(result.current.validateEmail("user@example.com")).toBe(true);
    expect(result.current.validateEmail("a@b.co")).toBe(true);
  });

  it("validateEmail rejects invalid emails", () => {
    const { result } = renderHook(() => useAuthEnhancement());

    expect(result.current.validateEmail("not-an-email")).toBe(false);
    expect(result.current.validateEmail("@no-user.com")).toBe(false);
    expect(result.current.validateEmail("user@")).toBe(false);
    expect(result.current.validateEmail("")).toBe(false);
  });

  it("validatePassword returns valid for strong password", () => {
    const { result } = renderHook(() => useAuthEnhancement());

    const { valid, errors } = result.current.validatePassword("Abcdefg1!");
    expect(valid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it("validatePassword returns errors for weak password", () => {
    const { result } = renderHook(() => useAuthEnhancement());

    const { valid, errors } = result.current.validatePassword("abc");
    expect(valid).toBe(false);
    expect(errors).toContain("Password must be at least 8 characters");
    expect(errors).toContain("Password must contain an uppercase letter");
    expect(errors).toContain("Password must contain a number");
    expect(errors).toContain("Password must contain a special character");
  });

  it("setRegistrationStep updates step", () => {
    const { result } = renderHook(() => useAuthEnhancement());

    act(() => {
      result.current.setRegistrationStep(2);
    });
    expect(result.current.registrationStep).toBe(2);

    act(() => {
      result.current.setRegistrationStep(3);
    });
    expect(result.current.registrationStep).toBe(3);
  });

  it("setTosAccepted toggles ToS acceptance", () => {
    const { result } = renderHook(() => useAuthEnhancement());

    act(() => {
      result.current.setTosAccepted(true);
    });
    expect(result.current.tosAccepted).toBe(true);

    act(() => {
      result.current.setTosAccepted(false);
    });
    expect(result.current.tosAccepted).toBe(false);
  });
});
