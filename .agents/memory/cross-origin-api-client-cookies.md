---
name: Cross-origin API client cookies
description: Generated web API clients must include cookies when frontend and API deployments use different origins
---

When a web frontend and API are deployed on different origins, the generated API client's fetch wrapper must default to `credentials: "include"` for cookie-session authentication. Manual fetch calls may include credentials while generated login/current-user calls silently omit them.

**Why:** Without credentials on login and current-user requests, the browser does not persist or send the API session cookie, so the UI can appear authenticated from in-memory login state while protected mutations return 401.

**How to apply:** Preserve explicit caller overrides, but default `credentials` to `"include"` in the shared browser fetch wrapper. Keep the API cookie configured with `SameSite=None; Secure` and the frontend requests credentialed.