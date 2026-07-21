# DATABASE SCALE PLAYBOOK
## What Senior Engineers at Amazon, Shopify, and Top-Tier Companies Actually Do

> Written for engineers who want to build systems that handle millions of users without breaking.
> Every section here is either a battle-tested practice from large-scale production systems,
> or a fundamental principle taught in systems design interviews at FAANG-level companies.

---

## TABLE OF CONTENTS

1. [ACID — The Foundation](#1-acid--the-foundation)
2. [Schema Design Principles](#2-schema-design-principles)
3. [Indexing Strategy](#3-indexing-strategy)
4. [Query Optimization](#4-query-optimization)
5. [Connection Pooling](#5-connection-pooling)
6. [Caching Architecture](#6-caching-architecture)
7. [Read Replicas & Write Scaling](#7-read-replicas--write-scaling)
8. [Database Sharding & Partitioning](#8-database-sharding--partitioning)
9. [Transactions & Concurrency Control](#9-transactions--concurrency-control)
10. [Rate Limiting](#10-rate-limiting)
11. [Load Balancing](#11-load-balancing)
12. [API Security & Hardening](#12-api-security--hardening)
13. [Authentication at Scale](#13-authentication-at-scale)
14. [Monitoring, Alerting & Observability](#14-monitoring-alerting--observability)
15. [Backup, Recovery & Data Durability](#15-backup-recovery--data-durability)
16. [Migration Strategy at Scale](#16-migration-strategy-at-scale)
17. [CAP Theorem & Distributed Systems](#17-cap-theorem--distributed-systems)
18. [Event-Driven Architecture](#18-event-driven-architecture)
19. [API Design Principles](#19-api-design-principles)
20. [Infrastructure & Deployment](#20-infrastructure--deployment)
21. [The Senior Engineer Mindset](#21-the-senior-engineer-mindset)

---

## 1. ACID — The Foundation

ACID is not optional. Every financial transaction, wallet operation, and balance change in your system must be ACID-compliant. This is the first thing any senior engineer audits.

### What Each Letter Actually Means in Practice

**A — Atomicity: All or Nothing**

Every multi-step operation must either complete entirely or have zero effect. If step 3 of a 5-step process fails, steps 1 and 2 must be rolled back automatically.

```sql
-- WRONG: Three separate statements. If statement 2 fails,
-- the user's wallet is debited but the transaction is never recorded.
UPDATE wallet SET main_wallet = main_wallet - 100 WHERE user_id = 42;
INSERT INTO transactions (...) VALUES (...);
UPDATE wallet SET main_wallet = main_wallet + 100 WHERE user_id = 99;

-- RIGHT: Wrap in a transaction. If anything fails, all three roll back.
BEGIN;
  UPDATE wallet SET main_wallet = main_wallet - 100 WHERE user_id = 42;
  INSERT INTO transactions (...) VALUES (...);
  UPDATE wallet SET main_wallet = main_wallet + 100 WHERE user_id = 99;
COMMIT;
```

**C — Consistency: Rules Are Always Enforced**

The database must never be left in an invalid state. Enforce this at the DB level — not in application code, which can have bugs, be bypassed, or crash mid-execution.

```sql
-- Consistency tools:
-- 1. CHECK constraints
ALTER TABLE wallet ADD CONSTRAINT wallet_balance_non_negative
  CHECK (main_wallet >= 0);

-- 2. Foreign key constraints
ALTER TABLE transactions ADD CONSTRAINT fk_transactions_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;

-- 3. UNIQUE constraints (what prevented your duplicate wallet bug)
ALTER TABLE wallet ADD CONSTRAINT wallet_user_unique UNIQUE (user_id);

-- 4. NOT NULL constraints on critical fields
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
```

**I — Isolation: Concurrent Transactions Don't Interfere**

When two requests hit the DB at the same millisecond, each should behave as if it's the only one running. This is controlled by **isolation levels**:

| Level | What You Get | Risk | Use For |
|---|---|---|---|
| READ UNCOMMITTED | Sees other transactions' uncommitted changes | Dirty reads | Never use this |
| READ COMMITTED | Only sees committed data (PostgreSQL default) | Non-repeatable reads | General CRUD |
| REPEATABLE READ | Rows read at start of transaction don't change | Phantom reads | Financial calculations |
| SERIALIZABLE | Full isolation — transactions appear sequential | Slowest | Critical financial ops |

```sql
-- For wallet operations, use REPEATABLE READ minimum
BEGIN ISOLATION LEVEL REPEATABLE READ;
  SELECT main_wallet FROM wallet WHERE user_id = 42 FOR UPDATE;
  -- "FOR UPDATE" locks the row — no other transaction can modify it
  UPDATE wallet SET main_wallet = main_wallet - 100 WHERE user_id = 42;
COMMIT;
```

**D — Durability: Committed Data Survives Crashes**

Once the DB says "committed," that data must survive a server crash, power outage, or process kill. PostgreSQL achieves this via WAL (Write-Ahead Logging) — every commit is written to a log on disk before it's acknowledged. Enable this and never disable it.

---

## 2. Schema Design Principles

Bad schema design is the most expensive mistake to fix later — changing a schema on a table with 10 million rows while it's live is one of the hardest engineering challenges.

### Normalization vs. Denormalization

**Normalize to prevent anomalies, denormalize to improve read performance.**

- 3NF (Third Normal Form): each table represents one thing, no redundant data. Start here.
- Denormalize specific aggregates (totals, counts) that are read far more than they're written — but track them as cached columns, not the source of truth.

```sql
-- NORMALIZED: store only raw transactions
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  amount DECIMAL(12,2) NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- DENORMALIZED CACHE: pre-computed total for fast reads
-- The wallet table IS a denormalized cache of transaction sums.
-- It must always be updated atomically alongside the transaction record.
CREATE TABLE wallet (
  user_id INT PRIMARY KEY REFERENCES users(id),
  main_wallet DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (main_wallet >= 0),
  total_earned DECIMAL(12,2) NOT NULL DEFAULT 0
);
```

### Critical Schema Rules

1. **Every table needs a primary key.** Prefer `BIGSERIAL` (8-byte integer) over `SERIAL` (4-byte) for tables that will grow large. 4-byte integers cap at ~2.1 billion rows.

2. **Use `TIMESTAMPTZ`, never `TIMESTAMP`.** Timezone-aware timestamps prevent entire classes of bugs when users are in different countries.

3. **Never store money as FLOAT.** Use `DECIMAL(12,2)` or `NUMERIC(12,2)`. Floating-point arithmetic is imprecise: `0.1 + 0.2 ≠ 0.3` in floating point. This causes real financial calculation errors.

4. **Soft deletes over hard deletes.** Add `deleted_at TIMESTAMPTZ` to important tables. Hard-deleting user records is irreversible and breaks foreign keys.

5. **Enums in the DB, not just in code.** If a column has a fixed set of valid values, create a PostgreSQL enum or CHECK constraint. Application code can be bypassed or have bugs.

```sql
CREATE TYPE transaction_type AS ENUM (
  'recharge', 'withdrawal', 'referral_bonus', 'task_reward', 'activation_fee'
);
CREATE TABLE transactions (
  type transaction_type NOT NULL
  -- DB will reject any INSERT with an unknown type
);
```

6. **Avoid `SELECT *` in application queries.** Always name the columns you need. `SELECT *` breaks if you add or remove columns, ships unnecessary data over the wire, and prevents index-only scans.

---

## 3. Indexing Strategy

Indexes are the single highest-leverage database optimization. A missing index on a filtered column is the difference between a 0.1ms query and a 30-second query on a large table.

### How Indexes Work

PostgreSQL builds a B-tree data structure alongside your table. Without an index, every query scans every row sequentially (a "seq scan"). With an index, the DB jumps directly to matching rows (an "index scan").

```
Table scan on 1,000,000 rows:    ~1,000ms
Index scan on 1,000,000 rows:    ~1ms

That is a 1000x performance difference.
```

### What to Always Index

```sql
-- 1. Every foreign key column
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_wallet_user_id ON wallet(user_id);

-- 2. Every column you filter by (WHERE clause)
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_transactions_type ON transactions(type);

-- 3. Composite indexes for common multi-column filters
-- Order matters: most selective / most commonly used column first
CREATE INDEX idx_transactions_type_status ON transactions(type, status);

-- 4. Columns you sort by (ORDER BY)
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- 5. Columns in JOIN conditions
CREATE INDEX idx_bonus_history_user_id ON bonus_history(user_id);

-- 6. Unique constraints (automatically create a unique index)
ALTER TABLE wallet ADD CONSTRAINT wallet_user_unique UNIQUE (user_id);
```

### Partial Indexes — Indexes on a Subset of Rows

If you frequently query `WHERE status = 'pending'` and only 1% of rows are pending, index only those rows:

```sql
-- Only indexes pending rows — tiny, fast, highly selective
CREATE INDEX idx_transactions_pending
  ON transactions(created_at DESC)
  WHERE status = 'pending';

CREATE INDEX idx_verifications_pending
  ON eversend_verifications(created_at DESC)
  WHERE status = 'pending';
```

### Covering Indexes — Eliminate the Table Lookup

An index that contains all columns a query needs lets PostgreSQL answer the query from the index alone without ever touching the main table:

```sql
-- This query:
SELECT amount, status FROM transactions WHERE user_id = 42 ORDER BY created_at DESC;

-- Is fully satisfied by this covering index (no table lookup needed):
CREATE INDEX idx_transactions_covering
  ON transactions(user_id, created_at DESC)
  INCLUDE (amount, status);
```

### What NOT to Index

- Columns with very few distinct values on large tables (e.g., a boolean `is_active` on 1M rows — half true, half false — the DB may prefer a seq scan anyway)
- Tables with fewer than ~10,000 rows (overhead exceeds benefit)
- Columns that are almost never used in queries

### How to Find Missing Indexes

```sql
-- Find sequential scans on large tables (these need indexes)
SELECT relname AS table, seq_scan, idx_scan,
  seq_scan - idx_scan AS missed_index_opportunities
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan AND n_live_tup > 10000
ORDER BY missed_index_opportunities DESC;

-- Find slow queries (requires pg_stat_statements extension)
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

---

## 4. Query Optimization

### The Golden Rule: Compute in the Database, Not in Application Code

**Anti-pattern (what killed your Supabase memory):**
```javascript
// Downloads 5,300 rows to Node.js, sums them in JS, discards the rows
const { data } = await supabase.from("wallet").select("user_id, main_wallet");
const total = data.reduce((sum, row) => sum + row.main_wallet, 0);
```

**Senior engineer pattern:**
```sql
-- Computed entirely inside PostgreSQL. Returns one number. Zero rows shipped.
SELECT SUM(main_wallet) FROM wallet;
```

### N+1 Queries — The Silent Performance Killer

N+1 is when you make 1 query to get a list, then N more queries to get details for each item. At scale this destroys databases.

```javascript
// WRONG: N+1 pattern — 1 query to get users, then 1 per user for their wallet
const users = await db.query('SELECT id FROM users LIMIT 100');  // 1 query
for (const user of users) {
  const wallet = await db.query(                                 // 100 queries
    'SELECT * FROM wallet WHERE user_id = $1', [user.id]
  );
}
// Total: 101 database round-trips

// RIGHT: JOIN — 1 query, same result
const result = await db.query(`
  SELECT u.id, u.username, w.main_wallet
  FROM users u
  LEFT JOIN wallet w ON w.user_id = u.id
  LIMIT 100
`);
// Total: 1 database round-trip
```

### EXPLAIN ANALYZE — Your Most Important Debugging Tool

Before optimizing any slow query, run `EXPLAIN ANALYZE` to see what PostgreSQL is actually doing:

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.country, SUM(w.main_wallet)
FROM wallet w
JOIN users u ON u.id = w.user_id
GROUP BY u.country;
```

Read the output:
- `Seq Scan` → full table scan, likely needs an index
- `Index Scan` → good, using an index
- `Index Only Scan` → best, no table lookup needed
- `Nested Loop` on large tables → often a missing index
- `Hash Join` → usually efficient for large tables
- High `actual time` → the bottleneck step

### Pagination — Never Return Unbounded Results

```sql
-- WRONG: Returns ALL rows, kills memory on large tables
SELECT * FROM transactions WHERE user_id = 42;

-- WRONG: OFFSET-based pagination is slow at high page numbers
-- (PostgreSQL must scan and discard all previous rows)
SELECT * FROM transactions ORDER BY id LIMIT 25 OFFSET 50000;

-- RIGHT: Cursor-based pagination (Shopify, GitHub, Twitter all use this)
-- Uses the last seen ID as the cursor — O(log n) regardless of page depth
SELECT * FROM transactions
WHERE user_id = 42 AND id < :last_seen_id
ORDER BY id DESC
LIMIT 25;
```

### Aggregate with SQL, Not Application Code

```sql
-- Statistics computed entirely in the database:
SELECT
  status,
  COUNT(*) AS count,
  SUM(amount) AS total,
  AVG(amount) AS average,
  MIN(created_at) AS earliest,
  MAX(created_at) AS latest
FROM transactions
GROUP BY status;

-- Grouped deposits by currency in one query:
SELECT currency, SUM(amount_paid) AS total
FROM eversend_verifications
WHERE status = 'approved'
GROUP BY currency;
```

---

## 5. Connection Pooling

Every database connection consumes ~5–10MB of PostgreSQL working memory. If your app opens a new connection per request, 1,000 concurrent users = 1,000 connections = 5–10GB of RAM just for connections. This is what caused your memory exhaustion.

### PgBouncer (What Supabase Calls "Transaction Mode")

PgBouncer sits between your application and PostgreSQL. It maintains a small pool of real DB connections (e.g., 20) and multiplexes thousands of application requests through them.

```
Without pooling:
1000 users → 1000 DB connections → 10GB RAM on Postgres

With PgBouncer (transaction mode):
1000 users → PgBouncer pool of 20 → 200MB RAM on Postgres
```

**In Supabase**: Switch your connection string port from `5432` (direct) to `6543` (PgBouncer transaction mode) in your Project Settings → Database.

### Pooling Modes

| Mode | Connection Held | Best For |
|---|---|---|
| Session mode | Entire client session | Apps that use session-level features (prepared statements, temp tables) |
| Transaction mode | Duration of one transaction | Most web apps — highest concurrency |
| Statement mode | Duration of one statement | Rare edge cases |

### Application-Level Pool Configuration

```javascript
// Never open a new connection per request.
// Use a connection pool shared across your entire application.

import { Pool } from 'pg';

// Created ONCE when the process starts, reused for all requests
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,               // Max connections in pool (tune based on DB tier)
  idleTimeoutMillis: 30000,  // Close idle connections after 30s
  connectionTimeoutMillis: 2000,  // Fail fast if pool is exhausted
});

// Every request borrows from the pool and returns the connection automatically
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
```

---

## 6. Caching Architecture

The fastest query is the one that never hits the database. Caching is how systems go from 10,000 to 10,000,000 users with the same database.

### The Cache Hierarchy (Fastest to Slowest)

```
L1: In-process memory (nanoseconds)   → your Node.js stats cache
L2: Redis/Valkey (sub-millisecond)    → shared across all server instances
L3: PostgreSQL query cache (1-10ms)   → buffer pool, automatic
L4: Disk I/O (10-100ms)              → what happens on a cold cache
```

### L1: In-Process Memory Cache

For data that changes infrequently and is read by all users equally:

```typescript
// Simple TTL cache — what your stats endpoint now uses
interface CacheEntry<T> { data: T; expiresAt: number; }
const cache = new Map<string, CacheEntry<unknown>>();

function setCache<T>(key: string, data: T, ttlMs: number) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

function getCache<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.data;
}

// Usage in route handler:
const cached = getCache<Stats>('admin-stats');
if (cached) { res.json(cached); return; }
const stats = await computeStats();
setCache('admin-stats', stats, 60_000); // Cache 60 seconds
res.json(stats);
```

**Limitations**: Lost on server restart. Not shared between multiple server instances. Don't use for user-specific data (privacy risk).

### L2: Redis — The Industry Standard

Redis is an in-memory key-value store used by virtually every large-scale system. Shopify runs thousands of Redis instances. Amazon uses ElastiCache (managed Redis).

```typescript
import { createClient } from 'redis';
const redis = createClient({ url: process.env.REDIS_URL });

// Cache a user's wallet balance for 30 seconds
async function getWalletBalance(userId: number): Promise<number> {
  const key = `wallet:${userId}:balance`;

  // Try cache first
  const cached = await redis.get(key);
  if (cached !== null) return parseFloat(cached);

  // Cache miss — hit the DB
  const { data } = await supabase
    .from('wallet')
    .select('main_wallet')
    .eq('user_id', userId)
    .single();

  const balance = data?.main_wallet ?? 0;

  // Store in cache with 30-second TTL
  await redis.setEx(key, 30, String(balance));
  return balance;
}

// Invalidate when balance changes (cache-aside pattern)
async function creditWallet(userId: number, amount: number) {
  await supabase.rpc('credit_wallet', { p_user_id: userId, p_amount: amount });
  await redis.del(`wallet:${userId}:balance`); // Bust the cache
}
```

### Cache Patterns Used by Senior Engineers

**Cache-Aside (Lazy Loading)** — Application manages cache. Read from cache; on miss, load from DB and populate cache. Most common pattern. Used by most read-heavy endpoints.

**Write-Through** — On every write, update both DB and cache atomically. Cache is always warm. More complex but eliminates stale reads.

**Write-Behind (Write-Back)** — Write to cache first, DB asynchronously later. Fastest writes. Risk: data loss if cache crashes before DB is updated. Use only for non-critical data (view counts, etc.).

**Read-Through** — Cache sits in front of DB, application only talks to cache. Cache handles DB reads transparently.

### What to Cache and for How Long

| Data | TTL | Rationale |
|---|---|---|
| Platform-wide stats (dashboard) | 60–300s | Expensive to compute, acceptable staleness |
| User profile | 60s | Changes rarely, read constantly |
| Product/item lists | 5–30 min | Rarely changes |
| Exchange rates / bonus tables | 5–60 min | Changes infrequently |
| Wallet balance | Never cache / 5s max | Financial data must be accurate |
| Session data | Session lifetime | Must be server-side, not client |

### What NEVER to Cache

- Passwords or secrets of any kind
- Active session tokens (use Redis session store instead)
- Financial balances without extreme care (stale balance = wrong display or overdraft)
- Data that requires real-time accuracy (fraud signals, rate limit counters)

---

## 7. Read Replicas & Write Scaling

### The Read/Write Split

Most applications read data far more than they write it. A typical ratio is 90% reads, 10% writes.

```
Primary (master) database:
  - Handles ALL writes (INSERT, UPDATE, DELETE)
  - Keeps the authoritative copy of data

Read replicas (secondaries):
  - Receive a stream of changes from primary (replication)
  - Handle read queries (SELECT)
  - Can be scaled horizontally — add more replicas for more read capacity
  - Have slight replication lag (usually <100ms)
```

### Routing Queries to the Right Database

```typescript
// Write goes to primary
async function createUser(data: UserData) {
  return await primaryDb.query('INSERT INTO users ...', data);
}

// Read can go to replica (accept slight staleness)
async function getUserProfile(userId: number) {
  return await replicaDb.query('SELECT * FROM users WHERE id = $1', [userId]);
}

// CRITICAL: After a write, read from PRIMARY (not replica)
// to avoid reading stale data before replication catches up
async function withdrawAndConfirm(userId: number, amount: number) {
  await primaryDb.query('UPDATE wallet SET main_wallet = main_wallet - $1', [amount]);
  // Read the updated balance from primary, not replica
  return await primaryDb.query('SELECT main_wallet FROM wallet WHERE user_id = $1', [userId]);
}
```

**Supabase**: Read replicas are available on Pro and above plans.

---

## 8. Database Sharding & Partitioning

### Table Partitioning (Start Here — Before Sharding)

Partitioning splits one logical table into multiple physical tables based on a rule. PostgreSQL manages this transparently — queries still target the parent table.

**Range partitioning by date** (transactions table):
```sql
-- Instead of one massive transactions table, partition by month
CREATE TABLE transactions (
  id BIGSERIAL,
  user_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Each partition only holds that month's data
CREATE TABLE transactions_2025_01
  PARTITION OF transactions
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE transactions_2025_02
  PARTITION OF transactions
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Queries with date filters only scan the relevant partition
-- "SELECT * FROM transactions WHERE created_at > '2025-01-01'" 
-- only reads the January partition — massive performance gain
```

**Benefits**: 
- Queries with date ranges only scan relevant partitions
- Old partitions can be archived to cheaper storage
- DROP TABLE on a partition is instant (vs. DELETE which is slow)
- Indexes per partition are smaller and fit in memory better

### Sharding (After Partitioning, at Massive Scale)

Sharding splits data across multiple **separate database servers** based on a shard key.

```
Users 1–1,000,000    → Database Server A (Shard 0)
Users 1,000,001–2M   → Database Server B (Shard 1)
Users 2,000,001–3M   → Database Server C (Shard 2)
```

Shopify shards their database by shop ID. Each shop's data lives on one shard. Queries for a shop never touch other shards.

**When to shard**: When a single database server cannot handle the load even with all other optimizations applied. For 99% of startups, you never need sharding — optimize first.

**Sharding trade-offs**:
- Joins across shards are impossible at the DB level (must be done in application code)
- Distributed transactions are extremely complex
- Schema changes must be applied to every shard

---

## 9. Transactions & Concurrency Control

### The Race Condition Your Project Experienced

The duplicate wallet bug was a classic **TOCTOU race** (Time-Of-Check-Time-Of-Use):

```
Time →        Request A              Request B
T1:   SELECT wallet (returns row)
T2:                          SELECT wallet (returns row)
T3:   UPDATE wallet (succeeds)
T4:                          UPDATE wallet (succeeds but overwrites A's update!)
```

At T4, Request B overwrites A's change. If A was a +100 credit and B was a +200 credit, the final balance reflects only one of them. Money is lost.

### Optimistic Locking — Amazon's Preferred Pattern for Inventory

Optimistic locking detects conflicts at commit time rather than preventing them. Add a `version` column. Increment it on every update. A competing update will fail if the version changed:

```sql
ALTER TABLE wallet ADD COLUMN version INT NOT NULL DEFAULT 1;

-- Application reads the version
SELECT main_wallet, version FROM wallet WHERE user_id = 42;
-- Got: main_wallet=500, version=7

-- Application updates, asserting the version hasn't changed
UPDATE wallet
SET main_wallet = 600, version = 8
WHERE user_id = 42 AND version = 7;
-- Returns 0 rows updated if version changed (another request won the race)
-- Application retries from the read step
```

### Pessimistic Locking — `SELECT FOR UPDATE`

Lock the row when you read it so no other transaction can modify it until you commit:

```sql
BEGIN;
  -- Lock this specific row. Any other transaction trying to SELECT FOR UPDATE
  -- on the same row will WAIT here until this transaction commits.
  SELECT main_wallet FROM wallet WHERE user_id = 42 FOR UPDATE;

  -- Safe to read-modify-write — no other transaction can change this row
  UPDATE wallet SET main_wallet = main_wallet - 100 WHERE user_id = 42;
COMMIT;
-- Row lock is released here
```

**Use for**: Wallet debits (withdrawal must not go below zero), inventory decrements, seat reservations.

### Advisory Locks — Application-Level Mutex

PostgreSQL advisory locks let you create named locks not tied to any specific row:

```sql
-- Lock by user ID for any operation on that user's wallet
-- (useful when the wallet row might not exist yet)
SELECT pg_advisory_xact_lock(42);  -- Blocks until lock acquired
-- Now do your wallet operations safely
```

### Atomic Operations — The Gold Standard

The best concurrency fix is eliminating the read-modify-write cycle entirely. Use server-side arithmetic:

```sql
-- NOT safe (read-modify-write in application code):
balance = fetchBalance(userId)      -- read
newBalance = balance + amount       -- modify in app
updateBalance(userId, newBalance)   -- write

-- SAFE (atomic, happens in one uninterruptible DB operation):
UPDATE wallet
SET main_wallet = main_wallet + amount   -- add directly in DB
WHERE user_id = 42;
```

```sql
-- Upsert (atomic create-or-update) — eliminates check-then-insert:
INSERT INTO wallet (user_id, main_wallet, total_earned)
VALUES (42, 100, 100)
ON CONFLICT (user_id) DO UPDATE SET
  main_wallet  = wallet.main_wallet  + EXCLUDED.main_wallet,
  total_earned = wallet.total_earned + EXCLUDED.total_earned;
```

---

## 10. Rate Limiting

Rate limiting protects your system from abuse, bot attacks, and accidental DoS from clients with bugs.

### The Token Bucket Algorithm (Used by Amazon API Gateway)

Each user/IP has a "bucket" with a max capacity. Requests consume tokens. Tokens refill at a constant rate.

```
Bucket capacity: 10 requests
Refill rate: 2 requests/second

User makes 10 requests instantly: allowed (bucket empties)
User makes 11th request:          rejected (bucket empty)
5 seconds later:                  bucket has 10 tokens again
```

### Implementation with Redis

```typescript
async function checkRateLimit(
  identifier: string,  // user ID or IP
  limit: number,       // max requests
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `rate_limit:${identifier}`;
  const now = Date.now();

  const pipeline = redis.multi();
  pipeline.zRemRangeByScore(key, 0, now - windowSeconds * 1000);  // Remove old entries
  pipeline.zAdd(key, { score: now, value: String(now) });          // Add current request
  pipeline.zCard(key);                                              // Count in window
  pipeline.expire(key, windowSeconds);                              // Auto-cleanup

  const results = await pipeline.exec();
  const count = results[2] as number;

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt: Math.ceil(now / 1000) + windowSeconds,
  };
}
```

### Different Limits for Different Operations

Not all endpoints are equal. Apply tiered limits:

```typescript
const RATE_LIMITS = {
  // Expensive operations — very tight limits
  'POST /api/auth/login':      { limit: 5,   window: 60  },  // 5 per minute
  'POST /api/auth/register':   { limit: 3,   window: 3600 }, // 3 per hour per IP
  'POST /api/withdrawals':     { limit: 3,   window: 3600 }, // 3 per hour per user

  // Normal operations — moderate limits
  'GET /api/wallet':           { limit: 60,  window: 60  },  // 60 per minute
  'POST /api/tasks/:id/claim': { limit: 10,  window: 60  },  // 10 per minute

  // Light operations — relaxed limits
  'GET /api/products':         { limit: 120, window: 60  },  // 120 per minute
};
```

### Always Return Rate Limit Headers

```typescript
res.set({
  'X-RateLimit-Limit': limit,
  'X-RateLimit-Remaining': remaining,
  'X-RateLimit-Reset': resetAt,
  'Retry-After': remaining === 0 ? windowSeconds : undefined,
});

if (!allowed) {
  res.status(429).json({
    error: 'TooManyRequests',
    message: `Rate limit exceeded. Try again in ${windowSeconds} seconds.`
  });
}
```

---

## 11. Load Balancing

### What Load Balancing Is

A load balancer sits in front of multiple server instances and distributes incoming requests among them. This lets you scale horizontally (more server instances) instead of vertically (bigger single server).

```
Users → Load Balancer → [Server 1]
                      → [Server 2]
                      → [Server 3]
                      → [Server N]
```

### Load Balancing Algorithms

**Round Robin**: Requests are sent to each server in turn (1,2,3,1,2,3...). Simple and fair. Default for most load balancers.

**Least Connections**: New request goes to the server with the fewest active connections. Better when requests have variable processing time.

**IP Hash**: The same client IP always goes to the same server. Useful for server-side session state (though you should use Redis-based sessions instead).

**Weighted Round Robin**: Some servers get more traffic than others (e.g., if they have more CPU/RAM).

### Session State in a Load-Balanced World

If Server 1 stores a user's session in local memory, and the next request goes to Server 2, the session is gone. **Never store session state in application process memory** if you're behind a load balancer.

```typescript
// WRONG: Session stored in process memory. Breaks with multiple servers.
app.use(session({ store: new MemoryStore() }));

// RIGHT: Session stored in Redis. Works with any number of servers.
import RedisStore from 'connect-redis';
app.use(session({
  store: new RedisStore({ client: redis }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,      // HTTPS only
    httpOnly: true,    // Not accessible by JavaScript
    sameSite: 'strict', // CSRF protection
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
  }
}));
```

### Health Checks

Load balancers continuously check server health. A server that fails its health check is removed from rotation until it recovers:

```typescript
// Every server must expose a health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Verify DB connectivity
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', uptime: process.uptime() });
  } catch {
    res.status(503).json({ status: 'unhealthy' });
  }
});
```

---

## 12. API Security & Hardening

### Input Validation — Trust Nothing

Every piece of data that comes from a client is untrusted. Validate type, format, range, and content before it touches your database.

```typescript
import { z } from 'zod';

// Define the exact shape of valid input
const WithdrawalSchema = z.object({
  amount: z.number().positive().max(100000),  // Must be positive, capped
  phoneNumber: z.string().regex(/^\+?[0-9]{10,15}$/),  // E.164 format
  pin: z.string().length(4).regex(/^\d+$/)   // 4 digits exactly
});

router.post('/withdrawals', async (req, res) => {
  const result = WithdrawalSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'ValidationError', details: result.error.issues });
    return;
  }
  // result.data is now type-safe and validated
  const { amount, phoneNumber, pin } = result.data;
});
```

### SQL Injection Prevention

Never concatenate user input into SQL strings. Always use parameterized queries:

```typescript
// CRITICALLY WRONG — SQL injection vulnerability
const userId = req.params.id;  // Attacker sends: "1; DROP TABLE users; --"
await db.query(`SELECT * FROM users WHERE id = ${userId}`);
// The query becomes: SELECT * FROM users WHERE id = 1; DROP TABLE users; --
// Your users table is now gone.

// CORRECT — parameterized query; user input never interpreted as SQL
await db.query('SELECT * FROM users WHERE id = $1', [userId]);
// The $1 is always treated as a data value, never as SQL code
```

### Helmet — HTTP Security Headers

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

### CORS — Lock Down Your API

```typescript
import cors from 'cors';

app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      'https://yourproductiondomain.com',
      process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : null,
    ].filter(Boolean);

    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,  // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

### Never Expose Internal Details in Error Responses

```typescript
// WRONG: Leaks stack trace, internal paths, DB schema
res.status(500).json({ error: error.message, stack: error.stack });
// Client sees: "column 'password_hash' does not exist in table 'admin_users'"

// RIGHT: Generic error to client, full details in server logs only
req.log.error({ err: error, userId: req.session.userId }, 'Database error');
res.status(500).json({
  error: 'ServerError',
  message: 'An internal error occurred. Reference: ' + requestId
});
```

### Environment Variable Discipline

```bash
# .env.example — committed to git (no secrets)
DATABASE_URL=
REDIS_URL=
SESSION_SECRET=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_SECRET=   # Never commit this value

# .env — NEVER committed to git
# .gitignore must contain: .env
```

```typescript
// Validate required env vars at startup — fail fast rather than serving broken requests
const required = ['DATABASE_URL', 'SESSION_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`FATAL: Missing required environment variable: ${key}`);
    process.exit(1);
  }
}
```

---

## 13. Authentication at Scale

### Password Storage — The Only Correct Way

```typescript
import bcrypt from 'bcryptjs';

// Registration: always hash before storing
const SALT_ROUNDS = 12;  // 2^12 iterations — slow by design, resists brute force
const hash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
await db.query('INSERT INTO users (email, password_hash) VALUES ($1, $2)', [email, hash]);

// Login: compare with constant-time function (prevents timing attacks)
const isValid = await bcrypt.compare(plainPassword, storedHash);
// NEVER: storedHash === hashedPassword — not constant-time, timing attack possible
// NEVER: store plain text passwords
// NEVER: use MD5 or SHA1 for passwords (not salted, too fast to brute-force)
```

### Session Security

```typescript
// Session configuration that senior engineers use in production:
app.use(session({
  name: '__Host-sid',  // __Host- prefix prevents subomain attacks
  secret: [
    process.env.SESSION_SECRET_CURRENT,   // Current secret
    process.env.SESSION_SECRET_PREVIOUS,  // Previous secret (rotation support)
  ],
  resave: false,
  saveUninitialized: false,
  rolling: true,  // Reset expiry on each request (keeps active users logged in)
  cookie: {
    secure: process.env.NODE_ENV === 'production',  // HTTPS only in prod
    httpOnly: true,   // JavaScript cannot access this cookie — prevents XSS theft
    sameSite: 'strict',  // Only sent on same-site requests — prevents CSRF
    maxAge: 24 * 60 * 60 * 1000,  // 24 hours (not a year — security tradeoff)
    path: '/',
  },
}));
```

### JWT Considerations

JWTs are stateless tokens — the server doesn't need to check a database to validate them. However:

**Advantages**: Stateless, works across services, no session store needed
**Disadvantages**: Cannot be invalidated before expiry. If stolen, attacker has access until expiry.

For financial applications: **use server-side sessions** (stored in Redis). They can be invalidated instantly on logout or security event. JWTs are preferred for microservices and public APIs.

### Admin Authentication Separate from User Authentication

Never mix admin and user auth. Use entirely separate tables, sessions, and middleware:

```typescript
// Admin middleware reads from session.adminId (set at admin login)
// User middleware reads from session.userId (set at user login)
// An admin session CANNOT access user-only routes and vice versa

function requireAdmin(req, res, next) {
  if (!req.session.adminId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

function requireUser(req, res, next) {
  if (!req.session.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}
```

---

## 14. Monitoring, Alerting & Observability

### The Three Pillars of Observability

**Metrics** — Numbers over time. CPU, memory, request rate, error rate, DB connections, cache hit rate, query latency. Use Prometheus + Grafana, or Datadog.

**Logs** — Structured events. Every request, every error, every significant operation. Use structured JSON logs, never `console.log`.

**Traces** — Request flow through your system. Shows which function was slow, which DB query caused the slowdown. Use OpenTelemetry, Jaeger, or Datadog APM.

### Structured Logging

```typescript
// WRONG — unstructured, impossible to query programmatically
console.log('User 42 made a withdrawal of $100');

// RIGHT — structured JSON that log aggregators can search and alert on
req.log.info({
  event: 'withdrawal_initiated',
  userId: 42,
  amount: 100,
  currency: 'KES',
  phoneNumber: '+254...',
  requestId: req.id,
}, 'Withdrawal request received');

// Can now query: event="withdrawal_initiated" AND amount > 10000
// Can build: dashboards of withdrawal volumes per currency
// Can alert: error rate > 1% over 5 minutes
```

### Key Metrics to Track

```typescript
// Request metrics (expose to Prometheus)
const requestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
});

// Database metrics
const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration',
  labelNames: ['query_name'],
});

// Business metrics
const withdrawalTotal = new Counter({
  name: 'withdrawals_total',
  help: 'Total number of withdrawal requests',
  labelNames: ['status', 'currency'],
});
```

### Alerts to Configure

| Alert | Condition | Urgency |
|---|---|---|
| High error rate | 5xx errors > 1% over 5min | Critical — wake someone up |
| Slow DB queries | P99 latency > 1s | High |
| DB connection pool exhausted | Pool at max capacity | High |
| Disk space low | > 80% full | Medium |
| Failed login spike | > 10x normal rate | High — possible attack |
| Negative wallet balance | Any row with main_wallet < 0 | Critical — financial integrity |
| Duplicate wallet detected | count(*) > 1 per user_id | Critical — data integrity |
| Cache hit rate low | Hit rate < 80% | Medium |

### The Dashboard Every Senior Engineer Builds First

1. **Request rate** (requests/second, by endpoint)
2. **Error rate** (4xx, 5xx percentages)
3. **Response time** (P50, P95, P99 latencies)
4. **DB connection pool** (active, idle, waiting)
5. **Cache hit rate** (Redis or in-process)
6. **Active DB queries** (any query running > 1s is shown)
7. **Business metrics** (registrations/hour, deposits/hour, withdrawals pending)

---

## 15. Backup, Recovery & Data Durability

### The 3-2-1 Backup Rule

- **3** copies of data
- **2** on different storage media
- **1** offsite (different geographic region)

### Point-in-Time Recovery (PITR)

PostgreSQL WAL (Write-Ahead Log) enables PITR — restoring your database to any exact moment in the past, not just the last backup snapshot.

If you accidentally `DELETE FROM users WHERE 1=1` at 14:23:47, PITR lets you restore to 14:23:46.

**Supabase**: PITR is included on Pro plans. Enable it.

### Backup Testing — The Most Neglected Practice

A backup you've never tested is not a backup. Every large engineering team runs scheduled **restore drills**:

```
Monthly restore test:
1. Take latest backup
2. Restore to separate database instance
3. Run integrity checks (row counts match, foreign keys valid, sample queries correct)
4. Verify the restore completed within your Recovery Time Objective (RTO)
5. Document the test result

If you cannot restore from your backup in under your RTO, your backup strategy has failed.
```

### Recovery Objectives

| Term | Definition | Example |
|---|---|---|
| RTO (Recovery Time Objective) | Max acceptable downtime | "We must be back online within 2 hours" |
| RPO (Recovery Point Objective) | Max acceptable data loss | "We can lose at most 5 minutes of data" |

Financial systems typically require RPO < 1 minute (continuous WAL archiving).

---

## 16. Migration Strategy at Scale

### Never Lock Tables in Production

`ALTER TABLE` on a table with millions of rows acquires an exclusive lock. Every query to that table waits. At scale, this causes downtime.

```sql
-- DANGEROUS on large tables — takes an exclusive lock for the duration
ALTER TABLE transactions ADD COLUMN currency TEXT;

-- SAFE: Adding a nullable column is instant in PostgreSQL 11+
ALTER TABLE transactions ADD COLUMN currency TEXT;  -- Fast — no lock in PG11+
ALTER TABLE transactions ADD COLUMN currency TEXT NOT NULL DEFAULT 'KES';  -- Requires rewrite on older versions

-- For non-nullable columns on large tables:
-- 1. Add as nullable
ALTER TABLE transactions ADD COLUMN currency TEXT;
-- 2. Backfill asynchronously (in batches, not all at once)
UPDATE transactions SET currency = 'KES' WHERE currency IS NULL LIMIT 10000;
-- ... repeat until done
-- 3. Add NOT NULL constraint once backfill is complete
ALTER TABLE transactions ALTER COLUMN currency SET NOT NULL;
```

### Expand/Contract Pattern

The safe way to rename a column across a system with millions of users:

```
Step 1 (Expand):   Add new column, write to both old and new
Step 2 (Migrate):  Backfill new column from old column
Step 3 (Contract): Read from new column only, then drop old column

Never: Rename column directly — breaks all queries using the old name simultaneously
```

### Zero-Downtime Deployment Checklist

Before every schema migration:
1. Can the migration be rolled back without data loss?
2. Does it acquire a lock that will block production queries?
3. Will it run in under 1 second on the current table size?
4. Have you tested it on a database with production-scale data volume?
5. Is there a rollback plan if the deployment fails mid-migration?

---

## 17. CAP Theorem & Distributed Systems

### The CAP Theorem

In a distributed system, you can guarantee at most **2 of these 3**:

- **C — Consistency**: Every read returns the most recent write
- **A — Availability**: Every request receives a response (not necessarily the latest data)
- **P — Partition Tolerance**: The system continues operating when network messages are lost

Since network partitions (P) are inevitable in real systems, the real trade-off is **CP vs. AP**:

**CP systems** (PostgreSQL, HBase): Choose consistency over availability. During a network partition, the system may reject requests rather than return stale data. Use for financial systems.

**AP systems** (Cassandra, DynamoDB in certain modes): Choose availability over consistency. During a partition, serve potentially stale data. Use for user feeds, view counts, non-critical data.

### Eventual Consistency

In distributed systems, data often becomes consistent eventually rather than immediately. Your wallet balance across a CDN might be 5 seconds stale. This is acceptable for display purposes but not for the authoritative transaction processing.

### The PACELC Extension

In practice: even without a partition, you're trading **latency vs. consistency**. A linearizable (strongly consistent) operation requires coordination between nodes → higher latency. Systems like Spanner (Google) and CockroachDB achieve global consistency but at higher latency cost.

---

## 18. Event-Driven Architecture

### Why Events Scale Better Than Synchronous Calls

In synchronous architecture, every action blocks until it completes:
```
User deposits → activate user → send email → give referral bonus → respond to user
Total time: sum of all operations (potentially seconds)
```

In event-driven architecture, operations are decoupled:
```
User deposits → record deposit → respond immediately (fast)
                    ↓
              Queue event: "user_deposited"
                    ↓ (asynchronously, in background)
              Worker: activate user
              Worker: send welcome email
              Worker: credit referral bonuses
              Worker: log audit trail
```

### Message Queue Patterns

```typescript
// Producer: emit an event and continue immediately
await messageQueue.publish('user.activated', {
  userId: 42,
  activatedAt: new Date().toISOString(),
  referredBy: 17,
});
res.json({ message: 'Activated' });  // Responds before any side effects run

// Consumer: process events asynchronously, with retry on failure
messageQueue.subscribe('user.activated', async (event) => {
  const { userId, referredBy } = event;
  await triggerReferralBonus(userId);
  await sendWelcomeEmail(userId);
});
```

### Idempotency — Events Must Be Safe to Replay

Message queues deliver messages at least once. On failure, they retry. Your consumer must handle receiving the same event multiple times:

```sql
-- Track which events have been processed
CREATE TABLE processed_events (
  event_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Consumer checks before processing:
BEGIN;
  INSERT INTO processed_events (event_id) VALUES ($1)
  ON CONFLICT DO NOTHING
  RETURNING event_id;
  -- If nothing returned, event was already processed — skip
  -- If event_id returned, process it now and commit
COMMIT;
```

---

## 19. API Design Principles

### Versioning

```
/api/v1/users    ← current stable version
/api/v2/users    ← new version with breaking changes
```

Never remove an API version while clients are using it. Support at least 2 versions concurrently.

### Idempotency Keys for Financial Operations

Any operation that moves money must be idempotent — calling it twice with the same intent must produce the same result, not charge twice:

```typescript
// Client generates a unique key per intended operation
// POST /api/withdrawals
// Headers: Idempotency-Key: uuid-per-withdrawal-attempt

router.post('/withdrawals', async (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey) {
    res.status(400).json({ error: 'Idempotency-Key header required' });
    return;
  }

  // Check if we've seen this key before
  const existing = await redis.get(`idem:${idempotencyKey}`);
  if (existing) {
    res.json(JSON.parse(existing));  // Return cached response
    return;
  }

  // Process withdrawal...
  const result = await processWithdrawal(req.body);

  // Cache result for 24 hours
  await redis.setEx(`idem:${idempotencyKey}`, 86400, JSON.stringify(result));
  res.json(result);
});
```

### Response Envelope Pattern

```typescript
// Consistent response shape everywhere
// Success:
{ "data": { ... }, "meta": { "page": 1, "total": 500 } }

// Error:
{ "error": "ValidationError", "message": "Amount must be positive", "code": "INVALID_AMOUNT" }

// Never mix these shapes — clients should know exactly what to expect
```

---

## 20. Infrastructure & Deployment

### The 12-Factor App (Heroku's Principles, Followed by Every Large Company)

1. **Codebase**: One repo, deployed to many environments
2. **Dependencies**: Explicitly declared, never rely on system-wide installs
3. **Config**: Environment variables, never hardcoded values in code
4. **Backing services**: Database, Redis, email — treated as attached resources (swappable)
5. **Build/release/run**: Strict separation of build step from run step
6. **Processes**: Stateless processes — no local state, store everything externally
7. **Port binding**: Self-contained, bind to a port from environment variable
8. **Concurrency**: Scale out by running more processes, not bigger processes
9. **Disposability**: Fast startup, graceful shutdown (handle SIGTERM)
10. **Dev/prod parity**: Development environment mirrors production
11. **Logs**: Write to stdout, let infrastructure handle aggregation
12. **Admin processes**: Run one-off tasks (migrations, scripts) in same environment as app

### Graceful Shutdown

```typescript
// Handle SIGTERM (sent by process managers on deployment or scale-down)
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');

  // Stop accepting new connections
  server.close(async () => {
    // Wait for in-flight requests to complete
    // Close DB connections cleanly
    await pool.end();
    await redis.quit();
    logger.info('Shutdown complete');
    process.exit(0);
  });

  // Force shutdown after 30s if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
});
```

### Blue-Green Deployments

```
Blue environment (current production):
  - Serving 100% of traffic
  - Database migration runs against shared DB

Green environment (new version):
  - Deployed and tested
  - Not yet receiving traffic

Switch:
  - Load balancer routes all traffic to Green
  - Blue stays running briefly for instant rollback

Rollback (if Green fails):
  - Load balancer switches back to Blue instantly
  - No database changes needed (schema changes must be backwards-compatible)
```

---

## 21. The Senior Engineer Mindset

### Design for Failure

Systems will fail. Hardware fails. Networks partition. Third-party APIs go down. Design every component assuming every other component will fail:

- **Timeouts**: Every external call (DB, Redis, payment API) must have a timeout. Without timeouts, one slow dependency can hold connections indefinitely and cascade into a full system outage.
- **Circuit Breakers**: If a service is failing repeatedly, stop calling it for a period. Don't keep hammering a failing service.
- **Retries with exponential backoff**: On transient failures, retry. But add jitter (randomness) to retry delays — if all 1,000 servers retry at the same instant, you'll DDOS your own dependency.
- **Graceful degradation**: If Redis is down, serve slightly stale data from memory instead of failing entirely. If the email service is down, queue the email and process it when the service recovers.

### The DRY Principle Applied to Data

Don't store the same data in two places without a clear sync strategy. Denormalized caches (like your wallet table) are acceptable, but they must ALWAYS be updated atomically with the source of truth (transactions table). If they drift, you have a data integrity bug.

### Measure Everything, Assume Nothing

The number one mistake junior engineers make is optimizing based on intuition. Senior engineers measure first:

1. **Profile before optimizing** — find the actual bottleneck with `EXPLAIN ANALYZE`, not guessing
2. **A/B test changes** — verify that your optimization actually improved things
3. **Set a baseline** — you can't measure improvement without knowing where you started
4. **Benchmark at scale** — test with production data volumes, not 100-row test data

### Security is Not an Add-On

The cost to fix a security vulnerability scales exponentially with how late it's found:
- Found in code review: 1 hour to fix
- Found in testing: 1 day to fix
- Found in production: weeks of incident response, potentially irreversible damage (user data breach, financial loss)

Build security in from day 1: parameterized queries, env vars for secrets, input validation, HTTPS everywhere, proper password hashing, audit logs.

### The Operational Burden of Complexity

Shopify's principle: **"The best code is no code. The second best is simple code."**

Every distributed system component you add (Redis, message queues, additional microservices) is another system that can fail, that needs monitoring, that needs operational knowledge to maintain. Start simple, measure the pain, add complexity only when the measurement justifies it.

For most startups at 5,000–100,000 users: one well-optimized PostgreSQL database, one application server, a CDN, and Redis for sessions and caching is enough. Shopify ran on a monolith until millions of shops.

---

## QUICK REFERENCE CHECKLIST

Copy this checklist for every new project:

### Schema
- [ ] Primary keys on every table
- [ ] `TIMESTAMPTZ` not `TIMESTAMP` for all date columns
- [ ] `DECIMAL` not `FLOAT` for money
- [ ] Foreign key constraints defined
- [ ] NOT NULL on required columns
- [ ] UNIQUE constraints on user_id in dependent tables (wallet, etc.)
- [ ] CHECK constraints for value ranges
- [ ] `deleted_at` column for soft deletes on critical tables

### Indexes
- [ ] Every foreign key column has an index
- [ ] Every WHERE/ORDER BY column has an index
- [ ] Composite index for (type, status) filter pairs
- [ ] Partial indexes for pending/active status filters
- [ ] `EXPLAIN ANALYZE` run on all frequent queries

### Application Code
- [ ] Parameterized queries everywhere (no string concatenation)
- [ ] Input validation with Zod/Joi on every endpoint
- [ ] Aggregations computed in DB, not in application code
- [ ] Pagination on all list endpoints (no unbounded queries)
- [ ] No N+1 query patterns
- [ ] Transactions wrap all multi-step operations
- [ ] Atomic upserts for create-or-update operations
- [ ] Connection pool configured and reused across requests

### Security
- [ ] Passwords hashed with bcrypt (cost ≥ 12)
- [ ] Sessions stored in Redis, not process memory
- [ ] Cookies: secure, httpOnly, sameSite=strict
- [ ] CORS restricted to known origins
- [ ] Helmet middleware configured
- [ ] Rate limiting on all public endpoints (aggressive on auth)
- [ ] No internal details in error responses
- [ ] All secrets in environment variables, never in code
- [ ] Audit log for all admin actions

### Operations
- [ ] Structured JSON logging (no console.log)
- [ ] Health check endpoint
- [ ] Graceful shutdown handling
- [ ] Metrics exposed for key operations
- [ ] Alerts configured for error rate, latency, disk space
- [ ] Backups verified by restore testing
- [ ] Database migrations tested on production-volume data

---

*This playbook covers the fundamentals that distinguish systems built to last from systems built to be rewritten. The engineers at Amazon and Shopify are not doing anything magical — they are applying these principles consistently, at every level, from the first line of code.*
