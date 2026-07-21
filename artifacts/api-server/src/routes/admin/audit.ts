import { Router, type IRouter, type Request, type Response } from "express";
import { supabase } from "../../lib/supabase";

const router: IRouter = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query["page"] as string ?? "1"));
    const limit = 25;
    const offset = (page - 1) * limit;

    const { data, count, error } = await supabase
      .from("admin_audit_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const entries = (data ?? []).map((e: Record<string, unknown>) => ({
      id: e["id"],
      adminUsername: e["admin_username"],
      action: e["action"],
      targetType: e["target_type"] ?? null,
      targetId: e["target_id"] ?? null,
      details: e["details"] ?? null,
      createdAt: e["created_at"],
    }));

    res.json({
      entries,
      total: count ?? 0,
      page,
      totalPages: Math.ceil((count ?? 0) / limit),
    });
  } catch (err) {
    req.log.error({ err }, "Admin audit log error");
    res.status(500).json({ error: "ServerError", message: "Failed to get audit log" });
  }
});

export default router;
