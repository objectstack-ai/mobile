# ObjectStack Mobile — Security Design Document

> **Version**: 1.0 · **Last Updated**: 2026-02-08
>
> Security architecture, threat model, and implementation guidelines for the ObjectStack Mobile client.

---

## Table of Contents

1. [Security Principles](#security-principles)
2. [Authentication Security](#authentication-security)
3. [Data Protection](#data-protection)
4. [Network Security](#network-security)
5. [Local Storage Security](#local-storage-security)
6. [Session Management](#session-management)
7. [Input Validation](#input-validation)
8. [Error Handling Security](#error-handling-security)
9. [Third-Party Dependencies](#third-party-dependencies)
10. [Planned Enhancements](#planned-enhancements)
11. [Security Checklist](#security-checklist)

---

## Security Principles

### Defense in Depth

Multiple layers of security controls:

```
┌─────────────────────────────────────────┐
│  Network Layer                          │
│  (HTTPS, certificate validation)        │
├─────────────────────────────────────────┤
│  Authentication Layer                   │
│  (better-auth, token management)        │
├─────────────────────────────────────────┤
│  Authorization Layer                    │
│  (server-side, planned client-side)     │
├─────────────────────────────────────────┤
│  Data Layer                             │
│  (encrypted storage, input validation)  │
├─────────────────────────────────────────┤
│  Application Layer                      │
│  (error boundaries, safe rendering)     │
└─────────────────────────────────────────┘
```

### Least Privilege

- The mobile client only requests the minimum data needed for each view
- Auth tokens are scoped to the authenticated user
- Field projections limit data exposure

### Secure by Default

- All HTTP communication uses HTTPS
- Tokens are stored in encrypted storage (expo-secure-store)
- No sensitive data is logged or exposed in error messages

---

## Authentication Security

### Token Management

| Aspect | Implementation |
|--------|---------------|
| **Storage** | `expo-secure-store` (iOS Keychain / Android Keystore) |
| **Format** | JWT tokens from better-auth |
| **Injection** | Token passed to `ObjectStackClient` via constructor |
| **Refresh** | better-auth handles token refresh automatically |
| **Revocation** | `authClient.signOut()` clears local tokens |

### Token Flow

```
1. User authenticates → better-auth issues token
2. Token stored in expo-secure-store (encrypted, hardware-backed)
3. Token read from secure store on app launch
4. Token injected into ObjectStackClient via useMemo
5. Client attaches token to all API requests (Authorization header)
6. On sign-out: token cleared from secure store + client rebuilt
```

### Auth Guard Implementation

```typescript
function useProtectedRoute() {
  const { data: session, isPending } = authClient.useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isPending) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!session && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, isPending, segments]);
}
```

**Security guarantees**:
- Unauthenticated users cannot access `(tabs)` or `(app)` routes
- Authenticated users are redirected away from `(auth)` routes
- Session check runs on every route change

---

## Data Protection

### Data Classification

| Classification | Examples | Storage | Encryption |
|---------------|----------|---------|-----------|
| **Secrets** | Auth tokens, API keys | expo-secure-store | Hardware-encrypted |
| **Sensitive** | User data, business records | expo-sqlite (offline DB) | SQLite file encryption (planned) |
| **Metadata** | Object schemas, view definitions | react-native-mmkv | Not encrypted (non-sensitive) |
| **Transient** | UI state, query cache | In-memory (Zustand, TanStack) | N/A |

### Storage Isolation

```
expo-secure-store         ← Auth tokens ONLY (hardware-backed encryption)
expo-sqlite               ← Business data (offline records, sync queue)
react-native-mmkv         ← Metadata cache (ETags, schema definitions)
Zustand (in-memory)       ← UI state (theme, current app, sync status)
TanStack Query (in-memory)← Server data cache (auto-cleared on sign-out)
```

### Data at Rest

| Store | Protection |
|-------|-----------|
| **expo-secure-store** | iOS: Keychain (AES-256-GCM); Android: Keystore (AES-256) |
| **expo-sqlite** | SQLite file on app-private directory; app sandbox protection |
| **react-native-mmkv** | App-private directory; OS-level sandboxing |

### Data Cleanup on Sign-Out

When a user signs out, the following data must be cleared:

```typescript
// 1. Auth tokens
authClient.signOut(); // Clears expo-secure-store

// 2. Offline data
clearAllLocalData(); // Clears expo-sqlite

// 3. Metadata cache
clearMetadataCache(); // Clears MMKV

// 4. Sync queue
clearSyncQueue(); // Clears pending mutations

// 5. In-memory state
// Zustand stores reset, TanStack Query cache cleared
```

---

## Network Security

### Transport Security

| Control | Implementation |
|---------|---------------|
| **HTTPS** | All API communication over TLS 1.2+ |
| **Certificate validation** | OS-default certificate chain validation |
| **Certificate pinning** | Planned (Phase 4A.6) |

### API Communication

```
Mobile App ──── HTTPS ──── ObjectStack Server
              │
              ├── Authorization: Bearer <token>
              ├── Content-Type: application/json
              ├── If-None-Match: <etag>  (conditional requests)
              └── User-Agent: ObjectStack-Mobile/1.0
```

### Error Response Handling

Server errors are parsed into user-friendly messages without exposing:
- Internal server details
- Stack traces
- Database error messages
- API endpoint paths

```typescript
// lib/error-handling.ts
export function parseError(error: unknown): ObjectStackError {
  // Structured error → mapped to user-friendly message
  // Unknown error → generic "Something went wrong" message
  // Never exposes raw error to user
}
```

---

## Local Storage Security

### SQLite Database

| Control | Implementation |
|---------|---------------|
| **Location** | App-private directory (OS sandbox) |
| **Journal mode** | WAL (Write-Ahead Logging) |
| **Access** | Only accessible by this app process |
| **Encryption** | Planned (SQLCipher integration) |

### MMKV Storage

| Control | Implementation |
|---------|---------------|
| **Instance ID** | `objectstack-metadata` (isolated namespace) |
| **Content** | Non-sensitive metadata only |
| **Access** | App-private, OS-sandboxed |

### Secure Store

| Control | Implementation |
|---------|---------------|
| **iOS** | Keychain Services (hardware-backed) |
| **Android** | Keystore System (hardware-backed) |
| **Content** | Auth tokens only |
| **Access** | Biometric/passcode required (configurable) |

---

## Session Management

### Session Lifecycle

```
App Launch
    ↓
Check expo-secure-store for token
    ↓
┌── Token exists? ──┐
│                    │
▼ Yes                ▼ No
│                    │
Validate token       Show sign-in
(authClient.useSession)
    ↓
┌── Valid? ──┐
│            │
▼ Yes        ▼ No
│            │
Main app     Clear token
             Show sign-in
```

### Session Timeout

| Policy | Implementation |
|--------|---------------|
| **Token expiry** | Handled by better-auth (auto-refresh) |
| **Background timeout** | Planned (Phase 4A.6) — lock screen after inactivity |
| **Biometric unlock** | Planned (Phase 4A.6) — Face ID / Fingerprint |

---

## Input Validation

### Client-Side Validation

| Validation | Location | Implementation |
|-----------|----------|---------------|
| **Required fields** | FormViewRenderer | Check `field.required` before submit |
| **Field type** | FieldRenderer | Type-appropriate keyboard and format |
| **Email format** | FieldRenderer | Email regex validation |
| **URL format** | FieldRenderer | URL pattern validation |
| **Number range** | FieldRenderer | Min/max bounds check |
| **String length** | FieldRenderer | Character limit enforcement |

### Server-Side Validation

All mutations are validated server-side. Client validation is advisory only — the server is the source of truth.

```typescript
try {
  await create(formData);
} catch (err) {
  const parsed = parseError(err);
  if (parsed.code === "VALIDATION_ERROR") {
    // Show field-level errors from parsed.details
  }
}
```

### Filter Input Sanitization

Query builder filters are serialized through a type-safe pipeline:

```
User input → SimpleFilter object → serializeFilter() → ObjectQL AST → Server
```

No raw user input is sent directly to the server.

---

## Error Handling Security

### Principles

1. **Never expose internal details** — Error messages shown to users are generic
2. **Never log sensitive data** — No tokens, passwords, or PII in logs
3. **Fail safely** — ErrorBoundary catches rendering crashes gracefully
4. **Structured errors** — All errors go through `parseError()` pipeline

### Error Boundary

```typescript
// components/common/ErrorBoundary.tsx
// Catches React rendering errors
// Shows recovery UI with retry button
// Prevents crash from exposing app internals
```

### Error Code Mapping

Every server error code is mapped to a safe, user-friendly message:

```typescript
const ERROR_MESSAGES: Record<ObjectStackErrorCode, string> = {
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
  FORBIDDEN: "You don't have permission to perform this action.",
  NOT_FOUND: "The requested resource was not found.",
  // ... (no technical details exposed)
};
```

---

## Third-Party Dependencies

### Dependency Security

| Category | Approach |
|----------|----------|
| **Vulnerability scanning** | GitHub Dependabot alerts |
| **Version pinning** | `package-lock.json` for deterministic installs |
| **Expo SDK** | Managed workflow limits native code exposure |
| **Auth library** | `better-auth` — actively maintained, security-focused |

### Trusted Dependencies

| Package | Security Role |
|---------|-------------|
| `expo-secure-store` | Hardware-encrypted credential storage |
| `expo-sqlite` | App-sandboxed database |
| `react-native-mmkv` | Fast key-value cache (app-private) |
| `better-auth` | Token management with secure refresh |
| `@better-auth/expo` | Expo-specific secure storage adapter |

---

## Planned Enhancements

### Phase 4A.6 — Security Enhancements

| Enhancement | Description | Technology |
|------------|-------------|-----------|
| **Biometric auth** | Face ID / Fingerprint unlock | `expo-local-authentication` |
| **Background lock** | Lock screen after inactivity timeout | App state listener |
| **Session management** | View active sessions, remote sign-out | `client.auth.me()` |
| **Certificate pinning** | Pin server TLS certificate | Custom TLS config |

### Future Considerations

| Enhancement | Description |
|------------|-------------|
| **SQLCipher** | Encrypt SQLite database at rest |
| **Jailbreak detection** | Warn on rooted/jailbroken devices |
| **App attestation** | Verify app integrity (Play Integrity / App Attest) |
| **Data masking** | Mask sensitive fields in screenshots |
| **Audit logging** | Client-side action audit trail |

---

## Security Checklist

### Development

- [ ] All API calls use HTTPS
- [ ] Auth tokens stored in expo-secure-store only
- [ ] No sensitive data in logs or console output
- [ ] Input validation on all form fields
- [ ] Error messages are user-friendly (no internals)
- [ ] ErrorBoundary wraps all major views

### Code Review

- [ ] No hardcoded secrets or API keys
- [ ] No `eval()` or dynamic code execution
- [ ] No sensitive data in local storage (only secure store)
- [ ] All user input is sanitized before use
- [ ] Dependencies checked for known vulnerabilities

### Release

- [ ] Dependency vulnerability scan passed
- [ ] TypeScript strict mode enabled
- [ ] ESLint security rules passing
- [ ] No development/debug code in production build
- [ ] App signing keys properly secured

---

*This document covers the security architecture as of the current implementation. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the overall system architecture and [ROADMAP.md](./ROADMAP.md) for planned security enhancements.*
