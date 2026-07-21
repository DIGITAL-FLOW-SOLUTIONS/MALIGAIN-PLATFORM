import { type Request, type Response, type NextFunction } from "express";
import { supabase } from "../lib/supabase";

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.["adminId"]) {
    res.status(401).json({ error: "AuthError", message: "Admin authentication required" });
    return;
  }
  next();
}

export async function logAdminAction(
  adminUsername: string,
  action: string,
  targetType?: string,
  targetId?: string | number,
  details?: Record<string, unknown>
) {
  try {
    await supabase.from("admin_audit_log").insert({
      admin_username: adminUsername,
      action,
      target_type: targetType ?? null,
      target_id: targetId ? String(targetId) : null,
      details: details ?? null,
    });
  } catch {
    // silent — don't fail the request on audit log error
  }
}
