---
name: Withdrawal rules authority
description: Country-specific withdrawal minimums, charges, currencies, and compatibility behavior
---

The withdrawal minimum, service charge, and currency must come from one authoritative country-rule table shared by API validation, user-facing display, and withdrawal notifications. Congo must continue accepting the existing `CG` code; `CD` is an equivalent compatibility alias and uses CDF.

**Why:** Previously duplicated and incomplete tables allowed the UI, API, and admin messages to disagree, including incorrect minimums and charges for several supported countries.

**How to apply:** When adding or changing a withdrawal country rule, update the shared table and its public read endpoint, then verify the withdrawal UI, server validation, admin/email currency display, and any country-code aliases together.