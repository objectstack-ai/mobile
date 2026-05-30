---
"mobile": minor
---

Add two-factor (TOTP) authentication enrolment to the Account App.

Wire the better-auth `twoFactorClient` plugin into `lib/auth-client.ts` (alongside the
Expo client plugin) and add `hooks/useTwoFactor.ts` over `authClient.twoFactor.*`, which
maps to the server's `/api/v1/auth/two-factor/*` routes (mounted by the auth plugin):

- `enable(password)` → returns a `totpURI` (for an authenticator app) + one-time backup codes
- `verifyTotp(code)` → confirms and activates 2FA
- `disable(password)` and `generateBackupCodes(password)`

The Account screen (`app/account.tsx`) gains a Two-Factor section: enable → show the TOTP
secret + backup codes → confirm with a 6-digit code, plus disable when already enabled.
Verified against a live 7.3.0 server (enable returns totpURI + 10 backup codes; verify-totp
with a real computed code returns 200).
