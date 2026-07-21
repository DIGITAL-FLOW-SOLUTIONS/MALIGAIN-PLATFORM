import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { supabase } from "../lib/supabase";
import { getActivationFee } from "../lib/appSettings";

const router = Router();

const COUNTRY_CURRENCY: Record<string, string> = {
  KE: "KES",
  UG: "UGX",
  TZ: "TZS",
  GH: "GHS",
  ZM: "ZMW",
  CM: "XAF",
  NG: "NGN",
  ZA: "ZAR",
  RW: "RWF",
  BI: "BIF",
  ET: "ETB",
  ZW: "ZWL",
  MW: "MWK",
  MZ: "MZN",
  CI: "XOF",
  SN: "XOF",
  ML: "XOF",
  BF: "XOF",
  BJ: "XOF",
  NE: "XOF",
  TG: "XOF",
  CD: "CDF",
  CG: "XAF",
  EG: "EGP",
  MA: "MAD",
  TN: "TND",
  DZ: "DZD",
  SD: "SDG",
  SO: "SOS",
  DJ: "DJF",
  ER: "ERN",
  AO: "AOA",
  NA: "NAD",
  BW: "BWP",
  LS: "LSL",
  SZ: "SZL",
  MG: "MGA",
  MU: "MUR",
  SC: "SCR",
  SL: "SLL",
  LR: "LRD",
  GN: "GNF",
  GQ: "XAF",
  GA: "XAF",
  CF: "XAF",
  TD: "XAF",
  LY: "LYD",
};

function getCurrencyForCountry(country: string | null | undefined): string {
  if (!country) return "KES";
  return COUNTRY_CURRENCY[country.toUpperCase()] ?? "KES";
}

router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const userId = req.session.userId!;

    const { data, error } = await supabase
      .from("eversend_verifications")
      .select("id, email, phone, screenshot_url, amount_paid, currency, status, admin_note, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ records: data ?? [] });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to fetch verification records." });
  }
});

router.post("/", async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { phone, screenshotBase64, screenshotMime, amountPaid } = req.body;

    if (!phone || !screenshotBase64 || !amountPaid) {
      res.status(400).json({ message: "Phone, screenshot, and amount are required." });
      return;
    }

    const parsedAmount = parseFloat(amountPaid);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ message: "Invalid amount paid." });
      return;
    }

    const { data: pendingRecords, error: pendingError } = await supabase
      .from("eversend_verifications")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "pending")
      .limit(1);

    if (pendingError) throw pendingError;

    if (pendingRecords && pendingRecords.length > 0) {
      res.status(409).json({ message: "You already have a pending verification. Please wait for it to be reviewed before submitting a new one." });
      return;
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("email, country")
      .eq("id", userId)
      .single();

    if (userError || !userData) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    const email = userData.email as string;
    const currency = getCurrencyForCountry(userData.country as string | null);

    const base64Data = screenshotBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const mime = screenshotMime || "image/png";
    const ext = mime.split("/")[1] || "png";
    const fileName = `verifications/${userId}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("verifications")
      .upload(fileName, buffer, { contentType: mime, upsert: false });

    if (uploadError) {
      res.status(500).json({ message: `Failed to upload screenshot: ${uploadError.message}` });
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("verifications")
      .getPublicUrl(fileName);

    const screenshotUrl = publicUrlData.publicUrl;

    const { error: insertError } = await supabase
      .from("eversend_verifications")
      .insert({
        user_id: userId,
        email,
        phone: phone.trim(),
        screenshot_url: screenshotUrl,
        amount_paid: parsedAmount,
        currency,
        status: "pending",
      });

    if (insertError) throw insertError;

    res.json({ message: "Verification submitted successfully. We will review it shortly." });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to submit verification. Please try again." });
  }
});

router.post("/uganda", async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { phone, paymentMethod } = req.body;

    if (!phone || !paymentMethod) {
      res.status(400).json({ message: "Phone and payment method are required." });
      return;
    }

    const { data: pendingRecords, error: pendingError } = await supabase
      .from("eversend_verifications")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "pending")
      .limit(1);

    if (pendingError) throw pendingError;

    if (pendingRecords && pendingRecords.length > 0) {
      res.status(409).json({ message: "You already have a pending verification. Please wait for it to be reviewed before submitting a new one." });
      return;
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("email")
      .eq("id", userId)
      .single();

    if (userError || !userData) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    const { error: insertError } = await supabase
      .from("eversend_verifications")
      .insert({
        user_id: userId,
        email: (userData as Record<string, unknown>)["email"] as string,
        phone: phone.trim(),
        screenshot_url: "",
        amount_paid: await getActivationFee("UG"),
        currency: "UGX",
        status: "pending",
        admin_note: `Payment method: ${paymentMethod}`,
      });

    if (insertError) throw insertError;

    res.json({ message: "Payment submitted for verification. We will review it shortly." });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to submit verification. Please try again." });
  }
});

router.post("/tanzania", async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { phone, paymentMethod } = req.body;

    if (!phone || !paymentMethod) {
      res.status(400).json({ message: "Phone and payment method are required." });
      return;
    }

    const { data: pendingRecords, error: pendingError } = await supabase
      .from("eversend_verifications")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "pending")
      .limit(1);

    if (pendingError) throw pendingError;

    if (pendingRecords && pendingRecords.length > 0) {
      res.status(409).json({ message: "You already have a pending verification. Please wait for it to be reviewed before submitting a new one." });
      return;
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("email")
      .eq("id", userId)
      .single();

    if (userError || !userData) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    const { error: insertError } = await supabase
      .from("eversend_verifications")
      .insert({
        user_id: userId,
        email: (userData as Record<string, unknown>)["email"] as string,
        phone: phone.trim(),
        screenshot_url: "",
        amount_paid: await getActivationFee("TZ"),
        currency: "TZS",
        status: "pending",
        admin_note: `Payment method: ${paymentMethod}`,
      });

    if (insertError) throw insertError;

    res.json({ message: "Payment submitted for verification. We will review it shortly." });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to submit verification. Please try again." });
  }
});

router.post("/zambia", async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { phone, paymentMethod } = req.body;

    if (!phone || !paymentMethod) {
      res.status(400).json({ message: "Phone and payment method are required." });
      return;
    }

    const { data: pendingRecords, error: pendingError } = await supabase
      .from("eversend_verifications")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "pending")
      .limit(1);

    if (pendingError) throw pendingError;

    if (pendingRecords && pendingRecords.length > 0) {
      res.status(409).json({ message: "You already have a pending verification. Please wait for it to be reviewed before submitting a new one." });
      return;
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("email")
      .eq("id", userId)
      .single();

    if (userError || !userData) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    const { error: insertError } = await supabase
      .from("eversend_verifications")
      .insert({
        user_id: userId,
        email: (userData as Record<string, unknown>)["email"] as string,
        phone: phone.trim(),
        screenshot_url: "",
        amount_paid: await getActivationFee("ZM"),
        currency: "ZMW",
        status: "pending",
        admin_note: `Payment method: ${paymentMethod}`,
      });

    if (insertError) throw insertError;

    res.json({ message: "Payment submitted for verification. We will review it shortly." });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to submit verification. Please try again." });
  }
});


router.post("/cameroon", async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { phone, paymentMethod } = req.body;

    if (!phone || !paymentMethod) {
      res.status(400).json({ message: "Phone and payment method are required." });
      return;
    }

    const { data: pendingRecords, error: pendingError } = await supabase
      .from("eversend_verifications")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "pending")
      .limit(1);

    if (pendingError) throw pendingError;

    if (pendingRecords && pendingRecords.length > 0) {
      res.status(409).json({ message: "You already have a pending verification. Please wait for it to be reviewed before submitting a new one." });
      return;
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("email, status")
      .eq("id", userId)
      .single();

    if (userError || !userData) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    const userStatus = (userData as Record<string, unknown>)["status"] as string;
    // Determine correct fixed amount: activation vs. recharge
    // Amount is always server-determined — never trusted from the client
    const fixedAmount = await getActivationFee("CM");

    const { error: insertError } = await supabase
      .from("eversend_verifications")
      .insert({
        user_id: userId,
        email: (userData as Record<string, unknown>)["email"] as string,
        phone: phone.trim(),
        screenshot_url: "",
        amount_paid: fixedAmount,
        currency: "XAF",
        status: "pending",
        admin_note: `Payment method: ${paymentMethod} | User status at submission: ${userStatus}`,
      });

    if (insertError) throw insertError;

    res.json({ message: "Payment submitted for verification. We will review it shortly." });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to submit verification. Please try again." });
  }
});

export default router;
