---
"mobile": minor
---

Add the v7 Account App — self-service identity management.

New `app/account.tsx` screen (reachable from the More tab) with `hooks/useAccount.ts`,
backed by the platform v7 auth plugin via `client.auth.*`:

- Update profile name (`updateUser`)
- Change password with "revoke other sessions" (`changePassword`)
- Begin a verification-gated change-email flow (`changeEmail`)
- Resend the email-verification link (`sendVerificationEmail`)

Wired into `app/(tabs)/more.tsx` (the profile header and a new "Account" item now route
to `/account`, replacing the dead `/(tabs)/profile` link). Verified end-to-end against a
live 7.3.0 server: register → update-user → change-password → sign-in with the new
password all succeed.
