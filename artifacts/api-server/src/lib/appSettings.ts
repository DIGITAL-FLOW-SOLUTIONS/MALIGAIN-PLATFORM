import { supabase } from "./supabase";

export const COUNTRIES = ["KE", "UG", "TZ", "GH", "ZM", "CM"] as const;
export type CountryCode = (typeof COUNTRIES)[number];

export const COUNTRY_CURRENCY: Record<string, string> = {
  KE: "KES", UG: "UGX", TZ: "TZS", GH: "GHS", ZM: "ZMW", CM: "XAF",
};

export const ACTIVATION_FEE_DEFAULTS: Record<string, number> = {
  KE: 100, TZ: 7500, UG: 10000, ZM: 100, GH: 55, CM: 2510,
};

export const BONUS_TABLE_DEFAULTS: Record<string, Record<string, [number, number, number]>> = {
  KE: { KE:[80,0,0],    UG:[174,87,34],      TZ:[151,100,50],   GH:[237,177,118], ZM:[275,137,70],  CM:[273,136,80]  },
  TZ: { KE:[1983,396,0],UG:[3451,1726,674],  TZ:[2995,1983,991],GH:[4701,3511,2340],ZM:[5454,2717,1388],CM:[5415,2697,1587] },
  ZM: { KE:[14,3,0],    UG:[25,12,5],        TZ:[21,14,7],      GH:[34,25,17],    ZM:[39,19,10],    CM:[39,19,11]    },
  CM: { KE:[438,87,0],  UG:[762,381,148],    TZ:[661,438,219],  GH:[1000,775,516],ZM:[1205,600,306],CM:[1196,595,350] },
  GH: { KE:[8,1,0],     UG:[14,7,2],         TZ:[12,8,4],       GH:[20,14,10],    ZM:[23,11,5],     CM:[23,11,6]     },
  UG: { KE:[2868,573,0],UG:[5000,2500,1000], TZ:[4331,2868,1434],GH:[6797,5076,3384],ZM:[7887,3929,2000],CM:[7830,3900,2294] },
};

export async function getActivationFees(): Promise<Record<string, number>> {
  const keys = COUNTRIES.map(c => `activation_fee_${c}`);
  const { data } = await supabase.from("app_settings").select("key, value").in("key", keys);
  const result: Record<string, number> = { ...ACTIVATION_FEE_DEFAULTS };
  for (const row of (data ?? []) as Array<{ key: string; value: string }>) {
    const code = row.key.replace("activation_fee_", "");
    const val = parseFloat(row.value);
    if (!isNaN(val) && val > 0) result[code] = val;
  }
  return result;
}

export async function getActivationFee(countryCode: string): Promise<number> {
  const fees = await getActivationFees();
  return fees[countryCode.toUpperCase()] ?? ACTIVATION_FEE_DEFAULTS[countryCode.toUpperCase()] ?? 100;
}

export async function getBonusTable(): Promise<Record<string, Record<string, [number, number, number]>>> {
  const keys = COUNTRIES.map(c => `bonus_table_${c}`);
  const { data } = await supabase.from("app_settings").select("key, value").in("key", keys);
  const result: Record<string, Record<string, [number, number, number]>> = {};
  for (const country of COUNTRIES) {
    result[country] = { ...(BONUS_TABLE_DEFAULTS[country] ?? {}) };
  }
  for (const row of (data ?? []) as Array<{ key: string; value: string }>) {
    const code = row.key.replace("bonus_table_", "");
    try {
      const parsed = JSON.parse(row.value) as Record<string, [number, number, number]>;
      if (parsed && typeof parsed === "object") result[code] = parsed;
    } catch { /* keep default */ }
  }
  return result;
}
