import { Router, type IRouter, type Request, type Response } from "express";
import { supabase } from "../../lib/supabase";
import { logAdminAction } from "../../middlewares/adminAuth";
import { triggerReferralBonus } from "../../lib/referralBonus";

const router: IRouter = Router();

/** Derive the purpose of a verification from its admin_note field. */
function getVerificationPurpose(adminNote: string | null | undefined, userIsInactive: boolean): "activation" | "recharge" | "investment" | "spin" {
  if (adminNote?.startsWith("INVESTMENT |")) return "investment";
  if (adminNote?.startsWith("SPIN |"))       return "spin";
  if (userIsInactive)                         return "activation";
  return "recharge";
}

function num(v: unknown) { return parseFloat(String(v ?? "0")) || 0; }

router.get("/", async (req: Request, res: Response) => {
  try {
    const status = req.query["status"] as string | undefined;
    const search = (req.query["search"] as string | undefined)?.trim() ?? "";
    const page = Math.max(1, parseInt(req.query["page"] as string ?? "1"));
    const limit = 20;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("eversend_verifications")
      .select("*, users(username, email, phone)", { count: "exact" });

    if (status && status !== "all") query = query.eq("status", status);

    // Search: resolve matching user IDs first (can't filter on joined columns directly)
    if (search) {
      const { data: matchingUsers } = await supabase
        .from("users")
        .select("id")
        .or(`username.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);

      const userIds = (matchingUsers ?? []).map((u: Record<string, unknown>) => Number(u["id"]));

      if (userIds.length > 0) {
        // Match by user OR by the phone stored directly on the verification row
        query = query.or(`user_id.in.(${userIds.join(",")}),phone.ilike.%${search}%`);
      } else {
        // No matching users — still check the phone column on the verification itself
        query = query.ilike("phone", `%${search}%`);
      }
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const items = (data ?? []).map((v: Record<string, unknown>) => {
      const user    = v["users"] as Record<string, unknown> | null;
      const note    = v["admin_note"] as string | null ?? null;
      const purpose = getVerificationPurpose(note, false); // status unknown at list level
      return {
        id: v["id"],
        userId: v["user_id"],
        username: user?.["username"] ?? "Unknown",
        email: user?.["email"] ?? "",
        phone: user?.["phone"] ?? "",
        screenshotUrl: v["screenshot_url"],
        amountPaid: num(v["amount_paid"]),
        currency: (v["currency"] as string | null) ?? "KES",
        status: v["status"],
        adminNote: note,
        purpose,
        createdAt: v["created_at"],
      };
    });

    res.json({
      verifications: items,
      total: count ?? 0,
      page,
      totalPages: Math.ceil((count ?? 0) / limit),
    });
  } catch (err) {
    req.log.error({ err }, "Admin list verifications error");
    res.status(500).json({ error: "ServerError", message: "Failed to list verifications" });
  }
});

router.post("/:id/approve", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params["id"]));
    if (isNaN(id)) { res.status(400).json({ error: "ValidationError", message: "Invalid ID" }); return; }

    const { note } = req.body ?? {};

    const { data: rows, error: fetchError } = await supabase
      .from("eversend_verifications")
      .select("user_id, amount_paid, status")
      .eq("id", id)
      .limit(1);

    if (fetchError) throw fetchError;

    const verification = (rows ?? [])[0] as Record<string, unknown> | undefined;
    if (!verification) { res.status(404).json({ error: "NotFound", message: "Verification not found" }); return; }
    if (verification["status"] !== "pending") {
      res.status(400).json({ error: "ValidationError", message: "Only pending verifications can be approved" }); return;
    }

    const userId    = verification["user_id"] as number;
    const amount    = num(verification["amount_paid"]);
    const adminNote = verification["admin_note"] as string | null ?? null;

    // Check the user's current status to decide how to handle the approval
    const { data: userRows, error: userFetchError } = await supabase
      .from("users")
      .select("status")
      .eq("id", userId)
      .limit(1);

    if (userFetchError) throw userFetchError;

    const userStatus = ((userRows ?? [])[0] as Record<string, unknown> | undefined)?.["status"] as string | undefined;
    const isInactive = userStatus === "inactive";

    // Determine purpose from admin_note (takes priority over user status)
    const purpose = getVerificationPurpose(adminNote, isInactive);

    // Atomically mark the verification as approved — the .eq("status", "pending")
    // filter ensures only one concurrent request can succeed.
    const { data: updatedRows, error: updateVerifError } = await supabase
      .from("eversend_verifications")
      .update({ status: "approved", admin_note: note ?? adminNote })
      .eq("id", id)
      .eq("status", "pending")
      .select("id");

    if (updateVerifError) throw updateVerifError;

    if (!updatedRows || updatedRows.length === 0) {
      res.status(409).json({ error: "Conflict", message: "This verification was already processed. Refresh to see the latest status." });
      return;
    }

    if (purpose === "spin") {
      // ── Spin balance top-up ───────────────────────────────────────────────
      // Fetch current spin_balance, increment it
      const { data: wallets } = await supabase
        .from("wallet")
        .select("spin_balance")
        .eq("user_id", userId)
        .limit(1);

      if (wallets && wallets.length > 0) {
        const w = wallets[0] as Record<string, unknown>;
        const newSpinBalance = num(w["spin_balance"]) + amount;
        const { error: wErr } = await supabase.from("wallet")
          .update({ spin_balance: newSpinBalance })
          .eq("user_id", userId);
        if (wErr) throw wErr;
      } else {
        // No wallet yet — create one
        await supabase.from("wallet").insert({
          user_id: userId, spin_balance: amount, spin_earnings: 0,
          main_wallet: 0, team_earnings: 0, total_withdrawn: 0,
          total_earned: 0, today_earnings: 0, affiliate_balance: 0, commissions: 0,
        });
      }

      await supabase.from("transactions").insert({
        user_id: userId, type: "recharge", amount, status: "completed",
        description: "Spin balance top-up verified by admin",
      });

      // Emit SSE so the spin page refreshes immediately
      try {
        const { spinEventBus } = await import("../../lib/spin-events");
        spinEventBus.emit(`wallet:${userId}`);
      } catch { /* non-fatal */ }

      await logAdminAction(req.session.adminUsername!, "approve_verification", "eversend_verification", id, { userId, amount, type: "spin" });
      res.json({ message: "Verification approved and spin balance credited" });

    } else if (purpose === "activation") {
      // ── Activation ────────────────────────────────────────────────────────
      const { error: updateUserError } = await supabase
        .from("users").update({ status: "active" }).eq("id", userId);
      if (updateUserError) throw updateUserError;

      await triggerReferralBonus(userId, req.log);
      await logAdminAction(req.session.adminUsername!, "approve_verification", "eversend_verification", id, { userId, type: "activation" });
      res.json({ message: "Verification approved and user activated" });

    } else {
      // ── Wallet recharge (default) ─────────────────────────────────────────
      // Always activate user in case they were somehow still inactive
      await supabase.from("users").update({ status: "active" }).eq("id", userId);

      const { error: creditError } = await supabase.rpc("credit_wallet", {
        p_user_id: userId,
        p_amount:  amount,
      });
      if (creditError) throw creditError;

      const { error: txError } = await supabase.from("transactions").insert({
        user_id: userId, type: "recharge", amount, status: "completed",
        description: "Eversend payment verified by admin",
      });
      if (txError) throw txError;

      await logAdminAction(req.session.adminUsername!, "approve_verification", "eversend_verification", id, { userId, amount, type: "recharge" });
      res.json({ message: "Verification approved and wallet credited" });
    }
  } catch (err) {
    req.log.error({ err }, "Admin approve verification error");
    res.status(500).json({ error: "ServerError", message: "Failed to approve verification" });
  }
});

router.post("/:id/reject", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params["id"]));
    if (isNaN(id)) { res.status(400).json({ error: "ValidationError", message: "Invalid ID" }); return; }

    const { note } = req.body ?? {};

    const { data: rows, error: fetchError } = await supabase
      .from("eversend_verifications")
      .select("user_id, status")
      .eq("id", id)
      .limit(1);

    if (fetchError) throw fetchError;

    const verification = (rows ?? [])[0] as Record<string, unknown> | undefined;
    if (!verification) { res.status(404).json({ error: "NotFound", message: "Verification not found" }); return; }
    if (verification["status"] !== "pending") {
      res.status(400).json({ error: "ValidationError", message: "Only pending verifications can be rejected" }); return;
    }

    const { error: updateError } = await supabase
      .from("eversend_verifications")
      .update({ status: "rejected", admin_note: note ?? null })
      .eq("id", id);

    if (updateError) throw updateError;

    await logAdminAction(req.session.adminUsername!, "reject_verification", "eversend_verification", id, { note });
    res.json({ message: "Verification rejected" });
  } catch (err) {
    req.log.error({ err }, "Admin reject verification error");
    res.status(500).json({ error: "ServerError", message: "Failed to reject verification" });
  }
});

export default router;
