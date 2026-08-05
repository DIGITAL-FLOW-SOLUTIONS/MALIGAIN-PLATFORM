/**
 * Admin Investment Routes
 * - GET  /api/admin/investments/plans         — list all plans
 * - POST /api/admin/investments/plans         — create plan
 * - PUT  /api/admin/investments/plans/:id     — update plan
 * - DELETE /api/admin/investments/plans/:id   — delete plan
 * - GET  /api/admin/investments/payments      — list pending investment verifications
 * - POST /api/admin/investments/payments/:id/approve
 * - POST /api/admin/investments/payments/:id/reject
 * - GET  /api/admin/investments/accounts      — all user investments
 * - PATCH /api/admin/investments/accounts/:id — edit user investment (credit/debit/status)
 */
import { Router } from "express";
import { supabase } from "../../lib/supabase";
import { requireAdmin, logAdminAction } from "../../middlewares/adminAuth";

const router = Router();
router.use(requireAdmin);

function num(v: unknown): number { return parseFloat(String(v ?? "0")) || 0; }

// ── PLANS ─────────────────────────────────────────────────────────────────────

router.get("/plans", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("investment_plans")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    res.json({ plans: data ?? [] });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch plans" });
  }
});

router.post("/plans", async (req, res) => {
  try {
    const { brandName, name, category, depositAmount, dailyProfit, totalDays, totalProfit, imageUrl, country, sortOrder } = req.body;
    if (!name || !category || !depositAmount || !dailyProfit || !totalDays || !totalProfit) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }
    const { data, error } = await supabase.from("investment_plans").insert({
      brand_name: brandName ?? "TEKSAN",
      name, category,
      deposit_amount: depositAmount,
      daily_profit: dailyProfit,
      total_days: totalDays,
      total_profit: totalProfit,
      image_url: imageUrl ?? null,
      country: country ?? "ALL",
      sort_order: sortOrder ?? 0,
      is_active: true,
    }).select("*").single();
    if (error) throw error;
    const adminId = req.session["adminId"] as number;
    const { data: adminData } = await supabase.from("admins").select("username").eq("id", adminId).single();
    await logAdminAction((adminData as Record<string, unknown>)?.["username"] as string ?? "admin", "create_investment_plan", "investment_plan", String((data as Record<string, unknown>)?.["id"]), { name, category });
    res.json({ plan: data, message: "Plan created" });
  } catch (err) {
    res.status(500).json({ message: "Failed to create plan" });
  }
});

router.put("/plans/:id", async (req, res) => {
  try {
    const id = parseInt(req.params["id"]!);
    const { brandName, name, category, depositAmount, dailyProfit, totalDays, totalProfit, imageUrl, country, sortOrder, isActive } = req.body;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (brandName !== undefined) updates["brand_name"] = brandName;
    if (name !== undefined) updates["name"] = name;
    if (category !== undefined) updates["category"] = category;
    if (depositAmount !== undefined) updates["deposit_amount"] = depositAmount;
    if (dailyProfit !== undefined) updates["daily_profit"] = dailyProfit;
    if (totalDays !== undefined) updates["total_days"] = totalDays;
    if (totalProfit !== undefined) updates["total_profit"] = totalProfit;
    if (imageUrl !== undefined) updates["image_url"] = imageUrl;
    if (country !== undefined) updates["country"] = country;
    if (sortOrder !== undefined) updates["sort_order"] = sortOrder;
    if (isActive !== undefined) updates["is_active"] = isActive;

    const { error } = await supabase.from("investment_plans").update(updates).eq("id", id);
    if (error) throw error;
    const adminId = req.session["adminId"] as number;
    const { data: adminData } = await supabase.from("admins").select("username").eq("id", adminId).single();
    await logAdminAction((adminData as Record<string, unknown>)?.["username"] as string ?? "admin", "update_investment_plan", "investment_plan", String(id), updates);
    res.json({ message: "Plan updated" });
  } catch (err) {
    res.status(500).json({ message: "Failed to update plan" });
  }
});

router.delete("/plans/:id", async (req, res) => {
  try {
    const id = parseInt(req.params["id"]!);
    const { error } = await supabase.from("investment_plans").delete().eq("id", id);
    if (error) throw error;
    const adminId = req.session["adminId"] as number;
    const { data: adminData } = await supabase.from("admins").select("username").eq("id", adminId).single();
    await logAdminAction((adminData as Record<string, unknown>)?.["username"] as string ?? "admin", "delete_investment_plan", "investment_plan", String(id));
    res.json({ message: "Plan deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete plan" });
  }
});

// ── PAYMENTS (Investment verifications) ───────────────────────────────────────

router.get("/payments", async (req, res) => {
  try {
    const status = req.query["status"] as string | undefined;
    const page   = Math.max(1, parseInt(String(req.query["page"] ?? "1")));
    const limit  = 20;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("eversend_verifications")
      .select(`
        id, user_id, email, phone, screenshot_url, amount_paid, currency, status, admin_note, created_at,
        users!inner(username)
      `, { count: "exact" })
      .ilike("admin_note", "INVESTMENT%")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);

    const { data, error, count } = await query;
    if (error) throw error;

    const list = (data ?? []) as Array<Record<string, unknown>>;
    res.json({
      payments: list.map(v => ({
        id: v["id"],
        userId: v["user_id"],
        username: (v["users"] as Record<string, unknown>)?.["username"] ?? "—",
        email: v["email"],
        phone: v["phone"],
        screenshotUrl: v["screenshot_url"],
        amountPaid: num(v["amount_paid"]),
        currency: v["currency"],
        status: v["status"],
        adminNote: v["admin_note"],
        createdAt: v["created_at"],
      })),
      total: count ?? 0,
      page,
      totalPages: Math.ceil((count ?? 0) / limit),
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch investment payments" });
  }
});

router.post("/payments/:id/approve", async (req, res) => {
  try {
    const id   = parseInt(req.params["id"]!);
    const { note } = req.body;

    const { data: verif, error: verifErr } = await supabase
      .from("eversend_verifications")
      .select("user_id, admin_note, amount_paid, currency, status")
      .eq("id", id)
      .single();

    if (verifErr || !verif) { res.status(404).json({ message: "Verification not found" }); return; }
    const v = verif as Record<string, unknown>;
    if (v["status"] !== "pending") {
      res.status(409).json({ message: "This payment has already been processed." });
      return;
    }

    // Parse investment_id from admin_note
    const adminNote  = String(v["admin_note"] ?? "");
    const invIdMatch = adminNote.match(/investment_id=(\d+)/);
    const investmentId = invIdMatch ? parseInt(invIdMatch[1]!) : null;

    if (!investmentId) {
      res.status(400).json({ message: "Cannot find investment ID in note" });
      return;
    }

    const now = new Date();
    const nextCredit = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    // Activate the investment
    const { data: updatedInvestments, error: invErr } = await supabase.from("user_investments").update({
      status: "active",
      start_date: now.toISOString(),
      next_credit_at: nextCredit,
      last_credited_at: null,
      updated_at: now.toISOString(),
    }).eq("id", investmentId).eq("user_id", v["user_id"]).eq("status", "pending").select("id");

    if (invErr) throw invErr;
    if (!updatedInvestments || updatedInvestments.length === 0) {
      res.status(409).json({ message: "The investment is no longer pending." });
      return;
    }

    const { error: txErr } = await supabase.from("transactions").insert({
      user_id: v["user_id"], type: "investment", amount: num(v["amount_paid"]), status: "completed",
      description: "Investment payment verified by admin",
    });
    if (txErr) {
      await supabase.from("user_investments").update({ status: "pending", start_date: null, next_credit_at: null, last_credited_at: null, updated_at: new Date().toISOString() }).eq("id", investmentId).eq("status", "active");
      throw txErr;
    }

    // Mark verification approved
    await supabase.from("eversend_verifications").update({
      status: "approved",
      admin_note: note ? `${adminNote} | APPROVED: ${note}` : `${adminNote} | APPROVED`,
    }).eq("id", id);

    const adminId = req.session["adminId"] as number;
    const { data: adminData } = await supabase.from("admins").select("username").eq("id", adminId).single();
    await logAdminAction(
      (adminData as Record<string, unknown>)?.["username"] as string ?? "admin",
      "approve_investment_payment", "investment", String(investmentId),
      { verificationId: id, investmentId }
    );

    res.json({ message: "Investment payment approved and plan activated" });
  } catch (err) {
    res.status(500).json({ message: "Failed to approve payment" });
  }
});

router.post("/payments/:id/reject", async (req, res) => {
  try {
    const id   = parseInt(req.params["id"]!);
    const { note } = req.body;

    const { data: verif } = await supabase
      .from("eversend_verifications").select("admin_note").eq("id", id).single();
    const adminNote = String((verif as Record<string, unknown>)?.["admin_note"] ?? "");

    const invIdMatch   = adminNote.match(/investment_id=(\d+)/);
    const investmentId = invIdMatch ? parseInt(invIdMatch[1]!) : null;

    if (investmentId) {
      await supabase.from("user_investments")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", investmentId).eq("status", "pending");
    }

    await supabase.from("eversend_verifications").update({
      status: "rejected",
      admin_note: note ? `${adminNote} | REJECTED: ${note}` : `${adminNote} | REJECTED`,
    }).eq("id", id);

    res.json({ message: "Investment payment rejected" });
  } catch (err) {
    res.status(500).json({ message: "Failed to reject payment" });
  }
});

// ── ACCOUNTS (User investments) ───────────────────────────────────────────────

router.get("/accounts", async (req, res) => {
  try {
    const page    = Math.max(1, parseInt(String(req.query["page"] ?? "1")));
    const status  = req.query["status"] as string | undefined;
    const search  = req.query["search"] as string | undefined;
    const limit   = 20;
    const offset  = (page - 1) * limit;

    let query = supabase
      .from("user_investments")
      .select(`
        id, user_id, plan_name, brand_name, category, deposit_amount, daily_profit_amount,
        total_days, total_profit, total_earned, days_elapsed, status, start_date,
        next_credit_at, created_at,
        users!inner(username, email, country)
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (search) {
      query = query.ilike("users.username", `%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const list = (data ?? []) as Array<Record<string, unknown>>;
    res.json({
      accounts: list.map(i => ({
        id: i["id"],
        userId: i["user_id"],
        username: (i["users"] as Record<string, unknown>)?.["username"] ?? "—",
        email: (i["users"] as Record<string, unknown>)?.["email"] ?? "—",
        country: (i["users"] as Record<string, unknown>)?.["country"] ?? "—",
        planName: i["plan_name"],
        brandName: i["brand_name"],
        category: i["category"],
        depositAmount: num(i["deposit_amount"]),
        dailyProfitAmount: num(i["daily_profit_amount"]),
        totalDays: Number(i["total_days"]),
        totalProfit: num(i["total_profit"]),
        totalEarned: num(i["total_earned"]),
        daysElapsed: Number(i["days_elapsed"]),
        status: i["status"],
        startDate: i["start_date"],
        nextCreditAt: i["next_credit_at"],
        createdAt: i["created_at"],
      })),
      total: count ?? 0,
      page,
      totalPages: Math.ceil((count ?? 0) / limit),
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch investment accounts" });
  }
});

router.patch("/accounts/:id", async (req, res) => {
  try {
    const id = parseInt(req.params["id"]!);
    const { action, amount, reason, status } = req.body;
    const adminId = req.session["adminId"] as number;
    const { data: adminData } = await supabase.from("admins").select("username").eq("id", adminId).single();
    const adminUsername = (adminData as Record<string, unknown>)?.["username"] as string ?? "admin";

    if (action === "credit") {
      // Add to total_earned
      const { data: inv } = await supabase.from("user_investments").select("total_earned, user_id, total_profit").eq("id", id).single();
      if (!inv) { res.status(404).json({ message: "Investment not found" }); return; }
      const i = inv as Record<string, unknown>;
      const newEarned = num(i["total_earned"]) + num(amount);
      const isComplete = newEarned >= num(i["total_profit"]);
      await supabase.from("user_investments").update({
        total_earned: newEarned,
        status: isComplete ? "completed" : i["status"],
        updated_at: new Date().toISOString(),
      }).eq("id", id);

      // Credit wallet
      const { data: wallets } = await supabase.from("wallet").select("investment_balance").eq("user_id", i["user_id"]).limit(1);
      if (wallets && wallets.length > 0) {
        await supabase.from("wallet").update({
          investment_balance: num((wallets[0] as Record<string, unknown>)["investment_balance"]) + num(amount),
        }).eq("user_id", i["user_id"]);
      }
      await logAdminAction(adminUsername, "credit_investment", "investment", String(id), { amount, reason });
      res.json({ message: `Credited ${amount}` });
    } else if (action === "debit") {
      const { data: inv } = await supabase.from("user_investments").select("total_earned, user_id").eq("id", id).single();
      if (!inv) { res.status(404).json({ message: "Not found" }); return; }
      const i = inv as Record<string, unknown>;
      const newEarned = Math.max(0, num(i["total_earned"]) - num(amount));
      await supabase.from("user_investments").update({ total_earned: newEarned, updated_at: new Date().toISOString() }).eq("id", id);
      await logAdminAction(adminUsername, "debit_investment", "investment", String(id), { amount, reason });
      res.json({ message: `Debited ${amount}` });
    } else if (action === "set_status") {
      const validStatuses = ["pending", "active", "completed", "cancelled"];
      if (!validStatuses.includes(status)) { res.status(400).json({ message: "Invalid status" }); return; }
      const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (status === "active") {
        const now = new Date();
        updates["start_date"] = now.toISOString();
        updates["next_credit_at"] = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      }
      await supabase.from("user_investments").update(updates).eq("id", id);
      await logAdminAction(adminUsername, "set_investment_status", "investment", String(id), { status, reason });
      res.json({ message: `Status set to ${status}` });
    } else {
      res.status(400).json({ message: "Invalid action" });
    }
  } catch (err) {
    res.status(500).json({ message: "Failed to update investment" });
  }
});

export default router;
