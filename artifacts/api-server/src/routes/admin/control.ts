import { Router, type IRouter, type Request, type Response } from "express";
import { supabase } from "../../lib/supabase";
import { logAdminAction } from "../../middlewares/adminAuth";
import {
  ACTIVATION_FEE_DEFAULTS,
  BONUS_TABLE_DEFAULTS,
  COUNTRIES,
  getActivationFees,
  getBonusTable,
} from "../../lib/appSettings";

const router: IRouter = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const [activationFees, bonusTable] = await Promise.all([
      getActivationFees(),
      getBonusTable(),
    ]);
    res.json({ activationFees, bonusTable });
  } catch (err) {
    req.log.error({ err }, "Admin get control settings error");
    res.status(500).json({ error: "ServerError", message: "Failed to fetch control settings" });
  }
});

router.put("/activation-fees", async (req: Request, res: Response) => {
  try {
    const fees = req.body as Record<string, unknown>;
    const upserts: Array<{ key: string; value: string; updated_at: string }> = [];

    for (const country of COUNTRIES) {
      const val = parseFloat(String(fees[country] ?? ""));
      if (!isNaN(val) && val > 0) {
        upserts.push({ key: `activation_fee_${country}`, value: String(val), updated_at: new Date().toISOString() });
      }
    }

    if (upserts.length === 0) {
      res.status(400).json({ error: "ValidationError", message: "No valid fees provided" });
      return;
    }

    for (const row of upserts) {
      const { error } = await supabase.from("app_settings").upsert(row, { onConflict: "key" });
      if (error) throw error;
    }

    await logAdminAction(req.session.adminUsername!, "update_activation_fees", "app_settings", undefined, fees as Record<string, unknown>);
    res.json({ message: "Activation fees updated successfully" });
  } catch (err) {
    req.log.error({ err }, "Admin update activation fees error");
    res.status(500).json({ error: "ServerError", message: "Failed to update activation fees" });
  }
});

router.put("/bonus-table", async (req: Request, res: Response) => {
  try {
    const bonusTable = req.body as Record<string, Record<string, [number, number, number]>>;
    const upserts: Array<{ key: string; value: string; updated_at: string }> = [];

    for (const country of COUNTRIES) {
      if (bonusTable[country] && typeof bonusTable[country] === "object") {
        upserts.push({
          key: `bonus_table_${country}`,
          value: JSON.stringify(bonusTable[country]),
          updated_at: new Date().toISOString(),
        });
      }
    }

    if (upserts.length === 0) {
      res.status(400).json({ error: "ValidationError", message: "No valid bonus table data provided" });
      return;
    }

    for (const row of upserts) {
      const { error } = await supabase.from("app_settings").upsert(row, { onConflict: "key" });
      if (error) throw error;
    }

    await logAdminAction(req.session.adminUsername!, "update_bonus_table", "app_settings", undefined, { countries: Object.keys(bonusTable) });
    res.json({ message: "Bonus table updated successfully" });
  } catch (err) {
    req.log.error({ err }, "Admin update bonus table error");
    res.status(500).json({ error: "ServerError", message: "Failed to update bonus table" });
  }
});

export { ACTIVATION_FEE_DEFAULTS, BONUS_TABLE_DEFAULTS };
export default router;
