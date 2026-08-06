---
name: Kenya manual payment visibility
description: Runtime control for showing or hiding the Kenya manual M-Pesa Till activation option
---

The Kenya manual M-Pesa Till method is controlled by the `kenya_manual_payment_enabled` row in `app_settings`. The public Kenya settings response exposes the flag, and missing or invalid values default to visible for backward compatibility.

**Why:** Admins need to switch the manual option off while retaining the selected automatic provider, without redeploying the frontends.

**How to apply:** Keep automatic PayHero or Hashback as the first activation action. Hide the manual button when false and guard direct access to the manual-payment page with the same setting.