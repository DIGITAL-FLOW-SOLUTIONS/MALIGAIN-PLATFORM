import { supabase } from "./supabase";

function getPayHeroAuth(): string {
  // Prefer constructing from username+password (guaranteed format: base64(user:pass))
  const username = process.env["PAYHERO_API_username"];
  const password = process.env["PAYHERO_API_password"];
  if (username && password) {
    return Buffer.from(`${username}:${password}`).toString("base64");
  }
  // Fallback: use the pre-built token from the dashboard (assumed already base64)
  return process.env["PAYHERO_Basic_Auth_token"] ?? "";
}

/** Reads the active PayHero channel ID from app_settings.
 *  Falls back to the PAYHERO_Channel_ID env var if no DB record exists. */
async function getActiveChannelId(): Promise<number> {
  try {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "payhero_active_channel")
      .single();
    if (data && (data as { value: string }).value) {
      const id = parseInt((data as { value: string }).value, 10);
      if (!isNaN(id) && id > 0) return id;
    }
  } catch {
    // fall through to env var
  }
  return parseInt(process.env["PAYHERO_Channel_ID"] ?? "0", 10);
}

export function normalizePhone(phone: string): string {
  let p = phone.replace(/\s+/g, "").replace(/^\+/, "");
  if (p.startsWith("0")) p = "254" + p.slice(1);
  if (!p.startsWith("254")) p = "254" + p;
  return "+" + p;
}

export interface PayHeroSTKResult {
  success: boolean;
  status: string;
  reference: string;
  CheckoutRequestID: string;
  errorMessage?: string;
  error?: string;
}

export async function initiateSTKPush(params: {
  phoneNumber: string;
  amount: number;
  externalReference: string;
  callbackUrl: string;
}): Promise<PayHeroSTKResult> {
  const channelId = await getActiveChannelId();

  const body = {
    amount: Math.floor(params.amount),
    phone_number: normalizePhone(params.phoneNumber),
    channel_id: channelId,
    provider: "m-pesa",
    external_reference: params.externalReference,
    callback_url: params.callbackUrl,
  };

  const res = await fetch("https://backend.payhero.co.ke/api/v2/payments", {
    method: "POST",
    headers: {
      Authorization: `Basic ${getPayHeroAuth()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    return {
      success: false,
      status: "FAILED",
      reference: "",
      CheckoutRequestID: "",
      error: `PayHero API error ${res.status}: ${text}`,
    };
  }

  return (await res.json()) as PayHeroSTKResult;
}

export function randomActivationAmount(base: number, minOffset = -1, maxOffset = 4): number {
  const offset = Math.floor(Math.random() * (maxOffset - minOffset + 1)) + minOffset;
  return base + offset;
}
