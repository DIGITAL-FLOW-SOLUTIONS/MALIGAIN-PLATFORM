import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import { pool } from "../lib/db";
import { supabase } from "../lib/supabase";
import { requireAuth } from "../middlewares/auth";
import crypto from "crypto";
import {
  initiateSTKPush,
  normalizePhone,
  randomActivationAmount,
} from "../lib/payhero";
import { getActivationFee, getKenyaAutomaticPaymentProvider } from "../lib/appSettings";

const router: IRouter = Router();

function generateReferralCode(username: string): string {
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${username.substring(0, 3).toUpperCase()}${rand}`;
}

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

router.get("/referrer", async (req: Request, res: Response) => {
  try {
    const ref = String(req.query["code"] ?? "").trim();
    if (!ref) {
      res.json({ username: null });
      return;
    }
    const { rows } = await pool.query<{ username: string }>(
      `SELECT username
         FROM users
        WHERE username = $1 OR referral_code = $1
        ORDER BY CASE WHEN username = $1 THEN 0 ELSE 1 END
        LIMIT 1`,
      [ref],
    );
    res.json({ username: rows[0]?.username ?? null });
  } catch {
    res.json({ username: null });
  }
});

router.get("/check-email", async (req: Request, res: Response) => {
  try {
    const email = String(req.query["email"] ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      res.status(400).json({ available: false, message: "Invalid email" });
      return;
    }
    const { rows } = await pool.query<{ id: number }>(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [email],
    );
    const available = rows.length === 0;
    res.json({
      available,
      message: available ? "Email is available" : "Email is already registered",
    });
  } catch {
    res.status(500).json({ available: false, message: "Could not verify email" });
  }
});

router.get("/check-phone", async (req: Request, res: Response) => {
  try {
    const phone = String(req.query["phone"] ?? "").trim();
    if (!phone || phone.length < 7) {
      res.status(400).json({ available: false, message: "Invalid phone" });
      return;
    }
    const { rows } = await pool.query<{ id: number }>(
      `SELECT id FROM users WHERE phone = $1 LIMIT 1`,
      [phone],
    );
    const available = rows.length === 0;
    res.json({
      available,
      message: available ? "Phone number is available" : "Phone number is already registered",
    });
  } catch {
    res.status(500).json({ available: false, message: "Could not verify phone" });
  }
});

router.post("/register", async (req: Request, res: Response) => {
  try {
    const {
      username,
      email,
      password,
      phone,
      country,
      referralCode: ref,
    } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({
        error: "ValidationError",
        message: "Username, email, and password are required",
      });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({
        error: "ValidationError",
        message: "Password must be at least 6 characters",
      });
      return;
    }

    const { rows: existingEmail } = await pool.query<{ id: number }>(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [email],
    );
    if (existingEmail.length > 0) {
      res.status(409).json({ error: "ConflictError", message: "Email already registered" });
      return;
    }

    const { rows: existingUsername } = await pool.query<{ id: number }>(
      `SELECT id FROM users WHERE username = $1 LIMIT 1`,
      [username],
    );
    if (existingUsername.length > 0) {
      res.status(409).json({ error: "ConflictError", message: "Username already taken" });
      return;
    }

    let referredById: number | null = null;
    if (ref) {
      const { rows: referrer } = await pool.query<{ id: number }>(
        `SELECT id
           FROM users
          WHERE username = $1 OR referral_code = $1
          ORDER BY CASE WHEN username = $1 THEN 0 ELSE 1 END
          LIMIT 1`,
        [String(ref).trim()],
      );
      if (referrer.length > 0) {
        referredById = referrer[0]!.id;
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userReferralCode = generateReferralCode(username);

    const { rows: inserted } = await pool.query(
      `INSERT INTO users (username, email, password_hash, phone, country, referral_code, referred_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'inactive')
       RETURNING *`,
      [username, email, passwordHash, phone || null, country || null, userReferralCode, referredById],
    );

    const newUser = inserted[0] as Record<string, unknown> | undefined;
    if (!newUser) {
      res.status(500).json({ error: "ServerError", message: "Registration failed" });
      return;
    }

    await pool.query(
      `INSERT INTO wallet (user_id, team_earnings, main_wallet, total_withdrawn, total_earned, today_earnings, affiliate_balance, commissions)
       VALUES ($1, 0, 0, 0, 0, 0, 0, 0)`,
      [newUser["id"]],
    );

    req.session!["userId"] = newUser["id"] as number;

    res.status(201).json({
      user: formatUser(newUser),
      message: "Registration successful! Welcome to MALIGAIN.",
    });
  } catch (err) {
    req.log.error({ err }, "Register error");
    res.status(500).json({ error: "ServerError", message: "Registration failed" });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const identifier: string = (email ?? "").trim();

    if (!identifier || !password) {
      res.status(400).json({
        error: "ValidationError",
        message: "Username, phone number, or email and password are required",
      });
      return;
    }

    const { rows: users } = await pool.query(
      `SELECT * FROM users WHERE email = $1 OR phone = $1 OR username = $1 LIMIT 1`,
      [identifier],
    );

    if (users.length === 0) {
      res.status(401).json({
        error: "AuthError",
        message: "Invalid credentials. Please check your username, phone number, or email and password.",
      });
      return;
    }

    const user = users[0] as Record<string, unknown>;
    const valid = await bcrypt.compare(password, String(user["password_hash"] ?? ""));
    if (!valid) {
      res.status(401).json({
        error: "AuthError",
        message: "Invalid credentials. Please check your phone number or email and password.",
      });
      return;
    }

    req.session!["userId"] = user["id"] as number;

    res.json({
      user: formatUser(user),
      message: "Login successful",
    });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "ServerError", message: "Login failed" });
  }
});

router.post("/activate", requireAuth, async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      res.status(400).json({
        error: "ValidationError",
        message: "Phone number is required",
      });
      return;
    }

    const userId = req.session!["userId"] as number;

    const { rows: users } = await pool.query(
      `SELECT * FROM users WHERE id = $1 LIMIT 1`,
      [userId],
    );

    if (users.length === 0) {
      res.status(404).json({ error: "NotFound", message: "User not found" });
      return;
    }

    const user = users[0] as Record<string, unknown>;
    if (user["status"] === "active") {
      res.status(400).json({ error: "AlreadyActive", message: "Account is already active" });
      return;
    }

    if (String(user["country"] ?? "").toUpperCase() === "KE") {
      const automaticProvider = await getKenyaAutomaticPaymentProvider();
      if (automaticProvider !== "PAYHERO") {
        res.status(409).json({
          error: "PaymentProviderChanged",
          message: "PayHero is currently disabled for Kenya. Please use Hashback M-Pesa.",
          provider: automaticProvider,
        });
        return;
      }
    }

    const stkAmount = await getActivationFee("KE");
    const domain = process.env["APP_URL"] ?? `${req.protocol}://${req.get("host")}`;
    const callbackUrl = `${domain}/callbackurl/callback`;

    const stkResult = await initiateSTKPush({
      phoneNumber,
      amount: stkAmount,
      externalReference: `MUL-activate-${userId}-${Date.now()}`,
      callbackUrl,
    });

    if (!stkResult.success || !stkResult.CheckoutRequestID) {
      req.log.error({ stkResult }, "PayHero STK push failed");
      res.status(502).json({
        error: "PaymentError",
        message:
          stkResult.errorMessage ??
          stkResult.error ??
          "Failed to initiate payment. Please try again.",
      });
      return;
    }

    const { rows: txnRows } = await pool.query(
      `INSERT INTO transactions (user_id, type, amount, status, description)
       VALUES ($1, 'recharge', $2, 'pending', $3)
       RETURNING id`,
      [userId, stkAmount, `PAYHERO:${stkResult.CheckoutRequestID}:activate`],
    ).catch((txnInsertErr) => {
      req.log.error({ txnInsertErr, userId, checkoutRequestId: stkResult.CheckoutRequestID }, "Failed to insert activation transaction into DB");
      return { rows: [] };
    });

    req.log.info(
      { txnId: txnRows[0]?.id ?? null, checkoutRequestId: stkResult.CheckoutRequestID },
      "Activation transaction inserted",
    );

    res.json({
      pending: true,
      checkoutRequestId: stkResult.CheckoutRequestID,
      transactionId: txnRows[0]?.id ?? null,
      message: "M-Pesa payment prompt sent to your phone. Enter your PIN to activate.",
    });
  } catch (err) {
    req.log.error({ err }, "Activate error");
    res.status(500).json({ error: "ServerError", message: "Activation failed. Please try again." });
  }
});

// ── Password Reset ──────────────────────────────────────────────────
const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "";
const SUPABASE_ANON_KEY = process.env["SUPABASE_ANON_KEY"] ?? "";
const APP_URL = process.env["APP_URL"] ?? "";

router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes("@")) {
      res.status(400).json({ error: "ValidationError", message: "A valid email is required" });
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${APP_URL}/update-password`,
    });

    if (error) throw error;

    res.json({ message: "If that email is registered, you will receive password reset instructions shortly." });
  } catch (err) {
    req.log.error({ err }, "Forgot-password error");
    res.status(500).json({ error: "ServerError", message: "Failed to send reset email" });
  }
});

router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { accessToken, password } = req.body;

    if (!accessToken) {
      res.status(400).json({ error: "ValidationError", message: "Access token is required" });
      return;
    }
    if (!password || password.length < 6) {
      res.status(400).json({ error: "ValidationError", message: "Password must be at least 6 characters" });
      return;
    }

    // Create an anon-key client to work with the user's session
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Set the session using the recovery access token
    const { error: sessionError } = await anonClient.auth.setSession({
      access_token: accessToken,
      refresh_token: "",
    });
    if (sessionError) throw sessionError;

    // Verify the session is valid by getting the user
    const { data: userData, error: userError } = await anonClient.auth.getUser();
    if (userError || !userData.user?.email) throw userError ?? new Error("Invalid token");

    const email = userData.user.email;

    // Update password in Supabase Auth
    const { error: updateError } = await anonClient.auth.updateUser({ password });
    if (updateError) throw updateError;

    // Also update password in the local DB to keep custom auth in sync
    const passwordHash = await bcrypt.hash(password, 12);
    await pool.query(`UPDATE users SET password_hash = $1 WHERE email = $2`, [passwordHash, email]);

    res.json({ message: "Password updated successfully. You can now log in with your new password." });
  } catch (err) {
    req.log.error({ err }, "Reset-password error");
    res.status(500).json({ error: "ServerError", message: "Failed to reset password. The link may have expired." });
  }
});

router.post("/logout", (req: Request, res: Response) => {
  req.session = null;
  res.json({ message: "Logged out successfully", success: true });
});

router.get("/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM users WHERE id = $1 LIMIT 1`,
      [req.session!["userId"] as number],
    );

    if (rows.length === 0) {
      res.status(401).json({ error: "AuthError", message: "User not found" });
      return;
    }

    res.json(formatUser(rows[0] as Record<string, unknown>));
  } catch (err) {
    req.log.error({ err }, "Get me error");
    res.status(500).json({ error: "ServerError", message: "Failed to get user" });
  }
});

export default router;
