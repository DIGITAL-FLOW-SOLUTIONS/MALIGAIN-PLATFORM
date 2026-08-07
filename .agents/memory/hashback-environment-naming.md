---
name: Hashback environment naming
description: The required runtime naming for Hashback credentials and the expected failure mode when they are absent.
---

Hashback setup reads the account ID and API key from lowercase environment names: `hashback_account_id` and `hashback_api_key`. The workspace may have similarly named uppercase payment secrets for other providers, but those do not satisfy the Hashback integration.

**Why:** The app previously surfaced “Hashback payment is not configured” because the runtime had no Hashback-specific account/API credentials; silently reusing unrelated uppercase secrets would risk sending invalid credentials to a payment provider.

**How to apply:** Keep the explicit configuration error until the Hashback-specific secrets are added through the secure environment-secrets flow. Do not print or copy secret values, and do not treat PayHero or M-Pesa credentials as Hashback credentials.