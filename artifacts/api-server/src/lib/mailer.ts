import { Resend } from "resend";

const APP_URL = process.env.APP_URL ?? "https://www.maligain.com";
const FROM_ADDR = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@maligain.com";
const FROM = `MALIGAIN <${FROM_ADDR}>`;

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY || process.env.SMTP_PASS;
  if (!apiKey) throw new Error("No Resend API key set (RESEND_API_KEY or SMTP_PASS)");
  return new Resend(apiKey);
}

function buildBonusEmail(opts: {
  username: string;
  level: number;
  amount: number;
  currency: string;
  downlineUsername: string;
}): string {
  const { username, level, amount, currency, downlineUsername } = opts;
  const levelLabel = level === 1 ? "L1" : level === 2 ? "L2" : "L3";
  const formattedAmount = `${currency} ${amount.toLocaleString()}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MALIGAIN ${levelLabel} Earning</title>
</head>
<body style="margin:0;padding:0;background:#0d0518;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0518;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#1a0508;border-radius:16px;overflow:hidden;border:1px solid rgba(220,38,38,0.25);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2d0508 0%,#1a0508 100%);padding:28px 32px;text-align:center;border-bottom:1px solid rgba(220,38,38,0.2);">
              <p style="margin:0;font-size:26px;font-weight:900;color:#ffffff;letter-spacing:2px;">MALIGAIN</p>
              <p style="margin:6px 0 0;font-size:11px;color:#f87171;text-transform:uppercase;letter-spacing:3px;">MALIGAIN Earning</p>
            </td>
          </tr>

          <!-- Bonus badge -->
          <tr>
            <td style="padding:28px 32px 0;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;background:rgba(220,38,38,0.12);border:1px solid rgba(220,38,38,0.3);border-radius:12px;padding:16px 32px;">
                <tr>
                  <td style="text-align:center;">
                    <p style="margin:0;font-size:11px;color:#f87171;text-transform:uppercase;letter-spacing:2px;font-weight:700;">Level ${levelLabel} Earning</p>
                    <p style="margin:8px 0 0;font-size:36px;font-weight:900;color:#fbbf24;">${formattedAmount}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 16px;font-size:15px;color:#e2e8f0;line-height:1.6;">
                Hey <strong style="color:#ffffff;">${username}</strong> 🎉🎉,
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#e2e8f0;line-height:1.6;">
                You have just earned <strong style="color:#fbbf24;">${formattedAmount}</strong> from
                <strong style="color:#ffffff;">${downlineUsername}</strong> 🎊🎊
              </p>
              <p style="margin:0 0 8px;font-size:14px;color:#94a3b8;line-height:1.6;">
                Log in to see your updated balance and keep earning!
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 32px 28px;text-align:center;">
              <a href="${APP_URL}"
                 style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#dc2626 0%,#991b1b 100%);color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:10px;letter-spacing:0.5px;">
                Login &amp; See Dashboard
              </a>
              <p style="margin:16px 0 0;font-size:13px;color:#64748b;">
                Continue Earning with <strong style="color:#e2e8f0;">MALIGAIN</strong> 🎉🎉
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildWithdrawalEmail(opts: {
  username: string;
  grossAmount: number;
  serviceFee: number;
  netAmount: number;
  currency: string;
}): string {
  const { username, grossAmount, serviceFee, netAmount, currency } = opts;
  const fmt = (n: number) => `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MALIGAIN Withdrawal Confirmation</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#ffffff;padding:32px 36px 20px;border-bottom:3px solid #111111;">
              <p style="margin:0;font-size:26px;font-weight:900;color:#111111;text-transform:uppercase;letter-spacing:1px;line-height:1.2;">
                MALIGAIN AGENCIES<br/>WITHDRAWAL CONFIRMATION
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 36px;">
              <p style="margin:0 0 16px;font-size:15px;color:#222222;line-height:1.6;">
                Dear ${username},
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#333333;line-height:1.6;">
                We're pleased to inform you that your withdrawal request has been successfully processed. Here are the details of your transaction:
              </p>

              <!-- Transaction table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #cccccc;font-size:14px;">
                <tr>
                  <th style="border:1px solid #cccccc;padding:10px 14px;text-align:left;background:#f0f0f0;font-weight:700;color:#111111;">Transaction Details</th>
                  <th style="border:1px solid #cccccc;padding:10px 14px;text-align:right;background:#f0f0f0;font-weight:700;color:#111111;">Amount</th>
                </tr>
                <tr>
                  <td style="border:1px solid #cccccc;padding:10px 14px;color:#333333;">Requested Withdrawal</td>
                  <td style="border:1px solid #cccccc;padding:10px 14px;text-align:right;color:#333333;">${fmt(grossAmount)}</td>
                </tr>
                <tr>
                  <td style="border:1px solid #cccccc;padding:10px 14px;color:#333333;">Service Fee</td>
                  <td style="border:1px solid #cccccc;padding:10px 14px;text-align:right;color:#333333;">${fmt(serviceFee)}</td>
                </tr>
                <tr>
                  <td style="border:1px solid #cccccc;padding:10px 14px;font-weight:700;color:#111111;">Total Amount Released</td>
                  <td style="border:1px solid #cccccc;padding:10px 14px;text-align:right;font-weight:700;color:#111111;">${fmt(netAmount)}</td>
                </tr>
              </table>

              <p style="margin:24px 0 8px;font-size:14px;color:#333333;line-height:1.6;">
                Thank you for choosing <strong>MALIGAIN AGENCIES</strong>. We appreciate your trust in us!
              </p>
              <p style="margin:16px 0 0;font-size:13px;color:#888888;font-style:italic;">
                This is an automated email, please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendWithdrawalConfirmationEmail(opts: {
  toEmail: string;
  username: string;
  grossAmount: number;
  serviceFee: number;
  netAmount: number;
  currency: string;
}): Promise<void> {
  const { toEmail, username, grossAmount, netAmount, currency } = opts;
  console.log(`[mailer] Sending withdrawal confirmation to ${toEmail} (${username}) — net ${currency} ${netAmount}`);

  const resend = getResendClient();
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `MALIGAIN Withdrawal Confirmation — ${currency} ${netAmount.toLocaleString()}`,
    html: buildWithdrawalEmail(opts),
  });

  if (error) {
    console.error(`[mailer] ❌ Withdrawal email failed for ${toEmail}: ${error.message}`);
    throw new Error(error.message);
  }
  console.log(`[mailer] ✅ Withdrawal email sent to ${toEmail} | id: ${data?.id}`);
}

// ---------------------------------------------------------------------------
// Admin withdrawal request notification
// ---------------------------------------------------------------------------

function buildAdminWithdrawalNotificationEmail(opts: {
  username: string;
  phone: string;
  amount: number;
  currency: string;
  country: string;
  requestedAt: string;
}): string {
  const { username, phone, amount, currency, country, requestedAt } = opts;
  const fmt = (n: number) => `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formattedDate = new Date(requestedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Withdrawal Request</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.10);">

          <!-- Header -->
          <tr>
            <td style="background:#111111;padding:24px 36px;">
              <p style="margin:0;font-size:11px;color:#888888;text-transform:uppercase;letter-spacing:3px;font-weight:700;">MALIGAIN AGENCIES</p>
              <p style="margin:6px 0 0;font-size:20px;font-weight:900;color:#ffffff;letter-spacing:0.5px;">Withdrawal Request</p>
            </td>
          </tr>

          <!-- Alert banner -->
          <tr>
            <td style="padding:0;">
              <div style="background:#fff8e1;border-left:4px solid #f59e0b;padding:14px 36px;">
                <p style="margin:0;font-size:13px;color:#92400e;font-weight:700;">⚠ Action Required — A user has requested a withdrawal</p>
              </div>
            </td>
          </tr>

          <!-- Details table -->
          <tr>
            <td style="padding:28px 36px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
                <tr>
                  <td style="padding:10px 14px;background:#f8f9fa;border:1px solid #e0e0e0;font-weight:700;color:#111111;width:40%;">User</td>
                  <td style="padding:10px 14px;background:#ffffff;border:1px solid #e0e0e0;color:#333333;">${username}</td>
                </tr>
                <tr>
                  <td style="padding:10px 14px;background:#f8f9fa;border:1px solid #e0e0e0;font-weight:700;color:#111111;">Phone</td>
                  <td style="padding:10px 14px;background:#ffffff;border:1px solid #e0e0e0;color:#333333;">${phone}</td>
                </tr>
                <tr>
                  <td style="padding:10px 14px;background:#f8f9fa;border:1px solid #e0e0e0;font-weight:700;color:#111111;">Country</td>
                  <td style="padding:10px 14px;background:#ffffff;border:1px solid #e0e0e0;color:#333333;">${country}</td>
                </tr>
                <tr>
                  <td style="padding:10px 14px;background:#f8f9fa;border:1px solid #e0e0e0;font-weight:700;color:#111111;">Amount Requested</td>
                  <td style="padding:10px 14px;background:#ffffff;border:1px solid #e0e0e0;font-weight:700;color:#111111;font-size:15px;">${fmt(amount)}</td>
                </tr>
                <tr>
                  <td style="padding:10px 14px;background:#f8f9fa;border:1px solid #e0e0e0;font-weight:700;color:#111111;">Requested At</td>
                  <td style="padding:10px 14px;background:#ffffff;border:1px solid #e0e0e0;color:#333333;">${formattedDate}</td>
                </tr>
              </table>

              <p style="margin:24px 0 8px;font-size:14px;color:#333333;line-height:1.6;">
                Please log in to the admin panel to approve or decline this request.
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 36px 28px;">
              <a href="${APP_URL}/admin/withdrawals"
                 style="display:inline-block;padding:12px 28px;background:#111111;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;border-radius:6px;letter-spacing:0.5px;">
                Go to Admin Panel →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 36px;border-top:1px solid #eeeeee;">
              <p style="margin:0;font-size:11px;color:#999999;">This is an automated notification from MALIGAIN AGENCIES. Do not reply to this email.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendWithdrawalRequestNotificationEmail(opts: {
  toEmail: string;
  username: string;
  phone: string;
  amount: number;
  currency: string;
  country: string;
  requestedAt: string;
}): Promise<void> {
  const { toEmail, username, amount, currency } = opts;
  console.log(`[mailer] Sending withdrawal request notification to admin ${toEmail} — ${currency} ${amount} from ${username}`);

  const resend = getResendClient();
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `[Action Required] New Withdrawal Request — ${currency} ${amount.toLocaleString()} from ${username}`,
    html: buildAdminWithdrawalNotificationEmail(opts),
  });

  if (error) {
    console.error(`[mailer] ❌ Admin withdrawal notification failed for ${toEmail}: ${error.message}`);
    throw new Error(error.message);
  }
  console.log(`[mailer] ✅ Admin withdrawal notification sent to ${toEmail} | id: ${data?.id}`);
}

export async function sendReferralBonusEmail(opts: {
  toEmail: string;
  username: string;
  level: number;
  amount: number;
  currency: string;
  downlineUsername: string;
}): Promise<void> {
  const { toEmail, level, amount, currency, username, downlineUsername } = opts;
  const levelLabel = level === 1 ? "L1" : level === 2 ? "L2" : "L3";

  console.log(
    `[mailer] Sending ${levelLabel} bonus email to ${toEmail} (${username}) — ${currency} ${amount} from ${downlineUsername}`,
  );

  const resend = getResendClient();

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `MALIGAIN ${levelLabel} Earnings 🎉`,
    html: buildBonusEmail(opts),
  });

  if (error) {
    console.error(`[mailer] ❌ Failed to send email to ${toEmail} | error: ${error.message}`);
    throw new Error(error.message);
  }

  console.log(`[mailer] ✅ Email sent to ${toEmail} | id: ${data?.id}`);
}
