---
name: Cross-domain session cookies
description: Session cookie requirements when custom-domain frontends call the API on a different registrable domain
---

When a custom-domain frontend such as `admin.maligain.com` calls an API hosted on a different registrable domain such as `*.onrender.com`, credentialed requests require `SameSite=None; Secure` on the API session cookie, plus an explicit CORS origin allowlist and `credentials: true`.

**Why:** `SameSite=Strict` prevents the browser from sending the API session cookie on cross-site fetches, so login can appear successful while the next authenticated request returns 401.

**How to apply:** Keep `credentials: "include"` in frontend requests, include both custom frontend origins in the API `ALLOWED_ORIGINS`, use `SameSite=None` in production, and ask users to sign in again after changing the cookie policy.