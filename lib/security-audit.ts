/**
 * Security audit — automated security checklist for pre-release audits.
 *
 * Inspects the runtime security posture of the app and produces a
 * structured report.  Each check either passes or fails with a
 * human-readable message.
 *
 * Usage:
 *   const audit = createSecurityAudit();
 *   audit.addCheck({ ... });
 *   const report = audit.run();
 */

/** Result of a single audit check */
export interface AuditCheckResult {
  /** Short identifier for the check */
  id: string;
  /** Human-readable description */
  description: string;
  /** Severity of a failure */
  severity: "critical" | "high" | "medium" | "low" | "info";
  /** Whether the check passed */
  passed: boolean;
  /** Additional detail when the check fails */
  detail?: string;
}

/** A check definition that can be evaluated */
export interface AuditCheckDefinition {
  id: string;
  description: string;
  severity: AuditCheckResult["severity"];
  /** Returns `true` when the check passes */
  evaluate: () => boolean | Promise<boolean>;
  /** Message shown when the check fails */
  failureDetail?: string;
}

/** Aggregate audit report */
export interface SecurityAuditReport {
  /** All check results */
  checks: AuditCheckResult[];
  /** Number that passed */
  passedCount: number;
  /** Number that failed */
  failedCount: number;
  /** Overall score (0–100) */
  score: number;
  /** Timestamp */
  generatedAt: string;
}

export interface SecurityAudit {
  /** Register a check */
  addCheck: (check: AuditCheckDefinition) => void;
  /** Run all registered checks and return the report */
  run: () => Promise<SecurityAuditReport>;
  /** Reset registered checks */
  reset: () => void;
}

/**
 * Create a security audit instance.
 */
export function createSecurityAudit(): SecurityAudit {
  const checks: AuditCheckDefinition[] = [];

  function addCheck(check: AuditCheckDefinition): void {
    checks.push(check);
  }

  async function run(): Promise<SecurityAuditReport> {
    const results: AuditCheckResult[] = [];

    for (const check of checks) {
      let passed: boolean;
      try {
        passed = await check.evaluate();
      } catch {
        passed = false;
      }

      results.push({
        id: check.id,
        description: check.description,
        severity: check.severity,
        passed,
        detail: passed ? undefined : check.failureDetail,
      });
    }

    const passedCount = results.filter((r) => r.passed).length;
    const failedCount = results.length - passedCount;
    const score = results.length > 0 ? Math.round((passedCount / results.length) * 100) : 100;

    return {
      checks: results,
      passedCount,
      failedCount,
      score,
      generatedAt: new Date().toISOString(),
    };
  }

  function reset(): void {
    checks.length = 0;
  }

  return { addCheck, run, reset };
}

// ---------------------------------------------------------------------------
// Built-in check factories
// ---------------------------------------------------------------------------

/**
 * Create the standard set of mobile security audit checks.
 *
 * These are pure-configuration checks that verify security settings
 * rather than performing actual penetration testing.
 */
export function getDefaultSecurityChecks(options: {
  /** Whether biometric auth is enabled */
  biometricEnabled?: boolean;
  /** Whether certificate pinning has pins configured */
  certificatePinningConfigured?: boolean;
  /** Whether secure storage is used for tokens */
  secureStorageUsed?: boolean;
  /** Inactivity timeout in seconds (0 = disabled) */
  inactivityTimeout?: number;
  /** Whether the app is running in debug mode */
  debugMode?: boolean;
  /** Whether API communication uses HTTPS */
  httpsOnly?: boolean;
}): AuditCheckDefinition[] {
  return [
    {
      id: "biometric-auth",
      description: "Biometric authentication is enabled",
      severity: "high",
      evaluate: () => options.biometricEnabled === true,
      failureDetail: "Enable biometric authentication for enhanced security.",
    },
    {
      id: "certificate-pinning",
      description: "Certificate pinning is configured",
      severity: "high",
      evaluate: () => options.certificatePinningConfigured === true,
      failureDetail:
        "Configure TLS certificate pinning to prevent MITM attacks.",
    },
    {
      id: "secure-storage",
      description: "Tokens stored in secure storage",
      severity: "critical",
      evaluate: () => options.secureStorageUsed !== false,
      failureDetail:
        "Authentication tokens must be stored in secure storage (Keychain / Keystore).",
    },
    {
      id: "inactivity-timeout",
      description: "Inactivity timeout is configured",
      severity: "medium",
      evaluate: () =>
        options.inactivityTimeout !== undefined && options.inactivityTimeout > 0,
      failureDetail:
        "Set an inactivity timeout to lock the app after a period of inactivity.",
    },
    {
      id: "debug-disabled",
      description: "Debug mode is disabled in production",
      severity: "critical",
      evaluate: () => options.debugMode !== true,
      failureDetail:
        "Debug mode must be disabled before shipping to production.",
    },
    {
      id: "https-only",
      description: "API communication uses HTTPS",
      severity: "critical",
      evaluate: () => options.httpsOnly !== false,
      failureDetail:
        "All API communication must use HTTPS to protect data in transit.",
    },
  ];
}
