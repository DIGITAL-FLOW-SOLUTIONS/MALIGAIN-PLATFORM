---
name: Kenya automatic payment provider
description: The runtime rule for selecting Kenya's automatic activation payment provider.
---

The Kenya automatic activation provider is controlled by the `kenya_payment_provider` row in `app_settings`. Valid values are `PAYHERO` and `HASHBACK`; missing or invalid values must fail safe to PayHero. The server enforces the selected provider on both automatic activation endpoints, so stale user pages cannot bypass an admin switch.

**Why:** The admin needs to change providers immediately without redeploying, while PayHero must remain the safe default if the setting is absent or malformed.

**How to apply:** Keep manual Till activation independent of this setting. Any new Kenya automatic-payment entry point must read and enforce the same setting.