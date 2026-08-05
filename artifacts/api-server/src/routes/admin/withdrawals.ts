import { Router, type IRouter, type Request, type Response } from "express";
import { supabase } from "../../lib/supabase";
import { logAdminAction } from "../../middlewares/adminAuth";
import { sendWithdrawalConfirmationEmail } from "../../lib/mailer";
import { getWithdrawalRule } from "../../lib/appSettings";

const router: IRouter = Router();

function num(v: unknown) { return parseFloat(String(v ?? "0")) || 0; }

router.get("/", async (req: Request, res: Response) => {
  try {
    const status = req.query["status"] as string | undefined;
    const search = (req.query["search"] as string | undefined)?.trim() ?? "";
    const page = Math.max(1, parseInt(req.query["page"] as string ?? "1"));
    const limit = 25;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("transactions")
      .select("*, users(username, phone)", { count: "exact" })
      .eq("type", "withdrawal");

    if (status && status !== "all") query = query.eq("status", status);

    // Search: resolve matching user IDs first (can't filter on joined columns directly)
    if (search) {
      const { data: matchingUsers } = await supabase
        .from("users")
        .select("id")
        .or(`username.ilike.%${search}%,phone.ilike.%${search}%`);

      const userIds = (matchingUsers ?? []).map((u: Record<string, unknown>) => Number(u["id"]));

      if (userIds.length > 0) {
        query = query.in("user_id", userIds);
      } else {
        // No matching users — return empty result set
        query = query.eq("user_id", -1);
      }
    }

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
        userPhone: user?.["phone"] ?? null,
        amount: num(t["amount"]),
        status: t["status"],
        phoneNumber: t["phone_number"] ?? null,
        description: t["description"] ?? null,
        createdAt: t["created_at"],
      };
    });

    res.json({
      withdrawals: items,
      total: count ?? 0,
      page,
      totalPages: Math.ceil((count ?? 0) / limit),
    });
  } catch (err) {
    req.log.error({ err }, "Admin list withdrawals error");
    res.status(500).json({ error: "ServerError", message: "Failed to list withdrawals" });
  }
});

async function getWithdrawal(txnId: number) {
  const { data: txns } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", txnId)
    .eq("type", "withdrawal")
    .limit(1);
  return (txns ?? [])[0] as Record<string, unknown> | undefined;
}

// Parse the gross (wallet-deducted) amount from the transaction description.
// Description format: "Withdrawal to <phone> · Gross: <currency> <amount> · Charge: ..."
// Falls back to the stored net amount if the description doesn't contain a gross value.
function parseGrossAmount(txn: Record<string, unknown>): number {
  const desc = String(txn["description"] ?? "");
  const match = desc.match(/Gross:\s*\w+\s*([\d.]+)/);
  return match ? parseFloat(match[1]) : num(txn["amount"]);
}

router.post("/:txnId/approve", async (req: Request, res: Response) => {
  try {
    const txnId = parseInt(String(req.params["txnId"]));
    if (isNaN(txnId)) { res.status(400).json({ error: "ValidationError", message: "Invalid transaction ID" }); return; }

    const txn = await getWithdrawal(txnId);
    if (!txn) { res.status(404).json({ error: "NotFound", message: "Withdrawal not found" }); return; }

    if (txn["status"] === "completed") {
      res.status(400).json({ error: "InvalidState", message: "Withdrawal is already paid" }); return;
    }

    const userId = txn["user_id"] as number;
    const prevStatus = txn["status"] as string;

    // If the withdrawal was previously declined, the gross amount was refunded to the user's wallet.
    // Re-deduct it now so they aren't double-paid (refund reversed + admin payout).
    if (prevStatus === "failed") {
      const grossAmount = parseGrossAmount(txn);
      const { data: wallets } = await supabase.from("wallet").select("team_earnings, main_wallet").eq("user_id", userId).limit(1);
      const wallet = (wallets ?? [])[0] as Record<string, unknown> | undefined;
      if (wallet) {
        await supabase.from("wallet").update({
          team_earnings: Math.max(0, num(wallet["team_earnings"]) - grossAmount),
          main_wallet:   Math.max(0, num(wallet["main_wallet"])   - grossAmount),
        }).eq("user_id", userId);
      }
    }
    // If prevStatus === "pending": wallet was already deducted at submission — no change needed.

    await supabase.from("transactions").update({ status: "completed" }).eq("id", txnId);

    await logAdminAction(req.session.adminUsername!, "approve_withdrawal", "transaction", txnId, {
      amount: num(txn["amount"]), userId, prevStatus,
    });

    // Send withdrawal confirmation email (fire-and-forget — never fail the approval)
    try {
      const { data: userRows } = await supabase
        .from("users")
        .select("username, email, country")
        .eq("id", userId)
        .limit(1);
      const user = (userRows ?? [])[0] as Record<string, unknown> | undefined;
      if (user?.["email"]) {
        const grossAmount = parseGrossAmount(txn);
        const netAmount   = num(txn["amount"]);
        const serviceFee  = Math.max(0, grossAmount - netAmount);
        const country     = String(user["country"] ?? "KE").toUpperCase();
        const currency    = getWithdrawalRule(country).currency;
        await sendWithdrawalConfirmationEmail({
          toEmail:     String(user["email"]),
          username:    String(user["username"]),
          grossAmount,
          serviceFee,
          netAmount,
          currency,
        });
      }
    } catch (emailErr) {
      req.log.error({ emailErr }, "Withdrawal confirmation email failed (non-fatal)");
    }

    res.json({ message: "Withdrawal marked as paid" });
  } catch (err) {
    req.log.error({ err }, "Admin approve withdrawal error");
    res.status(500).json({ error: "ServerError", message: "Failed to approve withdrawal" });
  }
});

router.post("/:txnId/decline", async (req: Request, res: Response) => {
  try {
    const txnId = parseInt(String(req.params["txnId"]));
    if (isNaN(txnId)) { res.status(400).json({ error: "ValidationError", message: "Invalid transaction ID" }); return; }

    const txn = await getWithdrawal(txnId);
    if (!txn) { res.status(404).json({ error: "NotFound", message: "Withdrawal not found" }); return; }

    if (txn["status"] === "failed") {
      res.status(400).json({ error: "InvalidState", message: "Withdrawal is already declined" }); return;
    }
    if (txn["status"] === "completed") {
      res.status(400).json({ error: "InvalidState", message: "Cannot decline an already paid withdrawal" }); return;
    }

    const userId = txn["user_id"] as number;
    // Refund the gross amount — what was originally deducted from the user's wallet.
    const grossAmount = parseGrossAmount(txn);

    const { data: wallets } = await supabase.from("wallet").select("team_earnings, main_wallet").eq("user_id", userId).limit(1);
    const wallet = (wallets ?? [])[0] as Record<string, unknown> | undefined;
    if (wallet) {
      await supabase.from("wallet").update({
        team_earnings: num(wallet["team_earnings"]) + grossAmount,
        main_wallet:   num(wallet["main_wallet"])   + grossAmount,
      }).eq("user_id", userId);
    }

    await supabase.from("transactions").update({ status: "failed" }).eq("id", txnId);

    await logAdminAction(req.session.adminUsername!, "decline_withdrawal", "transaction", txnId, {
      netAmount: num(txn["amount"]), grossRefunded: grossAmount, userId,
    });
    res.json({ message: "Withdrawal declined and funds refunded" });
  } catch (err) {
    req.log.error({ err }, "Admin decline withdrawal error");
    res.status(500).json({ error: "ServerError", message: "Failed to decline withdrawal" });
  }
});

export default router;
