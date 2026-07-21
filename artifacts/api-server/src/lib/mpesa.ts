const CONSUMER_KEY = process.env["MPESA_CONSUMER_KEY"] ?? "";
const CONSUMER_SECRET = process.env["MPESA_CONSUMER_SECRET"] ?? "";
const PASSKEY = process.env["MPESA_PASSKEY"] ?? "";
const SHORTCODE = process.env["MPESA_SHORTCODE"] ?? "";
const ENVIRONMENT = process.env["MPESA_ENVIRONMENT"] ?? "sandbox";

const BASE_URL =
  ENVIRONMENT === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

export function normalizePhone(phone: string): string {
  let p = phone.replace(/\s+/g, "").replace(/^\+/, "");
  if (p.startsWith("0")) p = "254" + p.slice(1);
  if (!p.startsWith("254")) p = "254" + p;
  return p;
}

export async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });
  if (!res.ok) {
    throw new Error(`M-Pesa auth failed: ${res.status}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export interface STKPushResult {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
  errorCode?: string;
  errorMessage?: string;
}

export async function initiateSTKPush(params: {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
  callbackUrl: string;
}): Promise<STKPushResult> {
  const token = await getAccessToken();

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const timestamp =
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds());

  const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString("base64");

  const body = {
    BusinessShortCode: SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerBuyGoodsOnline",
    Amount: Math.floor(params.amount),
    PartyA: normalizePhone(params.phoneNumber),
    PartyB: SHORTCODE,
    PhoneNumber: normalizePhone(params.phoneNumber),
    CallBackURL: params.callbackUrl,
    AccountReference: params.accountReference.substring(0, 12),
    TransactionDesc: params.transactionDesc.substring(0, 13),
  };

  const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const result = (await res.json()) as STKPushResult;
  return result;
}

export function randomActivationAmount(base: number, minOffset = -1, maxOffset = 4): number {
  const offset = Math.floor(Math.random() * (maxOffset - minOffset + 1)) + minOffset;
  return base + offset;
}
