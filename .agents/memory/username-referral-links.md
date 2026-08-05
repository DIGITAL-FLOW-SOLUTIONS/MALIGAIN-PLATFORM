---
name: Username referral links
description: Referral URLs use unique usernames while legacy referral codes remain accepted
---

New referral links should use the referrer's unique username as the `ref` value. Registration must continue accepting both usernames and historical referral codes, resolving either to the same `referred_by` user ID.

**Why:** This changes the public link identifier without changing the stored referral relationship, referral tree, or bonus payment history.

**How to apply:** Keep `referral_code` as a compatibility field unless a separately approved data migration removes it; never derive bonus or tree relationships from the URL after registration.