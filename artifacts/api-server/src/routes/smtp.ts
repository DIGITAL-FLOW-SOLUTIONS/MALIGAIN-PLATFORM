import { Router } from "express";
import { Resend } from "resend";

const router = Router();

// GET /api/smtp/config — return what config is loaded (no key value)
router.get("/config", (_req, res) => {
  const apiKey = process.env.RESEND_API_KEY || process.env.SMTP_PASS;
  res.json({
    provider:  "Resend HTTP API",
    from:      process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@maligain.com",
    apiKeySet: !!apiKey,
    apiKeyLen: apiKey?.length ?? 0,
    apiKeySource: process.env.RESEND_API_KEY ? "RESEND_API_KEY" : process.env.SMTP_PASS ? "SMTP_PASS" : null,
    appUrl:    process.env.APP_URL ?? "(not set — fallback: https://www.maligain.com)",
  });
});

// POST /api/smtp/test — send a test email via Resend HTTP API and return logs
router.post("/test", async (req, res) => {
  const { to, message } = req.body as { to?: string; message?: string };
  const logs: Array<{ ts: string; level: "INFO" | "SUCCESS" | "ERROR"; msg: string }> = [];

  function log(level: "INFO" | "SUCCESS" | "ERROR", msg: string) {
    logs.push({ ts: new Date().toISOString(), level, msg });
  }

  const apiKey = process.env.RESEND_API_KEY || process.env.SMTP_PASS;
  const fromAddr = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@maligain.com";
  const from = `MALIGAIN <${fromAddr}>`;

  log("INFO", `Provider   : Resend HTTP API (port 443 — works on Render)`);
  log("INFO", `From       : ${from}`);
  log("INFO", `API Key    : ${apiKey ? `✓ set (${apiKey.length} chars)` : "✗ NOT SET"}`);
  log("INFO", `Recipient  : ${to || "(not provided)"}`);
  log("INFO", `APP_URL    : ${process.env.APP_URL ?? "(not set)"}`);
  log("INFO", "---");

  if (!to || !to.includes("@")) {
    log("ERROR", "Invalid or missing recipient email address.");
    return res.status(400).json({ success: false, logs });
  }

  if (!apiKey) {
    log("ERROR", "No Resend API key found. Set RESEND_API_KEY (or SMTP_PASS) in your environment.");
    return res.status(500).json({ success: false, logs });
  }

  const resend = new Resend(apiKey);

  const subject = "MALIGAIN Email Debug Test";
  const html = `
    <div style="font-family:Arial,sans-serif;background:#0d0518;padding:32px;border-radius:12px;border:1px solid rgba(220,38,38,0.3);">
      <h2 style="color:#ffffff;margin:0 0 8px;">MALIGAIN Email Test</h2>
      <p style="color:#94a3b8;font-size:13px;margin:0 0 20px;">Sent via Resend HTTP API — not SMTP.</p>
      <div style="background:#1a0508;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:16px;">
        <p style="color:#e2e8f0;font-size:14px;margin:0;white-space:pre-wrap;">${(message ?? "(no message)").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
      </div>
      <p style="color:#475569;font-size:11px;margin:20px 0 0;">Sent at ${new Date().toISOString()} · MALIGAIN Debug Tool</p>
    </div>`;

  log("INFO", `Sending email to ${to} via Resend API...`);
  const startMs = Date.now();

  try {
    const { data, error } = await resend.emails.send({ from, to, subject, html });

    const elapsed = Date.now() - startMs;

    if (error) {
      log("ERROR", `Resend API returned an error after ${elapsed}ms: ${error.message}`);
      return res.status(500).json({ success: false, logs });
    }

    log("SUCCESS", `Email accepted by Resend in ${elapsed}ms`);
    log("SUCCESS", `Resend Email ID: ${data?.id}`);
    log("INFO", "---");
    log("INFO", "Email is now queued by Resend for delivery. Check your Resend dashboard");
    log("INFO", "at resend.com/emails for delivery status and any bounce/spam events.");
    log("SUCCESS", "--- DONE ---");
    return res.json({ success: true, logs });
  } catch (err: any) {
    const elapsed = Date.now() - startMs;
    log("ERROR", `Request failed after ${elapsed}ms: ${err?.message ?? err}`);
    return res.status(500).json({ success: false, logs });
  }
});

export default router;
