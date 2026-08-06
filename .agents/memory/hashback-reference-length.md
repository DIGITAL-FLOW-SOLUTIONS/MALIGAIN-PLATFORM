---
name: Hashback reference length
description: Reference format required to correlate Hashback callbacks with stored transactions
---

Hashback callback correlation depends on the exact `TransactionReference` matching the reference stored when payment setup is created. Hashback truncates longer references, so use the compact `MUL-<userId>-<timestamp>` format for Hashback activation, investment, and spin payments.

**Why:** A longer application-generated reference reached Hashback successfully but came back truncated in the callback, causing the production API lookup to return no matching transaction.

**How to apply:** Keep the same compact reference in the Hashback setup payload, stored transaction description, payment-status URL, and callback lookup. Do not loosen matching to a broad user or prefix-only lookup.