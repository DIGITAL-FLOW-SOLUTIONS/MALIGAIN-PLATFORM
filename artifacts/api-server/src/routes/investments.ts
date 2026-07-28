import { Router, type Request, type Response } from "express";
import { supabase } from "../lib/supabase";
import { requireAuth } from "../middlewares/auth";
import { initiateSTKPush } from "../lib/payhero";
import { logger } from "../lib/logger";

const router = Router();
router.use(requireAuth);

const COUNTRY_CURRENCY: Record<string, string> = {
  KE: "KES", UG: "UGX", TZ: "TZS", GH: "GHS", ZM: "ZMW", CM: "XAF",
  NG: "NGN", RW: "RWF", BI: "BIF", MW: "MWK", BW: "BWP", SS: "SSP", CG: "XAF",
};

function num(v: unknown): number { return parseFloat(String(v ?? "0")) || 0; }

// ── GET /api/investments/plans ────────────────────────────────────────────────
// Returns plans for user's country (country-specific first, then ALL as fallback)
router.get("/plans", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const { data: userData } = await supabase
      .from("users").select("country").eq("id", userId).single();
    const country = (userData as Record<string, unknown>)?.["country"] as string ?? "KE";

    // Fetch plans for this country OR 'ALL'
    const { data: plans, error } = await supabase
      .from("investment_plans")
      .select("*")
      .eq("is_active", true)
      .or(`country.eq.${country},country.eq.ALL`)
      .order("sort_order", { ascending: true });

    if (error) throw error;

    const list = (plans ?? []) as Array<Record<string, unknown>>;
    res.json({
      plans: list.map(p => ({
        id: p["id"],
        brandName: p["brand_name"],
        name: p["name"],
        category: p["category"],
        depositAmount: num(p["deposit_amount"]),
        dailyProfit: num(p["daily_profit"]),
        totalDays: Number(p["total_days"]),
        totalProfit: num(p["total_profit"]),
        imageUrl: p["image_url"] ?? null,
        country: p["country"],
      })),
      country,
    });
  } catch (err) {
    req.log.error({ err }, "Get investment plans error");
    res.status(500).json({ message: "Failed to load investment plans" });
  }
});

// ── GET /api/investments/my ───────────────────────────────────────────────────
router.get("/my", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const { data, error } = await supabase
      .from("user_investments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const list = (data ?? []) as Array<Record<string, unknown>>;
    const totalInvested = list.reduce((s, i) => s + num(i["deposit_amount"]), 0);
    const totalEarned   = list.reduce((s, i) => s + num(i["total_earned"]), 0);
    const activeCount   = list.filter(i => i["status"] === "active").length;

    res.json({
      investments: list.map(i => ({
        id: i["id"],
        planName: i["plan_name"],
        brandName: i["brand_name"],
        category: i["category"],
        depositAmount: num(i["deposit_amount"]),
        dailyProfitAmount: num(i["daily_profit_amount"]),
        totalDays: Number(i["total_days"]),
        totalProfit: num(i["total_profit"]),
        imageUrl: i["image_url"] ?? null,
        totalEarned: num(i["total_earned"]),
        daysElapsed: Number(i["days_elapsed"]),
        status: i["status"],
        startDate: i["start_date"],
        nextCreditAt: i["next_credit_at"],
        createdAt: i["created_at"],
      })),
      totalInvested,
      totalEarned,
      activeCount,
    });
  } catch (err) {
    req.log.error({ err }, "Get my investments error");
    res.status(500).json({ message: "Failed to load investments" });
  }
});

// ── POST /api/investments/:planId/pay/kenya ───────────────────────────────────
// Initiates PayHero STK push for Kenyan users
router.post("/:planId/pay/kenya", async (req: Request, res: Response) => {
  try {
    const userId   = req.session.userId!;
    const planId   = parseInt(String(req.params["planId"]));
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      res.status(400).json({ message: "Phone number is required" });
      return;
    }

    // Fetch plan
    const { data: planData, error: planErr } = await supabase
      .from("investment_plans").select("*").eq("id", planId).eq("is_active", true).single();
    if (planErr || !planData) {
      res.status(404).json({ message: "Investment plan not found" });
      return;
    }
    const plan = planData as Record<string, unknown>;

    // Create pending investment record
    const { data: inv, error: invErr } = await supabase
      .from("user_investments")
      .insert({
        user_id: userId,
        plan_id: planId,
        plan_name: plan["name"],
        brand_name: plan["brand_name"],
        category: plan["category"],
        deposit_amount: num(plan["deposit_amount"]),
        daily_profit_amount: num(plan["daily_profit"]),
        total_days: Number(plan["total_days"]),
        total_profit: num(plan["total_profit"]),
        image_url: plan["image_url"] ?? null,
        status: "pending",
      })
      .select("id")
      .single();

    if (invErr || !inv) throw invErr ?? new Error("Failed to create investment");
    const investmentId = (inv as Record<string, unknown>)["id"];

    const amount = num(plan["deposit_amount"]);
    const externalRef = `MUL-invest-${userId}-${investmentId}-${Date.now()}`;

    const callbackUrl = process.env["APP_URL"]
      ? `${process.env["APP_URL"]}/callbackurl/callback`
      : "https://maligain.com/callbackurl/callback";

    const stk = await initiateSTKPush({
      amount,
      phoneNumber: phoneNumber.trim(),
      externalReference: externalRef,
      callbackUrl,
    });

    // Log transaction
    const { data: txn } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type: "investment",
        amount,
        status: "pending",
        description: `Investment plan: ${String(plan["name"])} | Ref: ${externalRef}`,
      })
      .select("id")
      .single();

    res.json({
      transactionId: (txn as Record<string, unknown>)?.["id"],
      checkoutRequestId: stk.CheckoutRequestID,
      investmentId,
      message: "STK push sent",
    });
  } catch (err) {
    req.log.error({ err }, "Investment Kenya pay error");
    res.status(500).json({ message: "Failed to initiate payment" });
  }
});

// ── POST /api/investments/:planId/pay/manual ──────────────────────────────────
// Manual payment with screenshot (Cameroon, Ghana, Nigeria, Burundi)
router.post("/:planId/pay/manual", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const planId = parseInt(String(req.params["planId"]));
    const { phone, screenshotBase64, screenshotMime, amountPaid } = req.body;

    if (!phone || !screenshotBase64 || !amountPaid) {
      res.status(400).json({ message: "Phone, screenshot, and amount are required" });
      return;
    }

    const { data: planData } = await supabase
      .from("investment_plans").select("*").eq("id", planId).eq("is_active", true).single();
    if (!planData) { res.status(404).json({ message: "Plan not found" }); return; }
    const plan = planData as Record<string, unknown>;

    // Check for pending investment payment
    const { data: pending } = await supabase
      .from("user_investments")
      .select("id")
      .eq("user_id", userId)
      .eq("plan_id", planId)
      .eq("status", "pending")
      .limit(1);
    if (pending && pending.length > 0) {
      res.status(409).json({ message: "You already have a pending payment for this plan. Please wait for review." });
      return;
    }

    const { data: userData } = await supabase.from("users").select("email, country").eq("id", userId).single();
    const email    = (userData as Record<string, unknown>)?.["email"] as string;
    const country  = (userData as Record<string, unknown>)?.["country"] as string ?? "KE";
    const currency = COUNTRY_CURRENCY[country] ?? "USD";

    // Upload screenshot
    const base64Data = screenshotBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer     = Buffer.from(base64Data, "base64");
    const mime       = screenshotMime || "image/png";
    const ext        = mime.split("/")[1] || "png";
    const fileName   = `verifications/${userId}_invest_${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("verifications")
      .upload(fileName, buffer, { contentType: mime, upsert: false });
    if (uploadErr) { res.status(500).json({ message: "Failed to upload screenshot" }); return; }

    const { data: urlData } = supabase.storage.from("verifications").getPublicUrl(fileName);

    // Create pending investment
    const { data: inv } = await supabase.from("user_investments").insert({
      user_id: userId, plan_id: planId,
      plan_name: plan["name"], brand_name: plan["brand_name"],
      category: plan["category"], deposit_amount: num(plan["deposit_amount"]),
      daily_profit_amount: num(plan["daily_profit"]), total_days: Number(plan["total_days"]),
      total_profit: num(plan["total_profit"]), image_url: plan["image_url"] ?? null,
      status: "pending",
    }).select("id").single();

    const investmentId = (inv as Record<string, unknown>)?.["id"];

    // Create eversend_verifications record with purpose tag
    await supabase.from("eversend_verifications").insert({
      user_id: userId, email, phone: phone.trim(),
      screenshot_url: urlData.publicUrl,
      amount_paid: parseFloat(amountPaid),
      currency, status: "pending",
      admin_note: `INVESTMENT | plan_id=${planId} | investment_id=${investmentId} | plan=${String(plan["name"])}`,
    });

    res.json({ message: "Payment submitted for review. Your investment will be activated within 24 hours.", investmentId });
  } catch (err) {
    req.log.error({ err }, "Investment manual pay error");
    res.status(500).json({ message: "Failed to submit payment" });
  }
});

// ── POST /api/investments/:planId/pay/mobile ──────────────────────────────────
// Manual mobile money (Uganda, Tanzania, Zambia, etc.) — no screenshot needed
router.post("/:planId/pay/mobile", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const planId = parseInt(String(req.params["planId"]));
    const { phone, paymentMethod } = req.body;

    if (!phone || !paymentMethod) {
      res.status(400).json({ message: "Phone and payment method are required" });
      return;
    }

    const { data: planData } = await supabase
      .from("investment_plans").select("*").eq("id", planId).eq("is_active", true).single();
    if (!planData) { res.status(404).json({ message: "Plan not found" }); return; }
    const plan = planData as Record<string, unknown>;

    const { data: pending } = await supabase
      .from("user_investments")
      .select("id").eq("user_id", userId).eq("plan_id", planId).eq("status", "pending").limit(1);
    if (pending && pending.length > 0) {
      res.status(409).json({ message: "You already have a pending payment for this plan." });
      return;
    }

    const { data: userData } = await supabase.from("users").select("email, country").eq("id", userId).single();
    const email   = (userData as Record<string, unknown>)?.["email"] as string;
    const country = (userData as Record<string, unknown>)?.["country"] as string ?? "UG";
    const currency = COUNTRY_CURRENCY[country] ?? "UGX";

    // Create pending investment
    const { data: inv } = await supabase.from("user_investments").insert({
      user_id: userId, plan_id: planId,
      plan_name: plan["name"], brand_name: plan["brand_name"],
      category: plan["category"], deposit_amount: num(plan["deposit_amount"]),
      daily_profit_amount: num(plan["daily_profit"]), total_days: Number(plan["total_days"]),
      total_profit: num(plan["total_profit"]), image_url: plan["image_url"] ?? null,
      status: "pending",
    }).select("id").single();

    const investmentId = (inv as Record<string, unknown>)?.["id"];

    await supabase.from("eversend_verifications").insert({
      user_id: userId, email, phone: phone.trim(),
      screenshot_url: "", amount_paid: num(plan["deposit_amount"]), currency, status: "pending",
      admin_note: `INVESTMENT | plan_id=${planId} | investment_id=${investmentId} | plan=${String(plan["name"])} | payment_method=${paymentMethod}`,
    });

    res.json({ message: "Payment submitted for review. Your investment will be activated shortly.", investmentId });
  } catch (err) {
    req.log.error({ err }, "Investment mobile pay error");
    res.status(500).json({ message: "Failed to submit payment" });
  }
});

export default router;
