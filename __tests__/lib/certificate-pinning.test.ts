import {
  buildPinningPolicy,
  validateCertificatePin,
} from "~/lib/certificate-pinning";

describe("certificate-pinning", () => {
  describe("buildPinningPolicy", () => {
    it("extracts hostname from a full URL", () => {
      const policy = buildPinningPolicy("https://api.objectstack.com/v1", [
        "sha256/abc123",
      ]);
      expect(policy.hostname).toBe("api.objectstack.com");
      expect(policy.pins).toEqual(["sha256/abc123"]);
      expect(policy.enforced).toBe(true);
      expect(policy.maxChainLength).toBe(3);
    });

    it("uses the raw string when URL parsing fails", () => {
      const policy = buildPinningPolicy("not-a-url", []);
      expect(policy.hostname).toBe("not-a-url");
      expect(policy.enforced).toBe(false);
    });

    it("is not enforced when no pins provided", () => {
      const policy = buildPinningPolicy("https://example.com");
      expect(policy.enforced).toBe(false);
      expect(policy.pins).toEqual([]);
    });
  });

  describe("validateCertificatePin", () => {
    it("passes when the hash matches", () => {
      const policy = buildPinningPolicy("https://api.example.com", [
        "sha256/pin1",
        "sha256/pin2",
      ]);
      expect(validateCertificatePin(policy, "sha256/pin1")).toBe(true);
    });

    it("fails when the hash does not match", () => {
      const policy = buildPinningPolicy("https://api.example.com", [
        "sha256/pin1",
      ]);
      expect(validateCertificatePin(policy, "sha256/wrong")).toBe(false);
    });

    it("always passes when pinning is not enforced", () => {
      const policy = buildPinningPolicy("https://api.example.com", []);
      expect(validateCertificatePin(policy, "sha256/anything")).toBe(true);
    });
  });
});
