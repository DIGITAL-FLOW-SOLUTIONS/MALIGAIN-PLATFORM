import { Router, type IRouter, type Request, type Response } from "express";
import { supabase } from "../../lib/supabase";

const router: IRouter = Router();

function num(v: unknown) { return parseFloat(String(v ?? "0")) || 0; }

router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.query["userId"] ? parseInt(req.query["userId"] as string) : undefined;
    const type = req.query["type"] as string | undefined;
    const status = req.query["status"] as string | undefined;
    const page = Math.max(1, parseInt(req.query["page"] as string ?? "1"));
    const limit = 25;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("transactions")
      .select("*, users(username)", { count: "exact" });

    if (userId && !isNaN(userId)) query = query.eq("user_id", userId);
    if (type && type !== "all") query = query.eq("type", type);
    if (status && status !== "all") query = query.eq("status", status);

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const items = (data ?? []).map((t: Record<string, unknown>) => {
      const user = t["users"] as Record<string, unknown> | null;
      return {
        id: t["id"],
        userId: t["user_id"],
        username: user?.["username"] ?? "Unknown",
        type: t["type"],
        amount: num(t["amount"]),
        status: t["status"],
        description: t["description"] ?? null,
        phoneNumber: t["phone_number"] ?? null,
        createdAt: t["created_at"],
      };
    });

    res.json({
      transactions: items,
      total: count ?? 0,
      page,
      totalPages: Math.ceil((count ?? 0) / limit),
    });
  } catch (err) {
    req.log.error({ err }, "Admin list transactions error");
    res.status(500).json({ error: "ServerError", message: "Failed to list transactions" });
  }
});

export default router;
