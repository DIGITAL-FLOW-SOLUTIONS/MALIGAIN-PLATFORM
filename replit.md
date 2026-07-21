# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Running on Replit

### Prerequisites

All required secrets must be set in Replit Secrets before the app will function:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_SECRET`, `SUPABASE_ANON_KEY` — Supabase project credentials
- `SESSION_SECRET` — random string for signing session cookies
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — email delivery (optional for basic startup)

### Install dependencies

```bash
pnpm install
```

### Start services (development)

Each service has its own Replit workflow — start them from the Workflows panel, or run manually:

| Service | Command | Port | Preview path |
|---------|---------|------|-------------|
| MULACENT frontend | `pnpm --filter @workspace/mulacent run dev` | 23897 | `/` |
| Admin panel | `pnpm --filter @workspace/admin run dev` | 23744 | `/admin/` |
| API server | `pnpm --filter @workspace/api-server run dev` | 8080 | `/api` |

### Verify services are up

```bash
# API health check
curl http://localhost:8080/api/healthz
# Expected: 200 OK

# Frontend (returns HTML)
curl -s http://localhost:23897/ | grep -c "<html"
# Expected: 1

# Admin panel (returns HTML)
curl -s http://localhost:23744/admin/ | grep -c "<html"
# Expected: 1
```

### Nix modules

The project requires `postgresql-16` in `.replit` modules — this provides the `pg` toolchain used by scripts and the `lib/db` package for any local database operations.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: Supabase (PostgreSQL) — `@supabase/supabase-js` service-role client
- **Auth**: bcryptjs + express-session (persistent, 1-year cookie)
- **Validation**: Zod (`zod/v4`)
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (ESM bundle)

## Supabase

The backend uses Supabase exclusively. All database operations go through the `@supabase/supabase-js` service-role client in `artifacts/api-server/src/lib/supabase.ts`.

Required secrets (set in Replit Secrets):
- `SUPABASE_URL` — project URL (e.g. https://xxx.supabase.co)
- `SUPABASE_SERVICE_ROLE_SECRET` — service role key (bypasses RLS, server-only)
- `SUPABASE_ANON_KEY` — anon public key

Tables (created via SQL in Supabase): `users`, `wallet`, `transactions`, `products`, `purchases`, `bonus_tiers`, `bonus_history`, `tournaments`, `eversend_verifications`, `tasks`, `task_completions`, `admin_users`, `admin_audit_log`

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use the Supabase service-role client for all database operations.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, session, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers for auth, users, wallet, products, referrals, tournaments, bonuses, tasks
- Supabase client: `src/lib/supabase.ts` — initialized with `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_SECRET`
- Session: `express-session` with 1-year persistent cookie, `SESSION_SECRET`
- Depends on: `@workspace/api-zod`, `@supabase/supabase-js`, `bcryptjs`, `express-session`
- `pnpm --filter @workspace/api-server run dev` — build + start
- `pnpm --filter @workspace/api-server run build` — production esbuild ESM bundle

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `artifacts/mulacent` (`@workspace/mulacent`)

React + Vite frontend for the MALIGAIN platform. Served at `/`.

### `artifacts/admin` (`@workspace/admin`)

React + Vite admin panel. Served at `/admin/`. Uses a dedicated login (session cookie with `adminId`). Calls `/api/admin/...` routes directly. Pages: Dashboard, Users, Verifications, Transactions, Tasks, Audit Log.

Admin auth uses the `admin_users` table (separate from `users`). All admin actions are recorded in `admin_audit_log`.

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
