import { Router, type Request, type Response } from "express";
import { supabase } from "../lib/supabase";
import { requireAuth } from "../middlewares/auth";
import { initiateSTKPush } from "../lib/payhero";
import { spinEventBus } from "../lib/spin-events";

const router = Router();

// ── Constants ─────────────────────────────────────────────────────────────────

/** Base spin cost in KES. Converted to local currency per country. */
const SPIN_COST_KES = 25;

/** Approximate conversion rate from KES to each country's currency. */
const KES_TO_LOCAL: Record<string, number> = {
  KE: 1,
  UG: 28,
  TZ: 23,
  GH: 0.068,
  ZM: 0.7,
  CM: 16,
  NG: 5,
  RW: 14,
  BI: 36,
  MW: 17,
  BW: 0.14,
  SS: 13,
  CG: 16,
};

const COUNTRY_CURRENCY: Record<string, string> = {
  KE: "KES", UG: "UGX", TZ: "TZS", GH: "GHS", ZM: "ZMW",
  CM: "XAF", NG: "NGN", RW: "RWF", BI: "BIF", MW: "MWK",
  BW: "BWP", SS: "SSP", CG: "XAF",
};

/**
 * Wheel segments — 12 slots, KES values.
 * Multiplier labels (x4, x10, x66) are expressed as the resulting KES amount.
 */
export const SPIN_SEGMENTS = [
  { label: "0",    valueKES: 0    },  // 0
  { label: "30",   valueKES: 30   },  // 1
  { label: "251",  valueKES: 251  },  // 2
  { label: "3300", valueKES: 3300 },  // 3
  { label: "10",   valueKES: 10   },  // 4
  { label: "40",   valueKES: 40   },  // 5
  { label: "1000", valueKES: 1000 },  // 6
  { label: "20",   valueKES: 20   },  // 7
  { label: "x10",  valueKES: 250  },  // 8
  { label: "x4",   valueKES: 100  },  // 9
  { label: "x66",  valueKES: 1650 },  // 10
  { label: "50",   valueKES: 50   },  // 11
];

/**
 * Free spin — fair(ish) distribution. Big prizes still very rare.
 * Ordered same as SPIN_SEGMENTS.
 */
const FREE_WEIGHTS = [6, 13, 7, 2, 14, 13, 4, 13, 5, 11, 1, 11];

/**
 * Bet spin — rigged so that most outcomes are below the 25 KES spin cost.
 * Segments that pay < 25 KES: index 0 (0), 4 (10), 7 (20) → ~71% combined.
 */
const BET_WEIGHTS = [400, 80, 5, 0.2, 200, 80, 0.5, 150, 0.5, 8, 0.2, 76];

// ── Helpers ────────────────────────────────────────────────────────────────────

function num(v: unknown): number { return parseFloat(String(v ?? "0")) || 0; }

function getSpinCostLocal(country: string): number {
  const rate = KES_TO_LOCAL[(country ?? "KE").toUpperCase()] ?? 1;
  return Math.max(1, Math.round(SPIN_COST_KES * rate));
}

function getCurrency(country: string): string {
  return COUNTRY_CURRENCY[(country ?? "KE").toUpperCase()] ?? "KES";
}

function kesToLocal(amountKES: number, country: string): number {
  const rate = KES_TO_LOCAL[(country ?? "KE").toUpperCase()] ?? 1;
  return Math.round(amountKES * rate);
}

/** Weighted random — returns the selected index. */
function weightedRandom(weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

async function getUserCountry(userId: number): Promise<string> {
  const { data } = await supabase.from("users").select("country").eq("id", userId).single();
  return ((data as Record<string, unknown>)?.["country"] as string) ?? "KE";
}

async function getOrCreateWallet(userId: number): Promise<Record<string, unknown> | null> {
  let { data: wallets } = await supabase.from("wallet").select("*").eq("user_id", userId).limit(1);
  if (!wallets || wallets.length === 0) {
    const { data: nw } = await supabase
      .from("wallet")
      .insert({ user_id: userId, spin_balance: 0, spin_earnings: 0 })
      .select()
      .single();
    wallets = nw ? [nw] : [];
  }
  return (wallets?.[0] as Record<string, unknown> | null) ?? null;
}

function canFreeSpin(lastFreeAt: string | null): boolean {
  if (!lastFreeAt) return true;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return new Date(lastFreeAt) < todayStart;
}

// ── Routes ─────────────────────────────────────────────────────────────────────

// All spin routes require authentication
router.use(requireAuth);

// GET /api/spin/balance
router.get("/balance", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const country = await getUserCountry(userId);
    const wallet = await getOrCreateWallet(userId);

    const lastFreeAt = (wallet?.["spin_last_free_at"] as string | null) ?? null;

    res.json({
      spinBalance:  num(wallet?.["spin_balance"]),
      spinEarnings: num(wallet?.["spin_earnings"]),
      spinCost:     getSpinCostLocal(country),
      currency:     getCurrency(country),
      canFreeSpin:  canFreeSpin(lastFreeAt),
      lastFreeAt,
    });
  } catch (err) {
    req.log.error({ err }, "Spin balance error");
    res.status(500).json({ message: "Failed to get spin balance" });
  }
});

// POST /api/spin/free  — one free spin per calendar day
router.post("/free", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const country = await getUserCountry(userId);

    const wallet = await getOrCreateWallet(userId);
    if (!wallet) { res.status(500).json({ message: "Wallet error" }); return; }

    const lastFreeAt = (wallet["spin_last_free_at"] as string | null) ?? null;
    if (!canFreeSpin(lastFreeAt)) {
      res.status(400).json({ message: "You've already used your free spin today. Come back tomorrow!" });
      return;
    }

    const segIdx      = weightedRandom(FREE_WEIGHTS);
    const segment     = SPIN_SEGMENTS[segIdx]!;
    const amountKES   = segment.valueKES;
    const amountLocal = kesToLocal(amountKES, country);
    const now         = new Date().toISOString();

    if (amountKES > 0) {
      await supabase.from("wallet").update({
        main_wallet:      num(wallet["main_wallet"])  + amountLocal,
        spin_earnings:    num(wallet["spin_earnings"]) + amountLocal,
        total_earned:     num(wallet["total_earned"])  + amountLocal,
        spin_last_free_at: now,
      }).eq("user_id", userId);

      await supabase.from("transactions").insert({
        user_id:     userId,
        type:        "bonus",
        amount:      amountLocal,
        status:      "completed",
        description: `Free Spin Win: ${segment.label}`,
      });
    } else {
      await supabase.from("wallet").update({ spin_last_free_at: now }).eq("user_id", userId);
    }

    spinEventBus.emit(`wallet:${userId}`);

    res.json({
      segmentIndex: segIdx,
      amountKES,
      amountLocal,
      label:      segment.label,
      currency:   getCurrency(country),
    });
  } catch (err) {
    req.log.error({ err }, "Free spin error");
    res.status(500).json({ message: "Spin failed. Please try again." });
  }
});

// POST /api/spin/bet  — costs spinCost from spin_balance, winnings → main_wallet
router.post("/bet", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const country = await getUserCountry(userId);
    const spinCostLocal = getSpinCostLocal(country);
    const currency      = getCurrency(country);

    const wallet = await getOrCreateWallet(userId);
    if (!wallet) { res.status(500).json({ message: "Wallet error" }); return; }

    const spinBalance = num(wallet["spin_balance"]);
    if (spinBalance < spinCostLocal) {
      res.status(400).json({
        message: `Insufficient spin balance. You need ${currency} ${spinCostLocal} to spin. Please top up first.`,
      });
      return;
    }

    const segIdx       = weightedRandom(BET_WEIGHTS);
    const segment      = SPIN_SEGMENTS[segIdx]!;
    const amountKES    = segment.valueKES;
    const winAmountLocal = kesToLocal(amountKES, country);

    const newBalance = Math.max(0, spinBalance - spinCostLocal + winAmountLocal);

    const walletUpdate: Record<string, unknown> = {
      spin_balance:  newBalance,
      spin_earnings: num(wallet["spin_earnings"]) + winAmountLocal,
    };
    if (winAmountLocal > 0) {
      walletUpdate["main_wallet"]  = num(wallet["main_wallet"])  + winAmountLocal;
      walletUpdate["total_earned"] = num(wallet["total_earned"]) + winAmountLocal;
    }
    await supabase.from("wallet").update(walletUpdate).eq("user_id", userId);

    await supabase.from("transactions").insert({
      user_id:     userId,
      type:        "bonus",
      amount:      spinCostLocal,
      status:      "completed",
      description: `Bet Spin: paid ${currency} ${spinCostLocal}, won ${currency} ${winAmountLocal} (${segment.label})`,
    });

    spinEventBus.emit(`wallet:${userId}`);

    res.json({
      segmentIndex: segIdx,
      amountKES,
      amountLocal:  winAmountLocal,
      label:        segment.label,
      spinCost:     spinCostLocal,
      newBalance,
      currency,
    });
  } catch (err) {
    req.log.error({ err }, "Bet spin error");
    res.status(500).json({ message: "Spin failed. Please try again." });
  }
});

// ── Spin Balance Deposits ──────────────────────────────────────────────────────

// POST /api/spin/deposit/kenya — M-Pesa STK push (Kenya only)
router.post("/deposit/kenya", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const { phoneNumber, amount } = req.body;

    if (!phoneNumber || !amount || Number(amount) < 1) {
      res.status(400).json({ message: "Phone number and amount are required" });
      return;
    }

    const depositAmount = Math.floor(Number(amount));
    const externalRef   = `MUL-spin-${userId}-${Date.now()}`;
    const callbackUrl   = process.env["APP_URL"]
      ? `${process.env["APP_URL"]}/callbackurl/callback`
      : "https://maligain.com/callbackurl/callback";

    const stk = await initiateSTKPush({
      amount:            depositAmount,
      phoneNumber:       phoneNumber.trim(),
      externalReference: externalRef,
      callbackUrl,
    });

    if (!stk.success || !stk.CheckoutRequestID) {
      res.status(502).json({ message: stk.error ?? "Failed to initiate payment" });
      return;
    }

    const { data: txn } = await supabase.from("transactions").insert({
      user_id:     userId,
      type:        "recharge",
      amount:      depositAmount,
      status:      "pending",
      description: `PAYHERO:${stk.CheckoutRequestID}:spin`,
    }).select("id").single();

    res.json({
      transactionId:    (txn as Record<string, unknown>)?.["id"],
      checkoutRequestId: stk.CheckoutRequestID,
      message:          "STK push sent. Enter your M-PESA PIN to complete.",
    });
  } catch (err) {
    req.log.error({ err }, "Spin deposit kenya error");
    res.status(500).json({ message: "Failed to initiate payment" });
  }
});

// POST /api/spin/deposit/manual — screenshot (Cameroon, Ghana, Nigeria, Burundi)
router.post("/deposit/manual", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const { phone, screenshotBase64, screenshotMime, amountPaid } = req.body;

    if (!phone || !screenshotBase64 || !amountPaid) {
      res.status(400).json({ message: "Phone, screenshot, and amount are required" });
      return;
    }

    const { data: ud } = await supabase.from("users").select("email, country").eq("id", userId).single();
    const email    = (ud as Record<string, unknown>)?.["email"] as string;
    const country  = (ud as Record<string, unknown>)?.["country"] as string ?? "KE";
    const currency = COUNTRY_CURRENCY[country.toUpperCase()] ?? "KES";

    const base64Data = screenshotBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer     = Buffer.from(base64Data, "base64");
    const mime       = screenshotMime || "image/png";
    const ext        = mime.split("/")[1] || "png";
    const fileName   = `verifications/${userId}_spin_${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("verifications")
      .upload(fileName, buffer, { contentType: mime, upsert: false });
    if (uploadErr) { res.status(500).json({ message: "Failed to upload screenshot" }); return; }

    const { data: urlData } = supabase.storage.from("verifications").getPublicUrl(fileName);

    await supabase.from("eversend_verifications").insert({
      user_id:      userId,
      email,
      phone:        phone.trim(),
      screenshot_url: urlData.publicUrl,
      amount_paid:  parseFloat(amountPaid),
      currency,
      status:       "pending",
      admin_note:   `SPIN | phone=${phone.trim()} | amount=${amountPaid} ${currency}`,
    });

    res.json({ message: "Payment submitted for review. Your spin balance will be credited within 24 hours." });
  } catch (err) {
    req.log.error({ err }, "Spin deposit manual error");
    res.status(500).json({ message: "Failed to submit payment" });
  }
});

// POST /api/spin/deposit/mobile — mobile money without screenshot (UG, TZ, ZM, etc.)
router.post("/deposit/mobile", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const { phone, paymentMethod, amount } = req.body;

    if (!phone || !paymentMethod || !amount) {
      res.status(400).json({ message: "Phone, payment method and amount are required" });
      return;
    }

    const { data: ud } = await supabase.from("users").select("email, country").eq("id", userId).single();
    const email    = (ud as Record<string, unknown>)?.["email"] as string;
    const country  = (ud as Record<string, unknown>)?.["country"] as string ?? "UG";
    const currency = COUNTRY_CURRENCY[country.toUpperCase()] ?? "UGX";

    await supabase.from("eversend_verifications").insert({
      user_id:       userId,
      email,
      phone:         phone.trim(),
      screenshot_url: "",
      amount_paid:   parseFloat(amount),
      currency,
      status:        "pending",
      admin_note:    `SPIN | phone=${phone.trim()} | payment_method=${paymentMethod} | amount=${amount} ${currency}`,
    });

    res.json({ message: "Payment submitted for review. Your spin balance will be credited after verification." });
  } catch (err) {
    req.log.error({ err }, "Spin deposit mobile error");
    res.status(500).json({ message: "Failed to submit payment" });
  }
});

// GET /api/spin/events — SSE stream for real-time spin balance updates
router.get("/events", (req: Request, res: Response) => {
  const userId = req.session.userId!;

  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.flushHeaders();

  const sendBalanceUpdate = async () => {
    try {
      const country = await getUserCountry(userId);
      const wallet  = await getOrCreateWallet(userId);
      const lastFreeAt = (wallet?.["spin_last_free_at"] as string | null) ?? null;

      const payload = JSON.stringify({
        spinBalance:  num(wallet?.["spin_balance"]),
        spinEarnings: num(wallet?.["spin_earnings"]),
        spinCost:     getSpinCostLocal(country),
        currency:     getCurrency(country),
        canFreeSpin:  canFreeSpin(lastFreeAt),
      });
      res.write(`data: ${payload}\n\n`);
    } catch { /* ignore */ }
  };

  const listener = () => { void sendBalanceUpdate(); };
  spinEventBus.on(`wallet:${userId}`, listener);

  // Send initial state
  void sendBalanceUpdate();

  // Heartbeat every 25 seconds to keep connection alive
  const heartbeat = setInterval(() => res.write(":heartbeat\n\n"), 25_000);

  req.on("close", () => {
    spinEventBus.off(`wallet:${userId}`, listener);
    clearInterval(heartbeat);
  });
});

export default router;
