---
name: Payment settlement atomicity
description: Rules for safely settling automatic Kenya and Cameroon payments.
---

Provider callbacks must lock the pending transaction and update the related account state in the same database transaction; completion is the idempotency boundary. Balance credits, investment activation, and transaction completion must commit together or roll back together.

**Why:** A callback can be retried or arrive concurrently, and separate provider/API writes can otherwise double-credit spin balances or leave an active investment with a pending transaction.

**How to apply:** Use a PostgreSQL row lock on the transaction, return success immediately for already-completed rows, and emit non-critical events only after commit. When setup creates a pending investment before provider initiation, cancel it if transaction creation or provider initiation fails.