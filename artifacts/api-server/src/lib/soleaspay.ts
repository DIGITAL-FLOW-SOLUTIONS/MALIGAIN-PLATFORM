import crypto from "crypto";

const SOLEASPAY_BASE_URL = "https://soleaspay.com";

export type SoleasPayService = 1 | 2;

export interface SoleasPayData {
  operation?: string;
  reference?: string | null;
  external_reference?: string | null;
  transaction_reference?: string | null;
  amount?: number | string;
  currency?: string | null;
  [key: string]: unknown;
}

export interface SoleasPayResponse {
  success?: boolean;
  code?: number;
  status?: string;
  created_at?: string;
  data?: SoleasPayData | null;
  message?: string;
  [key: string]: unknown;
}

function getApiKey(): string {
  return String(process.env["SOLEASPAY_API_KEY"] ?? "").trim();
}

export function hasSoleasPayApiKey(): boolean {
  return Boolean(getApiKey());
}

function getCallbackSecret(): string {
  return String(process.env["SOLEASPAY_CALLBACK_SECRET"] ?? "").trim();
}

export function hasSoleasPayCallbackSecret(): boolean {
  return Boolean(getCallbackSecret());
}

async function readResponse(response: Response): Promise<SoleasPayResponse> {
  return (await response.json().catch(() => ({}))) as SoleasPayResponse;
}

export async function collectSoleasPay(params: {
  service: SoleasPayService;
  wallet: string;
  amount: number;
  orderId: string;
  description: string;
  payer: string;
  payerEmail: string;
  successUrl: string;
  failureUrl: string;
}): Promise<SoleasPayResponse> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      success: false,
      status: "CONFIGURATION_ERROR",
      message: "SoleasPay API key is not configured.",
    };
  }

  const response = await fetch(`${SOLEASPAY_BASE_URL}/api/agent/bills/v3`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      operation: "2",
      service: String(params.service),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      wallet: params.wallet,
      amount: Math.round(params.amount),
      currency: "XAF",
      order_id: params.orderId,
      description: params.description,
      payer: params.payer,
      payerEmail: params.payerEmail,
      successUrl: params.successUrl,
      failureUrl: params.failureUrl,
    }),
  });

  const body = await readResponse(response);
  if (!response.ok && body.success !== false) {
    body.success = false;
    body.message = body.message ?? `SoleasPay returned HTTP ${response.status}.`;
  }
  return body;
}

export async function verifySoleasPayPayment(params: {
  service: SoleasPayService;
  orderId: string;
  payId: string;
}): Promise<SoleasPayResponse> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      success: false,
      status: "CONFIGURATION_ERROR",
      message: "SoleasPay API key is not configured.",
    };
  }

  const query = new URLSearchParams({
    orderId: params.orderId,
    payId: params.payId,
  });
  const response = await fetch(`${SOLEASPAY_BASE_URL}/api/agent/verif-pay?${query}`, {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
      operation: "2",
      service: String(params.service),
    },
  });

  const body = await readResponse(response);
  if (!response.ok && body.success !== false) {
    body.success = false;
    body.message = body.message ?? `SoleasPay verification returned HTTP ${response.status}.`;
  }
  return body;
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

/**
 * SoleasPay documents x-private-key as the SHA-512 hash of the callback
 * secret. Some dashboards store the already-hashed value, so support that
 * representation without ever accepting the raw secret over the wire.
 */
export function verifySoleasPayCallbackSignature(rawBody: Buffer, providedSignature: string): boolean {
  const secret = getCallbackSecret();
  const signature = providedSignature.trim().toLowerCase();
  if (!secret || !signature) return false;

  const hashedSecret = crypto.createHash("sha512").update(secret).digest("hex");
  const configuredHash = /^[a-f0-9]{128}$/i.test(secret) ? secret.toLowerCase() : "";
  return safeEqual(signature, hashedSecret) || (configuredHash ? safeEqual(signature, configuredHash) : false);
}