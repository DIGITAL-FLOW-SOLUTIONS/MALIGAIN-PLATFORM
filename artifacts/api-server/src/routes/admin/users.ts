import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { supabase } from "../../lib/supabase";
import { logAdminAction } from "../../middlewares/adminAuth";

const router: IRouter = Router();

function num(v: unknown) { return parseFloat(String(v ?? "0")) || 0; }

function fmtUser(u: Record<string, unknown>) {
  return {
    id: u["id"],
    username: u["username"],
    email: u["email"],
    phone: u["phone"] ?? null,
    country: u["country"] ?? null,
    status: u["status"],
    referralCode: u["referral_code"],
    createdAt: u["created_at"],
    referredBy: u["referred_by"] ?? null,
  };
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const search = req.query["search"] as string | undefined;
    const status = req.query["status"] as string | undefined;
    const country = req.query["country"] as string | undefined;
    const page = Math.max(1, parseInt(req.query["page"] as string ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(req.query["limit"] as string ?? "20")));
    const offset = (page - 1) * limit;

    let query = supabase.from("users").select("*", { count: "exact" });

    if (status && status !== "all") query = query.eq("status", status);
    if (country) query = query.ilike("country", `%${country}%`);
    if (search) {
      query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: users, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const total = count ?? 0;
    res.json({
      users: (users ?? []).map(u => fmtUser(u as Record<string, unknown>)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    req.log.error({ err }, "Admin list users error");
    res.status(500).json({ error: "ServerError", message: "Failed to list users" });
  }
});

router.get("/:userId", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(String(req.params["userId"]));
    if (isNaN(userId)) { res.status(400).json({ error: "ValidationError", message: "Invalid user ID" }); return; }

    const [{ data: users }, { data: wallets }, { count: totalReferrals }, { count: taskCompletions }] = await Promise.all([
      supabase.from("users").select("*, upline:referred_by(id, username)").eq("id", userId).limit(1),
      supabase.from("wallet").select("*").eq("user_id", userId).limit(1),
      supabase.from("users").select("id", { count: "exact", head: true }).eq("referred_by", userId),
      supabase.from("task_completions").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);

    const user = (users ?? [])[0] as Record<string, unknown> | undefined;
    if (!user) { res.status(404).json({ error: "NotFound", message: "User not found" }); return; }

    const uplineData = user["upline"] as Record<string, unknown> | null;
    const referredByUsername: string | null = uplineData?.["username"] as string ?? null;

    const wallet = (wallets ?? [])[0] as Record<string, unknown> | undefined;
    res.json({
      user: { ...fmtUser(user), referredByUsername },
      wallet: wallet ? {
        mainWallet: num(wallet["main_wallet"]),
        teamEarnings: num(wallet["team_earnings"]),
        affiliateBalance: num(wallet["affiliate_balance"]),
        commissions: num(wallet["commissions"]),
        totalEarned: num(wallet["total_earned"]),
        totalWithdrawn: num(wallet["total_withdrawn"]),
        todayEarnings: num(wallet["today_earnings"]),
      } : null,
      totalReferrals: totalReferrals ?? 0,
      taskCompletions: taskCompletions ?? 0,
    });
  } catch (err) {
    req.log.error({ err }, "Admin get user error");
    res.status(500).json({ error: "ServerError", message: "Failed to get user" });
  }
});

router.put("/:userId", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(String(req.params["userId"]));
    if (isNaN(userId)) { res.status(400).json({ error: "ValidationError", message: "Invalid user ID" }); return; }

    const { username, email, phone, country, referredById } = req.body;
    const updates: Record<string, unknown> = {};
    if (username) updates["username"] = username;
    if (email) updates["email"] = email;
    if (phone !== undefined) updates["phone"] = phone;
    if (country !== undefined) updates["country"] = country;
    if (referredById !== undefined) {
      if (referredById !== null && referredById === userId) {
        res.status(400).json({ error: "ValidationError", message: "A user cannot be their own upline" }); return;
      }
      // Verify the upline exists when a non-null ID is provided
      if (referredById !== null) {
        const { data: uplineCheck } = await supabase.from("users").select("id").eq("id", referredById).limit(1);
        if (!uplineCheck || uplineCheck.length === 0) {
          res.status(404).json({ error: "NotFound", message: "Upline user not found" }); return;
        }
      }
      updates["referred_by"] = referredById;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "ValidationError", message: "Nothing to update" }); return;
    }

    await supabase.from("users").update(updates).eq("id", userId);
    await logAdminAction(req.session.adminUsername!, "update_user", "user", userId, updates);
    res.json({ message: "User updated successfully" });
  } catch (err) {
    req.log.error({ err }, "Admin update user error");
    res.status(500).json({ error: "ServerError", message: "Failed to update user" });
  }
});

router.post("/:userId/status", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(String(req.params["userId"]));
    if (isNaN(userId)) { res.status(400).json({ error: "ValidationError", message: "Invalid user ID" }); return; }

    const { status, reason } = req.body;
    const validStatuses = ["active", "inactive", "suspended"];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: "ValidationError", message: "Status must be active, inactive, or suspended" }); return;
    }

    await supabase.from("users").update({ status }).eq("id", userId);
    await logAdminAction(req.session.adminUsername!, "set_user_status", "user", userId, { status, reason });
    res.json({ message: `User status set to ${status}` });
  } catch (err) {
    req.log.error({ err }, "Admin set user status error");
    res.status(500).json({ error: "ServerError", message: "Failed to update status" });
  }
});

router.get("/:userId/wallet", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(String(req.params["userId"]));
    if (isNaN(userId)) { res.status(400).json({ error: "ValidationError", message: "Invalid user ID" }); return; }

    const { data: wallets } = await supabase.from("wallet").select("*").eq("user_id", userId).limit(1);
    const wallet = (wallets ?? [])[0] as Record<string, unknown> | undefined;
    if (!wallet) { res.status(404).json({ error: "NotFound", message: "Wallet not found" }); return; }

    res.json({
      mainWallet: num(wallet["main_wallet"]),
      teamEarnings: num(wallet["team_earnings"]),
      affiliateBalance: num(wallet["affiliate_balance"]),
      commissions: num(wallet["commissions"]),
      totalEarned: num(wallet["total_earned"]),
      totalWithdrawn: num(wallet["total_withdrawn"]),
      todayEarnings: num(wallet["today_earnings"]),
    });
  } catch (err) {
    req.log.error({ err }, "Admin get wallet error");
    res.status(500).json({ error: "ServerError", message: "Failed to get wallet" });
  }
});

router.post("/:userId/wallet/credit", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(String(req.params["userId"]));
    if (isNaN(userId)) { res.status(400).json({ error: "ValidationError", message: "Invalid user ID" }); return; }

    const { field, amount, reason } = req.body;
    const validFields = ["main_wallet", "team_earnings", "affiliate_balance", "commissions"];
    if (!field || !validFields.includes(field)) {
      res.status(400).json({ error: "ValidationError", message: "Invalid wallet field" }); return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      res.status(400).json({ error: "ValidationError", message: "Amount must be positive" }); return;
    }
    if (!reason) {
      res.status(400).json({ error: "ValidationError", message: "Reason is required" }); return;
    }

    const { data: wallets } = await supabase.from("wallet").select("*").eq("user_id", userId).limit(1);
    const wallet = (wallets ?? [])[0] as Record<string, unknown> | undefined;
    if (!wallet) { res.status(404).json({ error: "NotFound", message: "Wallet not found" }); return; }

    const current = num(wallet[field]);
    const newVal = current + Number(amount);
    await supabase.from("wallet").update({ [field]: newVal, total_earned: num(wallet["total_earned"]) + Number(amount) }).eq("user_id", userId);

    await supabase.from("transactions").insert({
      user_id: userId,
      type: "credit",
      amount: Number(amount),
      status: "completed",
      description: `Admin credit: ${reason}`,
    });

    await logAdminAction(req.session.adminUsername!, "credit_wallet", "user", userId, { field, amount: Number(amount), reason });
    res.json({ message: `Credited ${amount} to ${field} successfully` });
  } catch (err) {
    req.log.error({ err }, "Admin credit wallet error");
    res.status(500).json({ error: "ServerError", message: "Failed to credit wallet" });
  }
});

router.post("/:userId/wallet/debit", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(String(req.params["userId"]));
    if (isNaN(userId)) { res.status(400).json({ error: "ValidationError", message: "Invalid user ID" }); return; }

    const { field, amount, reason } = req.body;
    const validFields = ["main_wallet", "team_earnings", "affiliate_balance", "commissions"];
    if (!field || !validFields.includes(field)) {
      res.status(400).json({ error: "ValidationError", message: "Invalid wallet field" }); return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      res.status(400).json({ error: "ValidationError", message: "Amount must be positive" }); return;
    }
    if (!reason) {
      res.status(400).json({ error: "ValidationError", message: "Reason is required" }); return;
    }

    const { data: wallets } = await supabase.from("wallet").select("*").eq("user_id", userId).limit(1);
    const wallet = (wallets ?? [])[0] as Record<string, unknown> | undefined;
    if (!wallet) { res.status(404).json({ error: "NotFound", message: "Wallet not found" }); return; }

    const current = num(wallet[field]);
    if (current < Number(amount)) {
      res.status(400).json({ error: "InsufficientFunds", message: "Insufficient balance in that field" }); return;
    }

    await supabase.from("wallet").update({ [field]: current - Number(amount) }).eq("user_id", userId);

    await supabase.from("transactions").insert({
      user_id: userId,
      type: "debit",
      amount: Number(amount),
      status: "completed",
      description: `Admin debit: ${reason}`,
    });

    await logAdminAction(req.session.adminUsername!, "debit_wallet", "user", userId, { field, amount: Number(amount), reason });
    res.json({ message: `Debited ${amount} from ${field} successfully` });
  } catch (err) {
    req.log.error({ err }, "Admin debit wallet error");
    res.status(500).json({ error: "ServerError", message: "Failed to debit wallet" });
  }
});

router.post("/:userId/reset-password", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(String(req.params["userId"]));
    if (isNaN(userId)) { res.status(400).json({ error: "ValidationError", message: "Invalid user ID" }); return; }

    const { password } = req.body;
    if (!password || typeof password !== "string" || password.length < 6) {
      res.status(400).json({ error: "ValidationError", message: "Password must be at least 6 characters" }); return;
    }

    const hashed = await bcrypt.hash(password, 10);
    const { error } = await supabase.from("users").update({ password_hash: hashed }).eq("id", userId);
    if (error) throw error;

    await logAdminAction(req.session.adminUsername!, "reset_password", "user", userId, {});
    res.json({ message: "Password reset successfully" });
  } catch (err) {
    req.log.error({ err }, "Admin reset password error");
    res.status(500).json({ error: "ServerError", message: "Failed to reset password" });
  }
});

router.delete("/:userId", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(String(req.params["userId"]));
    if (isNaN(userId)) { res.status(400).json({ error: "ValidationError", message: "Invalid user ID" }); return; }

    const { data: users, error: lookupErr } = await supabase.from("users").select("id").eq("id", userId).limit(1);
    if (lookupErr) throw lookupErr;
    if (!users || users.length === 0) { res.status(404).json({ error: "NotFound", message: "User not found" }); return; }

    const steps: Array<{ name: string; run: () => PromiseLike<{ error: unknown }> }> = [
      { name: "task_completions",      run: () => supabase.from("task_completions").delete().eq("user_id", userId) },
      { name: "purchases",             run: () => supabase.from("purchases").delete().eq("user_id", userId) },
      { name: "eversend_verifications",run: () => supabase.from("eversend_verifications").delete().eq("user_id", userId) },
      { name: "transactions",          run: () => supabase.from("transactions").delete().eq("user_id", userId) },
      { name: "wallet",                run: () => supabase.from("wallet").delete().eq("user_id", userId) },
      // Detach downline users so the parent user can be deleted without violating FK
      { name: "users.referred_by",     run: () => supabase.from("users").update({ referred_by: null }).eq("referred_by", userId) },
      { name: "users",                 run: () => supabase.from("users").delete().eq("id", userId) },
    ];

    for (const step of steps) {
      const { error } = await step.run();
      if (error) {
        const code = (error as { code?: string }).code;
        const message = (error as { message?: string }).message ?? "";
        // Tolerate tables that simply don't exist in this database (PostgREST: PGRST205 / "schema cache")
        if (code === "PGRST205" || message.includes("schema cache")) {
          req.log.warn({ step: step.name, userId, message }, "Admin delete user: skipping missing table");
          continue;
        }
        req.log.error({ err: error, step: step.name, userId }, "Admin delete user step failed");
        res.status(500).json({ error: "ServerError", message: `Failed to delete user (${step.name}): ${message || "unknown error"}` });
        return;
      }
    }

    // Verify the user is really gone
    const { data: stillThere } = await supabase.from("users").select("id").eq("id", userId).limit(1);
    if (stillThere && stillThere.length > 0) {
      req.log.error({ userId }, "Admin delete user: row still present after delete");
      res.status(500).json({ error: "ServerError", message: "User row was not removed (database did not report an error). Check for additional foreign-key references." });
      return;
    }

    await logAdminAction(req.session.adminUsername!, "delete_user", "user", userId, {});
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    req.log.error({ err }, "Admin delete user error");
    res.status(500).json({ error: "ServerError", message: "Failed to delete user" });
  }
});

router.get("/:userId/referrals", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(String(req.params["userId"]));
    if (isNaN(userId)) { res.status(400).json({ error: "ValidationError", message: "Invalid user ID" }); return; }

    const { data: level1Users } = await supabase
      .from("users").select("id, username, phone, status, created_at").eq("referred_by", userId);

    const l1 = (level1Users ?? []) as Array<Record<string, unknown>>;
    const l1Ids = l1.map(u => u["id"] as number);

    let l2: Array<Record<string, unknown>> = [];
    let l2Ids: number[] = [];
    if (l1Ids.length > 0) {
      const { data: level2Users } = await supabase
        .from("users").select("id, username, phone, status, created_at").in("referred_by", l1Ids);
      l2 = (level2Users ?? []) as Array<Record<string, unknown>>;
      l2Ids = l2.map(u => u["id"] as number);
    }

    let l3: Array<Record<string, unknown>> = [];
    if (l2Ids.length > 0) {
      const { data: level3Users } = await supabase
        .from("users").select("id, username, phone, status, created_at").in("referred_by", l2Ids);
      l3 = (level3Users ?? []) as Array<Record<string, unknown>>;
    }

    const fmt = (u: Record<string, unknown>, level: number) => ({
      id: u["id"],
      username: u["username"],
      phone: u["phone"] ?? null,
      status: u["status"],
      joinedAt: u["created_at"],
      level,
    });

    res.json({
      level1: l1.map(u => fmt(u, 1)),
      level2: l2.map(u => fmt(u, 2)),
      level3: l3.map(u => fmt(u, 3)),
      totalCount: l1.length + l2.length + l3.length,
    });
  } catch (err) {
    req.log.error({ err }, "Admin get referrals error");
    res.status(500).json({ error: "ServerError", message: "Failed to get referral tree" });
  }
});

export default router;
