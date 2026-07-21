import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { supabase } from "../../lib/supabase";
import { logAdminAction } from "../../middlewares/adminAuth";

const router: IRouter = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("admin_users")
      .select("id, username, created_at")
      .order("created_at", { ascending: true });

    if (error) throw error;

    res.json({ admins: (data ?? []).map(a => ({
      id: a["id"],
      username: a["username"],
      createdAt: a["created_at"],
    })) });
  } catch (err) {
    req.log.error({ err }, "Admin list admins error");
    res.status(500).json({ error: "ServerError", message: "Failed to list admins" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || typeof username !== "string" || username.trim().length < 3) {
      res.status(400).json({ error: "ValidationError", message: "Username must be at least 3 characters" });
      return;
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      res.status(400).json({ error: "ValidationError", message: "Password must be at least 6 characters" });
      return;
    }

    const { data: existing } = await supabase
      .from("admin_users")
      .select("id")
      .eq("username", username.trim())
      .limit(1);

    if (existing && existing.length > 0) {
      res.status(409).json({ error: "Conflict", message: "Username already taken" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from("admin_users")
      .insert({ username: username.trim(), password_hash: passwordHash })
      .select("id, username, created_at")
      .single();

    if (error) throw error;

    await logAdminAction(req.session.adminUsername!, "create_admin", "admin", data["id"], { username: username.trim() });
    res.status(201).json({ message: "Admin created successfully", admin: { id: data["id"], username: data["username"], createdAt: data["created_at"] } });
  } catch (err) {
    req.log.error({ err }, "Admin create admin error");
    res.status(500).json({ error: "ServerError", message: "Failed to create admin" });
  }
});

router.put("/:adminId/password", async (req: Request, res: Response) => {
  try {
    const adminId = parseInt(String(req.params["adminId"]));
    if (isNaN(adminId)) {
      res.status(400).json({ error: "ValidationError", message: "Invalid admin ID" });
      return;
    }
    if (adminId === 1) {
      res.status(403).json({ error: "Forbidden", message: "The root admin account cannot be modified" });
      return;
    }

    const { password } = req.body;
    if (!password || typeof password !== "string" || password.length < 6) {
      res.status(400).json({ error: "ValidationError", message: "Password must be at least 6 characters" });
      return;
    }

    const { data: existing } = await supabase.from("admin_users").select("id").eq("id", adminId).limit(1);
    if (!existing || existing.length === 0) {
      res.status(404).json({ error: "NotFound", message: "Admin not found" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const { error } = await supabase.from("admin_users").update({ password_hash: passwordHash }).eq("id", adminId);
    if (error) throw error;

    await logAdminAction(req.session.adminUsername!, "update_admin_password", "admin", adminId, {});
    res.json({ message: "Admin password updated successfully" });
  } catch (err) {
    req.log.error({ err }, "Admin update admin password error");
    res.status(500).json({ error: "ServerError", message: "Failed to update password" });
  }
});

router.delete("/:adminId", async (req: Request, res: Response) => {
  try {
    const adminId = parseInt(String(req.params["adminId"]));
    if (isNaN(adminId)) {
      res.status(400).json({ error: "ValidationError", message: "Invalid admin ID" });
      return;
    }
    if (adminId === 1) {
      res.status(403).json({ error: "Forbidden", message: "The root admin account cannot be deleted" });
      return;
    }

    const { data: existing } = await supabase.from("admin_users").select("id").eq("id", adminId).limit(1);
    if (!existing || existing.length === 0) {
      res.status(404).json({ error: "NotFound", message: "Admin not found" });
      return;
    }

    const { error } = await supabase.from("admin_users").delete().eq("id", adminId);
    if (error) throw error;

    await logAdminAction(req.session.adminUsername!, "delete_admin", "admin", adminId, {});
    res.json({ message: "Admin deleted successfully" });
  } catch (err) {
    req.log.error({ err }, "Admin delete admin error");
    res.status(500).json({ error: "ServerError", message: "Failed to delete admin" });
  }
});

export default router;
