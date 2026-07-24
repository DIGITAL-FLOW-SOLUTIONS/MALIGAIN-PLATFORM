import { Router } from "express";
import { supabase } from "../lib/supabase";
import { getActivationFees } from "../lib/appSettings";

const router = Router();

router.get("/eversend-link", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "eversend_link")
      .single();

    if (error && error.code !== "PGRST116") throw error;

    res.json({ eversendLink: (data as { value: string } | null)?.value ?? "https://eversend.me/kantolah" });
  } catch {
    res.json({ eversendLink: "https://eversend.me/kantolah" });
  }
});

router.get("/activation-fees", async (req, res) => {
  try {
    const fees = await getActivationFees();
    res.json({ fees });
  } catch {
    res.status(500).json({ message: "Failed to fetch activation fees" });
  }
});

router.get("/uganda", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value, business_name")
      .in("key", ["mtn_ug_id", "airtel_ug_id"]);

    if (error) throw error;

    const settings: Record<string, { value: string; business_name: string }> = {};
    for (const row of (data ?? []) as Array<{ key: string; value: string; business_name: string | null }>) {
      settings[row.key] = { value: row.value, business_name: row.business_name ?? "" };
    }

    res.json({
      mtnUgId: settings["mtn_ug_id"]?.value ?? "",
      mtnUgBusinessName: settings["mtn_ug_id"]?.business_name ?? "",
      airtelUgId: settings["airtel_ug_id"]?.value ?? "",
      airtelUgBusinessName: settings["airtel_ug_id"]?.business_name ?? "",
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

router.get("/tanzania", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value, business_name")
      .eq("key", "tz_phone_id")
      .maybeSingle();

    if (error) throw error;

    const row = data as { value: string; business_name: string | null } | null;
    res.json({
      tzPhoneId: row?.value ?? "",
      tzBusinessName: row?.business_name ?? "",
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

router.get("/zambia", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value, business_name")
      .in("key", ["mtn_zm_id", "airtel_zm_id"]);

    if (error) throw error;

    const settings: Record<string, { value: string; business_name: string }> = {};
    for (const row of (data ?? []) as Array<{ key: string; value: string; business_name: string | null }>) {
      settings[row.key] = { value: row.value, business_name: row.business_name ?? "" };
    }

    res.json({
      mtnZmId: settings["mtn_zm_id"]?.value ?? "",
      mtnZmBusinessName: settings["mtn_zm_id"]?.business_name ?? "",
      airtelZmId: settings["airtel_zm_id"]?.value ?? "",
      airtelZmBusinessName: settings["airtel_zm_id"]?.business_name ?? "",
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

router.get("/congo", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value, business_name")
      .in("key", ["congo_agent_number", "congo_agent_name"]);

    if (error) throw error;

    const map: Record<string, { value: string; business_name: string | null }> = {};
    for (const row of (data ?? []) as Array<{ key: string; value: string; business_name: string | null }>) {
      map[row.key] = { value: row.value, business_name: row.business_name };
    }

    res.json({
      congoAgentNumber: map["congo_agent_number"]?.value ?? "03317296",
      congoAgentName: map["congo_agent_name"]?.value ?? "ADEZILA",
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

router.get("/malawi", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value, business_name")
      .in("key", ["malawi_phone", "malawi_business_name"]);

    if (error) throw error;

    const map: Record<string, string> = {};
    for (const row of (data ?? []) as Array<{ key: string; value: string }>) {
      map[row.key] = row.value;
    }

    res.json({
      malawiPhone: map["malawi_phone"] ?? "254757574729",
      malawiBusinessName: map["malawi_business_name"] ?? "CHARLES",
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

router.get("/botswana", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["botswana_phone", "botswana_business_name"]);

    if (error) throw error;

    const map: Record<string, string> = {};
    for (const row of (data ?? []) as Array<{ key: string; value: string }>) {
      map[row.key] = row.value;
    }

    res.json({
      botswanaPhone: map["botswana_phone"] ?? "256787102308",
      botswanaBusinessName: map["botswana_business_name"] ?? "Amundala Munyama",
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

router.get("/south-sudan", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["ss_phone", "ss_business_name"]);

    if (error) throw error;

    const map: Record<string, string> = {};
    for (const row of (data ?? []) as Array<{ key: string; value: string }>) {
      map[row.key] = row.value;
    }

    res.json({
      ssPhone: map["ss_phone"] ?? "256787102308",
      ssBusinessName: map["ss_business_name"] ?? "Amundala Munyama",
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

router.get("/rwanda", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["rwanda_phone", "rwanda_business_name"]);

    if (error) throw error;

    const map: Record<string, string> = {};
    for (const row of (data ?? []) as Array<{ key: string; value: string }>) {
      map[row.key] = row.value;
    }

    res.json({
      rwandaPhone: map["rwanda_phone"] ?? "256787102308",
      rwandaBusinessName: map["rwanda_business_name"] ?? "Amundala Munyama",
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

router.get("/cameroon", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value, business_name")
      .eq("key", "cm_mtn_phone")
      .maybeSingle();

    if (error) throw error;

    const row = data as { value: string; business_name: string | null } | null;
    res.json({
      cmMtnPhone: row?.value ?? "+254757574729",
      cmMtnBusinessName: row?.business_name ?? "Charles Nzive",
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

// ---------------------------------------------------------------------------
// Launch mode — public, no auth required
// Server enforces the NODE_ENV=production guard so dev always returns disabled.
// ---------------------------------------------------------------------------
router.get("/launch", async (req, res) => {
  const DEFAULT_DATE = "2026-08-08T10:00:00.000Z"; // 1:00 PM EAT (UTC+3)

  // Development: always disabled regardless of DB value
  if (process.env["NODE_ENV"] !== "production") {
    return res.json({ enabled: false, launchDate: DEFAULT_DATE });
  }

  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["launch_mode_enabled", "launch_date"]);

    if (error) throw error;

    const map: Record<string, string> = {};
    for (const row of (data ?? []) as Array<{ key: string; value: string }>) {
      map[row.key] = row.value;
    }

    const launchDate = map["launch_date"] ?? DEFAULT_DATE;
    const enabledInDb = map["launch_mode_enabled"] === "true";

    // Auto-disable once the launch date has passed
    const expired = new Date(launchDate) <= new Date();
    const enabled = enabledInDb && !expired;

    return res.json({ enabled, launchDate });
  } catch {
    return res.json({ enabled: false, launchDate: DEFAULT_DATE });
  }
});

export default router;
