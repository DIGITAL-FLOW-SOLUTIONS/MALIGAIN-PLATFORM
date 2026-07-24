import { supabase } from "./supabase";

export const COUNTRIES = ["KE", "UG", "TZ", "GH", "ZM", "CM", "BW", "RW", "CG", "MW", "NG", "SS", "BI"] as const;
export type CountryCode = (typeof COUNTRIES)[number];

export const COUNTRY_CURRENCY: Record<string, string> = {
  KE: "KES", UG: "UGX", TZ: "TZS", GH: "GHS", ZM: "ZMW", CM: "XAF",
  BW: "BWP", RW: "RWF", CG: "CDF", MW: "MWK", NG: "NGN", SS: "SSP", BI: "BIF",
};

export const ACTIVATION_FEE_DEFAULTS: Record<string, number> = {
  KE: 350, TZ: 7500, UG: 12000, ZM: 115, GH: 60, CM: 2510,
  BW: 75, RW: 5500, CG: 15000, MW: 12000, NG: 7500, SS: 20000, BI: 25000,
};

export const BONUS_TABLE_DEFAULTS: Record<string, Record<string, [number, number, number]>> = {
  KE: { KE:[80,0,0],    UG:[174,87,34],      TZ:[151,100,50],   GH:[237,177,118], ZM:[275,137,70],  CM:[273,136,80]  },
  TZ: { KE:[1983,396,0],UG:[3451,1726,674],  TZ:[2995,1983,991],GH:[4701,3511,2340],ZM:[5454,2717,1388],CM:[5415,2697,1587] },
  ZM: { KE:[14,3,0],    UG:[25,12,5],        TZ:[21,14,7],      GH:[34,25,17],    ZM:[39,19,10],    CM:[39,19,11]    },
  CM: { KE:[438,87,0],  UG:[762,381,148],    TZ:[661,438,219],  GH:[1000,775,516],ZM:[1205,600,306],CM:[1196,595,350] },
  GH: { KE:[8,1,0],     UG:[14,7,2],         TZ:[12,8,4],       GH:[20,14,10],    ZM:[23,11,5],     CM:[23,11,6]     },
  UG: { KE:[2868,573,0],UG:[5000,2500,1000], TZ:[4331,2868,1434],GH:[6797,5076,3384],ZM:[7887,3929,2000],CM:[7830,3900,2294] },
  // Botswana — upline earns in BWP
  BW: { UG:[21,10,3],   TZ:[15,10,5],        GH:[29,17,11],     KE:[20,8,2],      ZM:[36,14,11],    CM:[25,11,9],
        RW:[23,9,4],    BI:[38,22,13],       BW:[30,16,10],     NG:[33,16,7],     SS:[46,21,14],    CG:[29,17,11],    MW:[39,23,11] },
  // Rwanda — upline earns in RWF
  RW: { UG:[2384,1192,397],  TZ:[1669,1105,552],  GH:[3184,1910,1274], KE:[2265,905,283],
        ZM:[4000,1600,1200],  CM:[2782,1280,993],  RW:[2500,1000,500],   BI:[4190,1972,1479],
        BW:[3253,1627,1084],  NG:[2781,1391,824],  SS:[5000,2185,1391],  CG:[3192,2185,1192],  MW:[4242,2545,1273] },
  // Congo — upline earns in CDF
  CG: { UG:[3733,1867,622],  TZ:[2614,1731,865],  GH:[4987,2992,1995],  KE:[3547,1419,443],
        ZM:[6280,2512,1884],  CM:[4357,2000,1555],  RW:[3916,1566,783],   BI:[7335,3861,1930],
        BW:[5000,2717,1698],  NG:[5646,3226,1613],  SS:[7865,3200,1851],  CG:[5000,3500,2000],  MW:[5000,3000,1500] },
  // Malawi — upline earns in MWK
  MW: { UG:[2810,1405,468],  TZ:[1968,1303,651],  GH:[3753,2252,1501],  KE:[2670,1068,333],
        ZM:[4727,1891,1418],  CM:[3279,1508,1170],  RW:[2947,1179,589],   BI:[5521,2906,1453],
        BW:[3835,2045,1278],  NG:[4249,2428,849],   SS:[5919,2437,1393],  CG:[3763,2634,1505],  MW:[5000,3000,1500] },
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
