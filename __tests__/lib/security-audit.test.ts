/**
 * Tests for lib/security-audit — security checklist and audit utility
 */
import {
  createSecurityAudit,
  getDefaultSecurityChecks,
} from "~/lib/security-audit";

describe("createSecurityAudit", () => {
  it("returns a perfect score with no checks", async () => {
    const audit = createSecurityAudit();
    const report = await audit.run();

    expect(report.checks).toEqual([]);
    expect(report.score).toBe(100);
    expect(report.passedCount).toBe(0);
    expect(report.failedCount).toBe(0);
  });

  it("runs a passing check", async () => {
    const audit = createSecurityAudit();
    audit.addCheck({
      id: "test-pass",
      description: "Always passes",
      severity: "info",
      evaluate: () => true,
    });

    const report = await audit.run();

    expect(report.checks).toHaveLength(1);
    expect(report.checks[0].passed).toBe(true);
    expect(report.checks[0].detail).toBeUndefined();
    expect(report.passedCount).toBe(1);
    expect(report.failedCount).toBe(0);
    expect(report.score).toBe(100);
  });

  it("runs a failing check and includes detail", async () => {
    const audit = createSecurityAudit();
    audit.addCheck({
      id: "test-fail",
      description: "Always fails",
      severity: "high",
      evaluate: () => false,
      failureDetail: "Fix this!",
    });

    const report = await audit.run();

    expect(report.checks[0].passed).toBe(false);
    expect(report.checks[0].detail).toBe("Fix this!");
    expect(report.score).toBe(0);
  });

  it("handles async evaluate functions", async () => {
    const audit = createSecurityAudit();
    audit.addCheck({
      id: "async-check",
      description: "Async check",
      severity: "medium",
      evaluate: async () => true,
    });

    const report = await audit.run();
    expect(report.checks[0].passed).toBe(true);
  });

  it("treats thrown errors as failures", async () => {
    const audit = createSecurityAudit();
    audit.addCheck({
      id: "error-check",
      description: "Throws error",
      severity: "critical",
      evaluate: () => {
        throw new Error("boom");
      },
      failureDetail: "Error occurred",
    });

    const report = await audit.run();
    expect(report.checks[0].passed).toBe(false);
    expect(report.checks[0].detail).toBe("Error occurred");
  });

  it("calculates correct score with mixed results", async () => {
    const audit = createSecurityAudit();
    audit.addCheck({
      id: "pass-1",
      description: "P1",
      severity: "info",
      evaluate: () => true,
    });
    audit.addCheck({
      id: "pass-2",
      description: "P2",
      severity: "info",
      evaluate: () => true,
    });
    audit.addCheck({
      id: "fail-1",
      description: "F1",
      severity: "high",
      evaluate: () => false,
    });
    audit.addCheck({
      id: "fail-2",
      description: "F2",
      severity: "low",
      evaluate: () => false,
    });

    const report = await audit.run();

    expect(report.passedCount).toBe(2);
    expect(report.failedCount).toBe(2);
    expect(report.score).toBe(50);
  });

  it("reset clears all checks", async () => {
    const audit = createSecurityAudit();
    audit.addCheck({
      id: "x",
      description: "X",
      severity: "info",
      evaluate: () => true,
    });
    audit.reset();

    const report = await audit.run();
    expect(report.checks).toEqual([]);
    expect(report.score).toBe(100);
  });

  it("includes generatedAt timestamp", async () => {
    const audit = createSecurityAudit();
    const report = await audit.run();
    expect(report.generatedAt).toBeTruthy();
    // Validate it's an ISO string
    expect(new Date(report.generatedAt).toISOString()).toBe(
      report.generatedAt,
    );
  });
});

describe("getDefaultSecurityChecks", () => {
  it("returns the standard set of checks", () => {
    const checks = getDefaultSecurityChecks({});
    expect(checks.length).toBeGreaterThanOrEqual(6);
    expect(checks.every((c) => c.id && c.description && c.severity)).toBe(
      true,
    );
  });

  it("biometric check passes when enabled", () => {
    const checks = getDefaultSecurityChecks({ biometricEnabled: true });
    const bio = checks.find((c) => c.id === "biometric-auth")!;
    expect(bio.evaluate()).toBe(true);
  });

  it("biometric check fails when disabled", () => {
    const checks = getDefaultSecurityChecks({ biometricEnabled: false });
    const bio = checks.find((c) => c.id === "biometric-auth")!;
    expect(bio.evaluate()).toBe(false);
  });

  it("certificate pinning check passes when configured", () => {
    const checks = getDefaultSecurityChecks({
      certificatePinningConfigured: true,
    });
    const pin = checks.find((c) => c.id === "certificate-pinning")!;
    expect(pin.evaluate()).toBe(true);
  });

  it("debug mode check fails when debug is on", () => {
    const checks = getDefaultSecurityChecks({ debugMode: true });
    const debug = checks.find((c) => c.id === "debug-disabled")!;
    expect(debug.evaluate()).toBe(false);
  });

  it("debug mode check passes when debug is off", () => {
    const checks = getDefaultSecurityChecks({ debugMode: false });
    const debug = checks.find((c) => c.id === "debug-disabled")!;
    expect(debug.evaluate()).toBe(true);
  });

  it("https check fails when not enforced", () => {
    const checks = getDefaultSecurityChecks({ httpsOnly: false });
    const https = checks.find((c) => c.id === "https-only")!;
    expect(https.evaluate()).toBe(false);
  });

  it("inactivity timeout check passes with non-zero timeout", () => {
    const checks = getDefaultSecurityChecks({ inactivityTimeout: 300 });
    const timeout = checks.find((c) => c.id === "inactivity-timeout")!;
    expect(timeout.evaluate()).toBe(true);
  });

  it("inactivity timeout check fails with zero timeout", () => {
    const checks = getDefaultSecurityChecks({ inactivityTimeout: 0 });
    const timeout = checks.find((c) => c.id === "inactivity-timeout")!;
    expect(timeout.evaluate()).toBe(false);
  });

  it("integrates with createSecurityAudit", async () => {
    const audit = createSecurityAudit();
    const checks = getDefaultSecurityChecks({
      biometricEnabled: true,
      certificatePinningConfigured: true,
      secureStorageUsed: true,
      inactivityTimeout: 300,
      debugMode: false,
      httpsOnly: true,
    });
    checks.forEach((c) => audit.addCheck(c));

    const report = await audit.run();
    expect(report.score).toBe(100);
    expect(report.failedCount).toBe(0);
  });
});
