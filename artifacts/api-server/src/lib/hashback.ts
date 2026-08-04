import crypto from "crypto";

const HASHBACK_BASE_URL = "https://api.hashback.co.ke";

export interface HashbackPullData {
  transactionId?: string;
  amount?: number | string;
  billreference?: string;
  AccName?: string;
  [key: string]: unknown;
}

export interface HashbackPullResult {
  success: boolean;
  data?: HashbackPullData;
  message?: string;
}

export function getHashbackAccountId(): string {
  return String(process.env["hashback_account_id"] ?? "").trim();
}

function getHashbackApiKey(): string {
  return String(process.env["hashback_api_key"] ?? "").trim();
}

export function hasHashbackWebhookSecret(): boolean {
  return Boolean(String(process.env["HASHBACK_WEBHOOK_SECRET"] ?? "").trim());
}

export function verifyHashbackSignature(rawBody: Buffer, signature: string): boolean {
  const secret = String(process.env["HASHBACK_WEBHOOK_SECRET"] ?? "").trim();
  if (!secret || !signature.startsWith("sha256=")) return false;

  const expected = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")}`;

  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function pullHashbackTransaction(
  transactionId: string,
): Promise<HashbackPullResult> {
  const apiKey = getHashbackApiKey();
  const accountId = getHashbackAccountId();

  if (!apiKey || !accountId) {
    return { success: false, message: "Hashback API credentials are not configured" };
  }

  const response = await fetch(`${HASHBACK_BASE_URL}/v1/pullapi`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      account_id: accountId,
      transaction_id: transactionId,
    }),
  });

  const body = (await response.json().catch(() => ({}))) as HashbackPullResult;
  if (!response.ok) {
    return {
      success: false,
      message: body.message ?? `Hashback PULL API returned HTTP ${response.status}`,
    };
  }

  return body;
}