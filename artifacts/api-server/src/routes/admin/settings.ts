import { Router, type IRouter, type Request, type Response } from "express";
import { supabase } from "../../lib/supabase";
import { logAdminAction } from "../../middlewares/adminAuth";

const router: IRouter = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value, business_name")
      .in("key", ["mtn_ug_id", "airtel_ug_id", "mtn_zm_id", "airtel_zm_id", "tz_phone_id", "cm_mtn_phone", "eversend_link", "launch_mode_enabled", "launch_date"]);

    if (error) throw error;

    const settings: Record<string, string> = {};
    for (const row of (data ?? []) as Array<{ key: string; value: string; business_name: string | null }>) {
      settings[row.key] = row.value;
      if (row.business_name) {
        settings[`${row.key}_business_name`] = row.business_name;
      }
    }

    res.json({ settings });
  } catch (err) {
    req.log.error({ err }, "Admin get settings error");
    res.status(500).json({ error: "ServerError", message: "Failed to fetch settings" });
  }
});

router.put("/", async (req: Request, res: Response) => {
  try {
    const {
      mtn_ug_id,
      mtn_ug_id_business_name,
      airtel_ug_id,
      airtel_ug_id_business_name,
      mtn_zm_id,
      mtn_zm_id_business_name,
      airtel_zm_id,
      airtel_zm_id_business_name,
      tz_phone_id,
      tz_phone_id_business_name,
      cm_mtn_phone,
      cm_mtn_phone_business_name,
      eversend_link,
    } = req.body as Record<string, string | undefined>;

    const upserts: Array<{ key: string; value: string; business_name?: string | null }> = [];

    if (mtn_ug_id?.trim()) {
      upserts.push({ key: "mtn_ug_id", value: mtn_ug_id.trim(), business_name: mtn_ug_id_business_name?.trim() ?? null });
    }
    if (airtel_ug_id?.trim()) {
      upserts.push({ key: "airtel_ug_id", value: airtel_ug_id.trim(), business_name: airtel_ug_id_business_name?.trim() ?? null });
    }
    if (mtn_zm_id?.trim()) {
      upserts.push({ key: "mtn_zm_id", value: mtn_zm_id.trim(), business_name: mtn_zm_id_business_name?.trim() ?? null });
    }
    if (airtel_zm_id?.trim()) {
      upserts.push({ key: "airtel_zm_id", value: airtel_zm_id.trim(), business_name: airtel_zm_id_business_name?.trim() ?? null });
    }
    if (tz_phone_id?.trim()) {
      upserts.push({ key: "tz_phone_id", value: tz_phone_id.trim(), business_name: tz_phone_id_business_name?.trim() ?? null });
    }
    if (cm_mtn_phone !== undefined) {
      upserts.push({ key: "cm_mtn_phone", value: cm_mtn_phone.trim(), business_name: cm_mtn_phone_business_name?.trim() ?? null });
    }
    if (eversend_link !== undefined) {
      upserts.push({ key: "eversend_link", value: eversend_link.trim() });
    }

    for (const row of upserts) {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
    }

    await logAdminAction(req.session.adminUsername!, "update_settings", "app_settings", undefined, {
      mtn_ug_id, mtn_ug_id_business_name, airtel_ug_id, airtel_ug_id_business_name,
      mtn_zm_id, mtn_zm_id_business_name, airtel_zm_id, airtel_zm_id_business_name,
      tz_phone_id, tz_phone_id_business_name,
      cm_mtn_phone, cm_mtn_phone_business_name,
      eversend_link,
    });

    res.json({ message: "Settings updated successfully" });
  } catch (err) {
    req.log.error({ err }, "Admin update settings error");
    res.status(500).json({ error: "ServerError", message: "Failed to update settings" });
  }
});

// ---------------------------------------------------------------------------
// Launch mode — admin read/write
// ---------------------------------------------------------------------------
router.put("/launch", async (req: Request, res: Response) => {
  try {
    const { enabled, launchDate } = req.body as { enabled?: boolean; launchDate?: string };

    if (typeof enabled !== "boolean") {
      res.status(400).json({ error: "BadRequest", message: "enabled must be a boolean" });
      return;
    }
    if (!launchDate || isNaN(new Date(launchDate).getTime())) {
      res.status(400).json({ error: "BadRequest", message: "launchDate must be a valid ISO date string" });
      return;
    }

    const upserts = [
      { key: "launch_mode_enabled", value: String(enabled), updated_at: new Date().toISOString() },
      { key: "launch_date", value: launchDate, updated_at: new Date().toISOString() },
    ];

    for (const row of upserts) {
      const { error } = await supabase.from("app_settings").upsert(row, { onConflict: "key" });
      if (error) throw error;
    }

    await logAdminAction(req.session.adminUsername!, "update_launch_settings", "app_settings", undefined, {
      enabled,
      launchDate,
    });

    res.json({ message: "Launch settings updated successfully" });
  } catch (err) {
    req.log.error({ err }, "Admin update launch settings error");
    res.status(500).json({ error: "ServerError", message: "Failed to update launch settings" });
  }
});

export default router;
