---
name: Session middleware pool exhaustion fix
description: Root cause and fix for Render instance crashes caused by connect-pg-simple hitting PostgreSQL on every static file request
---

**The bug:** `app.use(session(...))` was registered globally before `express.static`, so every CSS/JS/image/favicon request caused `connect-pg-simple` to hit PostgreSQL to look up a session. Under any DB slowness (Supabase PGRST002 / upstream timeouts), the 10-connection pool filled instantly → `ECHECKOUTTIMEOUT` on all requests → 500 on everything → instance crash (exit 1) → Render restart loop every ~5-11 min.

**The fix (artifacts/api-server/src/app.ts):**
1. Move `express.static()` calls for `/assets`, `/images`, `/admin/assets` to BEFORE the session middleware — static files never need a session.
2. Use a dedicated `sessionPool` (Pool with max=3, connectionTimeoutMillis=5000) for PgStore, separate from the main API pool.
3. Add `disableTouch: true` to PgStore config — stops the store from issuing an UPDATE on every session read (cuts DB writes ~50%).
4. SPA HTML fallbacks (`/admin/*path`, `/*path`) remain after session middleware — that's acceptable since they serve index.html.

**Why:** Static assets make up the vast majority of requests on page load. Hitting the session DB for each one under a saturated or slow DB connection kills the entire pool and cascades to real API failures.
