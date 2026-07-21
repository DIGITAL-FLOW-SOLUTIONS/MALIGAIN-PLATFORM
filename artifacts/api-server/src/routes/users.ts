import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { supabase } from "../lib/supabase";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();
router.use(requireAuth);

function formatUser(user: Record<string, unknown>) {
  const username = String(user["username"] ?? "");
  return {
    id: user["id"],
    username,
    email: user["email"],
    phone: user["phone"] ?? null,
    country: user["country"] ?? null,
    referralCode: user["referral_code"],
    status: user["status"],
    avatarInitials: username.substring(0, 2).toUpperCase(),
    createdAt: user["created_at"],
  };
}

router.put("/profile", async (req: Request, res: Response) => {
  try {
    const { username, country, phone } = req.body;
    const userId = req.session.userId!;

    const updates: Record<string, unknown> = {};
    if (username) updates["username"] = username;
    if (country !== undefined) updates["country"] = country;
    if (phone !== undefined) updates["phone"] = phone;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "ValidationError", message: "Nothing to update" });
      return;
    }

    const { data: updated, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error || !updated) {
      res.status(500).json({ error: "ServerError", message: "Failed to update profile" });
      return;
    }

    res.json(formatUser(updated as Record<string, unknown>));
  } catch (err) {
    req.log.error({ err }, "Update profile error");
    res.status(500).json({ error: "ServerError", message: "Failed to update profile" });
  }
});

router.put("/change-password", async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.session.userId!;

    if (!currentPassword || !newPassword || !confirmPassword) {
      res.status(400).json({ error: "ValidationError", message: "All password fields are required" });
      return;
    }
    if (newPassword !== confirmPassword) {
      res.status(400).json({ error: "ValidationError", message: "New passwords do not match" });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ error: "ValidationError", message: "Password must be at least 6 characters" });
      return;
    }

    const { data: users } = await supabase
      .from("users")
      .select("password_hash")
      .eq("id", userId)
      .limit(1);

    if (!users || users.length === 0) {
      res.status(404).json({ error: "NotFound", message: "User not found" });
      return;
    }

    const user = users[0] as Record<string, unknown>;
    const valid = await bcrypt.compare(currentPassword, String(user["password_hash"] ?? ""));
    if (!valid) {
      res.status(400).json({ error: "AuthError", message: "Current password is incorrect" });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await supabase.from("users").update({ password_hash: newHash }).eq("id", userId);

    res.json({ message: "Password changed successfully", success: true });
  } catch (err) {
    req.log.error({ err }, "Change password error");
    res.status(500).json({ error: "ServerError", message: "Failed to change password" });
  }
});

export default router;
