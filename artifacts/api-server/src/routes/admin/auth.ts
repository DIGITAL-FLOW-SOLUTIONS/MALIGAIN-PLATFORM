import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../../lib/db";

const router: IRouter = Router();

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "ValidationError", message: "Username and password required" });
      return;
    }

    const { rows } = await pool.query(
      `SELECT * FROM admin_users WHERE username = $1 LIMIT 1`,
      [username],
    );

    const admin = rows[0] as Record<string, unknown> | undefined;
    if (!admin) {
      res.status(401).json({ error: "AuthError", message: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, String(admin["password_hash"] ?? ""));
    if (!valid) {
      res.status(401).json({ error: "AuthError", message: "Invalid credentials" });
      return;
    }

    req.session!["adminId"] = admin["id"] as number;
    req.session!["adminUsername"] = String(admin["username"]);

    res.json({
      admin: { id: admin["id"], username: admin["username"] },
      message: "Logged in successfully",
    });
  } catch (err) {
    req.log.error({ err }, "Admin login error");
    res.status(500).json({ error: "ServerError", message: "Login failed" });
  }
});

router.post("/logout", (req: Request, res: Response) => {
  req.session = null;
  res.json({ message: "Logged out" });
});

router.get("/me", (req: Request, res: Response) => {
  if (!req.session?.["adminId"]) {
    res.status(401).json({ error: "AuthError", message: "Not authenticated" });
    return;
  }
  res.json({ id: req.session["adminId"], username: req.session["adminUsername"] });
});

export default router;
