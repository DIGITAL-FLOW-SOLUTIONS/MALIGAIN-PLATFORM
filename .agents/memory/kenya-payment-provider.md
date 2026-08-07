---
name: Kenya automatic payment provider
description: The runtime rule for selecting Kenya's automatic activation payment provider.
---

The Kenya automatic activation provider is controlled by the `kenya_payment_provider` row in `app_settings`. Valid values are `PAYHERO` and `HASHBACK`; missing or invalid values must fail safe to PayHero. Kenya investment payments intentionally always use PayHero and are independent of this activation setting. The server enforces the selected provider on activation endpoints, so stale activation pages cannot bypass an admin switch.

**Why:** The admin needs to change providers immediately without redeploying, while PayHero must remain the safe default if the setting is absent or malformed.

**How to apply:** Keep manual Till activation independent of this setting. Treat activation and investment payment provider selection as separate business rules: activation reads the setting, while Kenya investments use PayHero.