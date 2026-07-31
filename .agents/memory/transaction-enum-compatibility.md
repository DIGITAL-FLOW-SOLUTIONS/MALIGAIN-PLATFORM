---
name: Transaction enum compatibility
description: A live database/schema mismatch around referral transaction types that can break dashboard and bonus flows.
---

The live transactions enum accepts `referral`, not `referral_bonus`. Referral-bonus writers, filters, and aggregate queries must use the database's accepted enum value.

**Why:** The imported app contained code and UI using `referral_bonus`, but the connected database rejected that value and caused referral stats to return HTTP 500.

**How to apply:** When adding or changing referral credit flows, verify the live enum/schema before choosing transaction types, and keep API writers, queries, and admin filters aligned.