---
name: SoleasPay Cameroon payment
description: Cameroon automatic XAF activation and recharge use SoleasPay agent Pay-In with a signed callback.
---

SoleasPay Cameroon payments use the agent Pay-In endpoint with `x-api-key`, operation 2, and the selected MTN or Orange service. Callback delivery is registered at `/soleaspaycallback` and must validate `x-private-key` as the SHA-512 hash of the configured callback secret before matching the order reference, amount, currency, and user country.

**Why:** SoleasPay separates agent requests authenticated by API key from action requests authenticated by bearer token, while callback authenticity is independent of the Pay-In request credential.

**How to apply:** Keep XAF as the server-owned payment currency, preserve Eversend manual verification as a fallback, and keep the callback path in API artifact routing so production traffic reaches the raw-body signature handler.