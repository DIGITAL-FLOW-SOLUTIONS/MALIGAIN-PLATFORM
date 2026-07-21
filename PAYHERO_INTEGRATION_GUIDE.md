# PayHero M-Pesa STK Push — Integration Guide

Complete, production-tested guide for integrating PayHero into a Node.js / Express + Supabase app.
Every pattern here is extracted from a working implementation — no guesswork.

---

## Table of Contents

1. [What PayHero Does](#1-what-payhero-does)
2. [Environment Variables](#2-environment-variables)
3. [The PayHero Helper Library](#3-the-payhero-helper-library)
4. [Database Setup](#4-database-setup)
5. [Initiating an STK Push](#5-initiating-an-stk-push)
6. [Mounting the Callback Route](#6-mounting-the-callback-route)
7. [The Callback Handler](#7-the-callback-handler)
8. [The Status-Poll Endpoint](#8-the-status-poll-endpoint)
9. [Frontend Polling Pattern](#9-frontend-polling-pattern)
10. [ExternalReference & Description Conventions](#10-externalreference--description-conventions)
11. [Idempotency & Duplicate Callbacks](#11-idempotency--duplicate-callbacks)
12. [Error Handling Rules](#12-error-handling-rules)
13. [Environment Setup Checklist](#13-environment-setup-checklist)

---

## 1. What PayHero Does

PayHero is a Kenyan payment gateway that wraps the M-Pesa STK Push API.

Flow:
```
Your server  ──POST /api/v2/payments──▶  PayHero
                                             │
                                     Sends STK prompt to user's phone
                                             │
             User enters PIN on phone        │
                                             │
PayHero  ──POST {your_callback_url}──▶  Your server
             (tells you success or failure)
```

Your server never calls M-Pesa directly. You talk only to PayHero.

---

## 2. Environment Variables

Set these in your `.env` / secrets manager:

| Variable                  | Description                                                              |
|---------------------------|--------------------------------------------------------------------------|
| `PAYHERO_Channel_ID`      | Integer channel ID from your PayHero dashboard                           |
| `PAYHERO_API_username`    | API username from your PayHero dashboard                                 |
| `PAYHERO_API_password`    | API password from your PayHero dashboard                                 |
| `PAYHERO_Basic_Auth_token`| Pre-built base64 token (fallback — used only if username/password absent)|

**Auth priority**: If `username` + `password` are both set, the code builds `base64(username:password)` at
runtime (most reliable). The pre-built token is the fallback for environments where you only have the token.

---

## 3. The PayHero Helper Library

Create `src/lib/payhero.ts`:

```typescript
// ─── Config ──────────────────────────────────────────────────────────────────
const PAYHERO_CHANNEL_ID = parseInt(process.env["PAYHERO_Channel_ID"] ?? "0", 10);

function getPayHeroAuth(): string {
  const username = process.env["PAYHERO_API_username"];
  const password = process.env["PAYHERO_API_password"];
  if (username && password) {
    return Buffer.from(`${username}:${password}`).toString("base64");
  }
  // Fallback: pre-built base64 token from the PayHero dashboard
  return process.env["PAYHERO_Basic_Auth_token"] ?? "";
}

// ─── Phone normalizer (Kenyan numbers → E.164) ───────────────────────────────
// Accepts any of: 0712345678 / 254712345678 / +254712345678
export function normalizePhone(phone: string): string {
  let p = phone.replace(/\s+/g, "").replace(/^\+/, "");
  if (p.startsWith("0")) p = "254" + p.slice(1);
  if (!p.startsWith("254")) p = "254" + p;
  return "+" + p;
}

// ─── STK Push result shape ────────────────────────────────────────────────────
export interface PayHeroSTKResult {
  success: boolean;
  status: string;
  reference: string;
  CheckoutRequestID: string; // use this as your stable payment token
  errorMessage?: string;
  error?: string;
}

// ─── Initiate STK Push ────────────────────────────────────────────────────────
export async function initiateSTKPush(params: {
  phoneNumber: string;     // raw user input — will be normalised
  amount: number;          // always floored to integer (M-Pesa requirement)
  externalReference: string; // YOUR stable ID — see Section 10
  callbackUrl: string;       // where PayHero will POST the result
}): Promise<PayHeroSTKResult> {
  const body = {
    amount: Math.floor(params.amount),
    phone_number: normalizePhone(params.phoneNumber),
    channel_id: PAYHERO_CHANNEL_ID,
    provider: "m-pesa",
    external_reference: params.externalReference,
    callback_url: params.callbackUrl,
  };

  const res = await fetch("https://backend.payhero.co.ke/api/v2/payments", {
    method: "POST",
    headers: {
      Authorization: `Basic ${getPayHeroAuth()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    return {
      success: false,
      status: "FAILED",
      reference: "",
      CheckoutRequestID: "",
      error: `PayHero API error ${res.status}: ${text}`,
    };
  }

  return (await res.json()) as PayHeroSTKResult;
}

// ─── Optional: random amount jitter ──────────────────────────────────────────
// Useful when you need each STK request to have a unique amount so
// users can identify which phone prompt to accept.
export function randomActivationAmount(
  base: number,
  minOffset = -1,
  maxOffset = 4,
): number {
  const offset = Math.floor(Math.random() * (maxOffset - minOffset + 1)) + minOffset;
  return base + offset;
}
```

---

## 4. Database Setup

You need a `transactions` table. Minimum required columns:

```sql
CREATE TABLE transactions (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id),
  type        TEXT NOT NULL,          -- 'recharge' | 'withdrawal' | 'bonus' | etc.
  amount      NUMERIC(12, 2) NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'completed' | 'failed'
  description TEXT,                   -- PAYHERO:{CheckoutRequestID}:{txnType}
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

**The `description` column is critical.** The callback handler uses it to look up the right transaction.
See [Section 10](#10-externalreference--description-conventions) for the exact format.

---

## 5. Initiating an STK Push

In any route handler that needs to charge the user:

```typescript
import { initiateSTKPush } from "../lib/payhero";

router.post("/some-payment", async (req, res) => {
  const userId = req.session.userId!;
  const { phoneNumber } = req.body;
  const amount = 100; // in KES

  // Build the callback URL — must be publicly reachable by PayHero
  const domain = process.env["APP_URL"] ?? `${req.protocol}://${req.get("host")}`;
  const callbackUrl = `${domain}/callbackurl/callback`;

  // ExternalReference encodes enough info to recover even if the DB lookup fails
  const externalReference = `APP-recharge-${userId}-${Date.now()}`;

  const stkResult = await initiateSTKPush({
    phoneNumber,
    amount,
    externalReference,
    callbackUrl,
  });

  // ── STK Push failed (network error, wrong credentials, etc.) ──
  if (!stkResult.success || !stkResult.CheckoutRequestID) {
    req.log.error({ stkResult }, "PayHero STK push failed");
    res.status(502).json({
      error: "PaymentError",
      message: stkResult.errorMessage ?? stkResult.error ?? "Failed to initiate payment.",
    });
    return;
  }

  // ── STK Push succeeded — save a PENDING transaction record ───────────────
  // Description format: PAYHERO:{CheckoutRequestID}:{txnType}
  // The callback handler parses this to know what to do on success.
  const { data: txn, error: txnErr } = await supabase.from("transactions").insert({
    user_id: userId,
    type: "recharge",
    amount,
    status: "pending",
    description: `PAYHERO:${stkResult.CheckoutRequestID}:recharge`,
  }).select("id").single();

  if (txnErr) {
    req.log.error({ txnErr }, "Failed to insert pending transaction");
    // Non-fatal: callback can still process via ExternalReference fallback
  }

  // Return CheckoutRequestID + txn id so the frontend can poll for status
  res.json({
    message: "STK Push sent. Enter your M-Pesa PIN.",
    checkoutRequestId: stkResult.CheckoutRequestID,
    txnId: (txn as Record<string, unknown> | null)?.["id"] ?? null,
  });
});
```

**Key rules:**
- Always `Math.floor` the amount before sending (M-Pesa requires integers).
- Always save the pending transaction **after** a successful STK initiation, not before.
- Failing to save the pending row is non-fatal — the callback has a resilience fallback using `ExternalReference`.
- Return `checkoutRequestId` or `txnId` to the frontend so it can poll `/status`.

---

## 6. Mounting the Callback Route

```typescript
// app.ts
import mpesaRouter from "./routes/mpesa";

// IMPORTANT: Mount at /callbackurl — NOT under /api
// Reason: /api routes typically have auth middleware; the callback comes
// from PayHero's servers which have no session cookie.
app.use("/callbackurl", mpesaRouter);
```

Your PayHero dashboard callback URL must be: `https://yourdomain.com/callbackurl/callback`

---

## 7. The Callback Handler

Create `src/routes/mpesa.ts`. This is the most critical part — read every comment.

```typescript
import { Router, type Request, type Response } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

function num(val: unknown): number {
  return parseFloat(String(val ?? "0")) || 0;
}

// ─── Parse ExternalReference → { txnType, userId } ───────────────────────────
// ExternalReference format: APP-{type}-{userId}-{timestamp}
// e.g. APP-recharge-42-1716200000000
function parseExternalRef(ref: string): { txnType: string; userId: number } | null {
  const parts = ref.split("-");
  if (parts[0] !== "APP" || parts.length < 4) return null;
  const userId = Number(parts[2]);
  if (!userId) return null;
  return { txnType: parts[1] ?? "", userId };
}

// ─── POST /callback — PayHero sends payment result here ──────────────────────
router.post("/callback", async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;

  // ── ALWAYS respond 200 immediately, even if processing fails.
  // If you return an error code, PayHero will retry the callback repeatedly,
  // causing duplicate credits. Respond first, process second.
  // (In practice Express awaits your handler, so we respond at the end —
  //  but NEVER return a non-200 status code from this endpoint.)

  try {
    // ── Step 1: Unwrap body ──────────────────────────────────────────────────
    // PayHero sometimes nests the payload inside body.response
    const inner = (
      body["response"] != null && typeof body["response"] === "object"
        ? body["response"]
        : body
    ) as Record<string, unknown>;

    const checkoutRequestId = String(inner["CheckoutRequestID"] ?? "");
    const externalReference = String(inner["ExternalReference"] ?? inner["User_Reference"] ?? "");
    const resultCode        = inner["ResultCode"];
    const resultDesc        = String(inner["ResultDesc"] ?? "");
    const amountPaid        = num(inner["Amount"] ?? inner["amount"] ?? 0);

    // ResultCode 0 = success. Fallback: body.status === true for older format.
    const isSuccess =
      resultCode !== undefined && resultCode !== null
        ? Number(resultCode) === 0
        : body["status"] === true;

    // ── Step 2: Find the pending transaction row ─────────────────────────────
    // Primary: match CheckoutRequestID stored in the description column
    let resolvedTxn: Record<string, unknown> | null = null;

    if (checkoutRequestId) {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .like("description", `%:${checkoutRequestId}:%`)
        .limit(1);
      if (data && data.length > 0) resolvedTxn = data[0] as Record<string, unknown>;
    }

    // Fallback: look up by userId from ExternalReference (handles cases where
    // the pending row was never saved, e.g. DB error at initiation time)
    if (!resolvedTxn && externalReference) {
      const parsed = parseExternalRef(externalReference);
      if (parsed) {
        const { data } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", parsed.userId)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1);
        if (data && data.length > 0) resolvedTxn = data[0] as Record<string, unknown>;
      }
    }

    // ── Step 3: Idempotency guard ────────────────────────────────────────────
    // If this callback was already processed (duplicate delivery), skip it.
    if (resolvedTxn && (resolvedTxn["status"] === "completed" || resolvedTxn["status"] === "failed")) {
      res.json({ success: true });
      return;
    }

    // ── Step 4: Handle failed payment ────────────────────────────────────────
    if (!isSuccess) {
      if (resolvedTxn) {
        await supabase
          .from("transactions")
          .update({ status: "failed", description: `FAILED:${resolvedTxn["description"]}` })
          .eq("id", resolvedTxn["id"]);
      }
      res.json({ success: true });
      return;
    }

    // ── Step 5: Determine what to credit ─────────────────────────────────────
    let txnType    = "";
    let userId     = 0;
    let creditAmt  = amountPaid;

    if (resolvedTxn) {
      // Parse type from description: PAYHERO:{CheckoutRequestID}:{txnType}
      const parts = String(resolvedTxn["description"] ?? "").split(":");
      txnType     = parts[2] ?? "";
      userId      = Number(resolvedTxn["user_id"]);
      creditAmt   = num(resolvedTxn["amount"]);  // use the amount your server decided, not what PayHero reports
    } else {
      // No pending row — fall back entirely to ExternalReference
      const parsed = parseExternalRef(externalReference);
      if (!parsed) {
        // Cannot determine what to do — give up safely
        res.json({ success: true });
        return;
      }
      txnType   = parsed.txnType;
      userId    = parsed.userId;
      creditAmt = amountPaid; // use PayHero's reported amount as last resort
    }

    // ── Step 6: Credit the user ───────────────────────────────────────────────
    await creditUser({ txnType, userId, creditAmt, txnId: resolvedTxn?.["id"] ?? null, checkoutRequestId, externalReference });

    res.json({ success: true });

  } catch (err) {
    req.log.error({ err, body }, "Callback: unhandled exception");
    // Still respond 200 — we do NOT want PayHero to retry.
    res.json({ success: true });
  }
});

// ─── Credit logic (adapt to your app's business rules) ───────────────────────
async function creditUser(opts: {
  txnType: string;
  userId: number;
  creditAmt: number;
  txnId: unknown;
  checkoutRequestId: string;
  externalReference: string;
}): Promise<void> {
  const { txnType, userId, creditAmt, txnId, checkoutRequestId, externalReference } = opts;

  if (txnType === "recharge") {
    // Add funds to user's wallet
    const { data: wallets } = await supabase
      .from("wallet")
      .select("main_wallet, total_earned")
      .eq("user_id", userId)
      .limit(1);

    if (wallets && wallets.length > 0) {
      const w = wallets[0] as Record<string, unknown>;
      await supabase
        .from("wallet")
        .update({
          main_wallet:   num(w["main_wallet"])  + creditAmt,
          total_earned:  num(w["total_earned"]) + creditAmt,
        })
        .eq("user_id", userId);
    }

    // Mark transaction complete (or insert if the pending row was never saved)
    if (txnId) {
      await supabase.from("transactions").update({ status: "completed" }).eq("id", txnId);
    } else {
      await supabase.from("transactions").insert({
        user_id: userId,
        type: "recharge",
        amount: creditAmt,
        status: "completed",
        description: `PAYHERO:${checkoutRequestId}:recharge (recovered from ${externalReference})`,
      });
    }

  } else if (txnType === "activate") {
    // Activate account — idempotent: only update if still inactive
    const { data: updated } = await supabase
      .from("users")
      .update({ status: "active" })
      .eq("id", userId)
      .eq("status", "inactive")  // prevents double-activation on duplicate callbacks
      .select("id");

    const wasJustActivated = updated && updated.length > 0;

    if (txnId) {
      await supabase.from("transactions").update({ status: "completed" }).eq("id", txnId);
    } else if (wasJustActivated) {
      await supabase.from("transactions").insert({
        user_id: userId,
        type: "recharge",
        amount: creditAmt,
        status: "completed",
        description: `PAYHERO:${checkoutRequestId}:activate (recovered from ${externalReference})`,
      });
    }

    if (wasJustActivated) {
      // Trigger any post-activation logic here (referral bonuses, welcome email, etc.)
      // await triggerReferralBonus(userId);
    }

  } else {
    // Unknown type — log and do nothing
    console.error(`creditUser: unknown txnType "${txnType}" for userId ${userId}`);
  }
}
```

---

## 8. The Status-Poll Endpoint

The frontend needs a way to know when the payment completed. PayHero's callback goes to your server — not the browser. So you expose a polling endpoint:

```typescript
// Still in routes/mpesa.ts

router.get("/status", async (req: Request, res: Response) => {
  try {
    const txnId      = req.query["txn_id"] as string;
    const checkoutId = req.query["checkout_id"] as string;

    if (!txnId && !checkoutId) {
      res.status(400).json({ error: "ValidationError", message: "txn_id or checkout_id required" });
      return;
    }

    let txn: Record<string, unknown> | null = null;

    if (txnId) {
      const { data } = await supabase
        .from("transactions")
        .select("id, status, description, amount")
        .eq("id", Number(txnId))
        .limit(1);
      txn = (data?.[0] as Record<string, unknown> | null) ?? null;
    } else {
      const { data } = await supabase
        .from("transactions")
        .select("id, status, description, amount")
        .like("description", `%:${checkoutId}:%`)
        .limit(1);
      txn = (data?.[0] as Record<string, unknown> | null) ?? null;
    }

    if (!txn) {
      res.status(404).json({ error: "NotFound", message: "Transaction not found" });
      return;
    }

    const status   = String(txn["status"] ?? "pending");
    const desc     = String(txn["description"] ?? "");
    const isFailed = status === "failed" || desc.startsWith("FAILED:");

    res.json({
      status: isFailed ? "failed" : status, // "pending" | "completed" | "failed"
      amount: parseFloat(String(txn["amount"] ?? "0")) || 0,
    });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to check status" });
  }
});
```

---

## 9. Frontend Polling Pattern

After initiating payment, the frontend polls until it gets `completed` or `failed`:

```typescript
// React example
async function pollPaymentStatus(txnId: number, checkoutId?: string): Promise<"completed" | "failed"> {
  const MAX_POLLS  = 24;  // 24 × 5s = 2 minutes max wait
  const INTERVAL   = 5000; // 5 seconds

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(r => setTimeout(r, INTERVAL));

    const params = txnId
      ? `txn_id=${txnId}`
      : `checkout_id=${checkoutId}`;

    const res  = await fetch(`/callbackurl/status?${params}`, { credentials: "include" });
    const data = await res.json() as { status: string; amount: number };

    if (data.status === "completed") return "completed";
    if (data.status === "failed")    return "failed";
    // "pending" → keep polling
  }

  return "failed"; // timed out
}

// Usage after initiating STK push:
const { txnId, checkoutRequestId } = await initiatePayment({ amount, phone });
showToast("Check your phone and enter your M-Pesa PIN.");

const result = await pollPaymentStatus(txnId, checkoutRequestId);
if (result === "completed") {
  showToast("Payment successful!");
  refreshUserData();
} else {
  showToast("Payment failed or timed out. Please try again.", "error");
}
```

---

## 10. ExternalReference & Description Conventions

These two identifiers are your recovery mechanism. If anything goes wrong between the STK push and the callback, they let the system still correctly credit the user.

### ExternalReference (sent to PayHero)

Format: `{APP_PREFIX}-{txnType}-{userId}-{timestamp}`

| Example                          | Meaning                                  |
|----------------------------------|------------------------------------------|
| `APP-recharge-42-1716200000000`  | User 42 is topping up their wallet       |
| `APP-activate-7-1716200000000`   | User 7 is paying their activation fee    |
| `APP-payclient-3-1716200000000`  | User 3 is paying to activate a downline  |

Rules:
- Use `-` as delimiter (never inside values)
- Position 0: your app prefix (a constant string, e.g. `APP`)
- Position 1: action type — used by the callback to decide what to credit
- Position 2: userId as an integer
- Position 3: timestamp (ensures uniqueness)

### description (stored in your DB)

Format: `PAYHERO:{CheckoutRequestID}:{txnType}` (optionally `:{extraId}`)

| Example                                       | Meaning                                |
|-----------------------------------------------|----------------------------------------|
| `PAYHERO:ws_CO_....:recharge`                 | Recharge transaction                   |
| `PAYHERO:ws_CO_....:activate`                 | Activation transaction                 |
| `PAYHERO:ws_CO_....:pay-client:99`            | Upline paid for downline user 99       |
| `FAILED:PAYHERO:ws_CO_....:recharge`          | Failed — prefixed by the callback      |

The callback's primary lookup is:
```sql
SELECT * FROM transactions WHERE description LIKE '%:{checkoutRequestId}:%' LIMIT 1;
```

---

## 11. Idempotency & Duplicate Callbacks

PayHero **will** deliver the same callback more than once. Handle it:

```typescript
// In the callback, before processing anything:
if (resolvedTxn?.status === "completed" || resolvedTxn?.status === "failed") {
  res.json({ success: true }); // already done — silently ignore
  return;
}
```

For account activations, add a second guard at the DB level:

```typescript
// Only update if STILL inactive — zero rows updated = already active = skip bonus
const { data: updated } = await supabase
  .from("users")
  .update({ status: "active" })
  .eq("id", userId)
  .eq("status", "inactive")  // <── this is the idempotency guard
  .select("id");

const wasJustActivated = updated && updated.length > 0;
if (wasJustActivated) {
  // trigger bonus only here — safe, will not double-credit
}
```

---

## 12. Error Handling Rules

| Situation                             | What to do                                                    |
|---------------------------------------|---------------------------------------------------------------|
| PayHero API returns non-200           | Return 502 to your client. Do NOT insert a pending row.       |
| PayHero returns success but no `CheckoutRequestID` | Treat as failure — cannot track this payment.  |
| Pending row insert fails at initiation | Log it. Proceed. Callback fallback via ExternalReference.    |
| Callback: cannot find txn row         | Parse ExternalReference, credit directly. Insert completed row. |
| Callback: ResultCode !== 0            | Mark txn as `FAILED:…`. Always respond 200.                   |
| Callback: throws an exception         | Catch everything, log, respond `{ success: true }` anyway.    |
| **Never respond non-200 to a callback** | PayHero interprets non-200 as "retry" → duplicate credits. |

---

## 13. Environment Setup Checklist

Before going live:

- [ ] Set `PAYHERO_Channel_ID` — integer, from PayHero dashboard
- [ ] Set `PAYHERO_API_username` + `PAYHERO_API_password` (preferred) OR `PAYHERO_Basic_Auth_token`
- [ ] Set `APP_URL` to your public HTTPS domain (e.g. `https://myapp.com`) — used to build `callbackUrl`
- [ ] Register your callback URL in the PayHero dashboard: `https://yourdomain.com/callbackurl/callback`
- [ ] Ensure `/callbackurl` is **not** behind authentication middleware
- [ ] Ensure `/callbackurl` is reachable from the internet (not just localhost)
- [ ] Test with a real number using a small amount (e.g. KES 1) before production
- [ ] Confirm your `transactions` table has a `description TEXT` column for CheckoutRequestID storage
- [ ] Verify duplicate callback handling by manually replaying a callback (should be idempotent)

---

## Quick Reference — PayHero API

| Item              | Value                                              |
|-------------------|----------------------------------------------------|
| STK Push endpoint | `POST https://backend.payhero.co.ke/api/v2/payments` |
| Auth header       | `Authorization: Basic {base64(username:password)}` |
| Content-Type      | `application/json`                                 |
| Success ResultCode| `0`                                                |
| Phone format      | E.164 — `+254XXXXXXXXX`                           |
| Amount            | Integer (no decimals)                              |
| Provider value    | `"m-pesa"`                                        |

---

*Built from a production implementation. All patterns verified against the live PayHero callback format.*
