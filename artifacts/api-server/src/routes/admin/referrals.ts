import { Router, type IRouter, type Request, type Response } from "express";
import { supabase } from "../../lib/supabase";
import { logAdminAction } from "../../middlewares/adminAuth";

const router: IRouter = Router();

function num(v: unknown) { return parseFloat(String(v ?? "0")) || 0; }

router.get("/bonuses", async (req: Request, res: Response) => {
  try {
    const page  = Math.max(1, parseInt((req.query["page"] as string) ?? "1"));
    const search = (req.query["search"] as string | undefined)?.trim() ?? "";
    const limit = 20;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("bonus_history")
      .select("*, users!bonus_history_user_id_fkey(username, email, phone)", { count: "exact" });

    // Two-step search: resolve user IDs first
    if (search) {
      const { data: matchingUsers } = await supabase
        .from("users")
        .select("id")
        .or(`username.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);

      const userIds = (matchingUsers ?? []).map((u: Record<string, unknown>) => Number(u["id"]));

      if (userIds.length > 0) {
        query = query.in("user_id", userIds);
      } else {
        query = query.eq("user_id", -1);
      }
    }

    const { data, count, error } = await query
      .order("claimed_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const items = (data ?? []).map((b: Record<string, unknown>) => {
      const user = b["users"] as Record<string, unknown> | null;
      return {
        id: b["id"],
        userId: b["user_id"],
        username: user?.["username"] ?? "Unknown",
        email: user?.["email"] ?? "",
        phone: user?.["phone"] ?? "",
        amount: num(b["amount"]),
        level: b["level"] ?? null,
        fromUserId: b["from_user_id"] ?? null,
        description: String(b["description"] ?? ""),
        createdAt: b["claimed_at"],
      };
    });

    res.json({
      bonuses: items,
      total: count ?? 0,
      page,
      totalPages: Math.ceil((count ?? 0) / limit),
    });
  } catch (err) {
    req.log.error({ err }, "Admin list referral bonuses error");
    res.status(500).json({ error: "ServerError", message: "Failed to list referral bonuses" });
  }
});

router.post("/bonus", async (req: Request, res: Response) => {
  try {
    const { userId, amount, walletField, reason } = req.body;
    const validFields = ["team_earnings", "affiliate_balance", "commissions"];

    if (!userId || isNaN(Number(userId))) {
      res.status(400).json({ error: "ValidationError", message: "Valid userId required" }); return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      res.status(400).json({ error: "ValidationError", message: "Amount must be positive" }); return;
    }
    if (!walletField || !validFields.includes(walletField)) {
      res.status(400).json({ error: "ValidationError", message: "Invalid wallet field" }); return;
    }
    if (!reason) {
      res.status(400).json({ error: "ValidationError", message: "Reason is required" }); return;
    }

    const { data: wallets } = await supabase.from("wallet").select("*").eq("user_id", Number(userId)).limit(1);
    const wallet = (wallets ?? [])[0] as Record<string, unknown> | undefined;

    if (!wallet) {
      res.status(404).json({ error: "NotFound", message: "Wallet not found" }); return;
    }

    const current = num(wallet[walletField]);
    await supabase.from("wallet").update({
      [walletField]: current + Number(amount),
      total_earned: num(wallet["total_earned"]) + Number(amount),
    }).eq("user_id", Number(userId));

    await supabase.from("transactions").insert({
      user_id: Number(userId),
      type: "referral",
      amount: Number(amount),
      status: "completed",
      description: `Admin referral bonus: ${reason}`,
    });

    await logAdminAction(req.session.adminUsername!, "add_referral_bonus", "user", Number(userId), {
      walletField, amount: Number(amount), reason,
    });

    res.json({ message: `Referral bonus of ${amount} added to ${walletField}` });
  } catch (err) {
    req.log.error({ err }, "Admin add referral bonus error");
    res.status(500).json({ error: "ServerError", message: "Failed to add referral bonus" });
  }
});

export default router;
