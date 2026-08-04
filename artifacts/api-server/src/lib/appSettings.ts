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

export type KenyaAutomaticPaymentProvider = "PAYHERO" | "HASHBACK";

export async function getKenyaAutomaticPaymentProvider(): Promise<KenyaAutomaticPaymentProvider> {
  try {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "kenya_payment_provider")
      .maybeSingle();

    const provider = String((data as { value?: string } | null)?.value ?? "").trim().toUpperCase();
    if (provider === "HASHBACK") return "HASHBACK";
  } catch {
    // PayHero is the safe/default provider when the setting is unavailable.
  }
  return "PAYHERO";
}

export const WELCOME_BONUS_DEFAULTS: Record<string, { amount: number; requiredReferrals: number }> = {
  KE: { amount: 150, requiredReferrals: 30 },
  TZ: { amount: 3500, requiredReferrals: 12 },
  UG: { amount: 5000, requiredReferrals: 25 },
  RW: { amount: 350, requiredReferrals: 25 },
  BI: { amount: 6000, requiredReferrals: 25 },
  ZM: { amount: 50, requiredReferrals: 25 },
  BW: { amount: 50, requiredReferrals: 25 },
  CM: { amount: 800, requiredReferrals: 25 },
  GH: { amount: 20, requiredReferrals: 25 },
  NG: { amount: 4000, requiredReferrals: 25 },
  SS: { amount: 5000, requiredReferrals: 20 },
  CG: { amount: 3500, requiredReferrals: 25 },
  MW: { amount: 3500, requiredReferrals: 25 },
};

export const BONUS_TABLE_DEFAULTS: Record<string, Record<string, [number, number, number]>> = {
  // Kenya — upline earns in KES (L3=0 means no L3 bonus)
  KE: { KE:[200,80,25],   UG:[210,105,35],     TZ:[147,97,48],    GH:[281,168,112],  ZM:[354,141,106],  CM:[245,113,87],
        RW:[220,88,44],   BI:[370,217,130],    BW:[287,153,95],   NG:[318,136,72],   SS:[443,182,104],  CG:[281,197,112],  MW:[374,224,112] },
  // Tanzania — upline earns in TZS
  TZ: { KE:[4000,1626,500],UG:[3208,1782,1069],TZ:[2995,1983,991],GH:[4570,3428,2285],ZM:[7195,2878,2159],CM:[4600,2847,1782],
        RW:[4451,1781,979], BI:[8766,3065,2138], BW:[5837,2919,1946],NG:[4990,3707,1853],SS:[7951,5830,2650], CG:[4990,3350,2274] },
  // Zambia — upline earns in ZK
  ZM: { KE:[21,8,0],     UG:[29,12,4],        TZ:[18,10,6],      GH:[38,23,15],     ZM:[50,20,15],    CM:[30,22,11],
        RW:[30,12,6],    BI:[48,27,15],        BW:[33,24,16],     NG:[41,19,12],     SS:[55,37,18],    CG:[39,23,15]   },
  // Cameroon — upline earns in XAF
  CM: { KE:[884,353,110], UG:[931,465,155],    TZ:[652,431,215],  GH:[1244,746,497],  ZM:[1567,626,470], CM:[1087,500,388],
        RW:[976,390,195], BI:[1734,770,481],   BW:[1186,635,423], NG:[1207,804,402],  SS:[1962,923,577], CG:[1247,873,498] },
  // Ghana — upline earns in GHC
  GH: { KE:[17,7,2],     UG:[18,9,3],         TZ:[13,8,4],       GH:[25,15,10],     ZM:[31,12,9],     CM:[20,11,8],
        RW:[23,7,3],     BI:[38,19,11],        BW:[23,12,8],      NG:[24,12,6],      SS:[37,18,11],    CG:[25,17,10]   },
  // Uganda — upline earns in UGX
  UG: { KE:[4500,2500,0],  UG:[6000,3000,1000],TZ:[4331,2868,1434],GH:[8000,4500,2500],ZM:[8700,5700,2500],CM:[7830,3900,2294],
        RW:[6244,2498,1374],BI:[12297,4300,3000],BW:[8137,4882,2712],NG:[7000,5200,2600],SS:[11998,5000,2999],CG:[7983,4790,3193] },
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
  // South Sudan — upline earns in SSP
  SS: { UG:[4035,2017,672],  TZ:[2825,1871,934],   GH:[5389,3234,2156],  KE:[3834,1533,479],
        ZM:[6787,2715,2036],  CM:[4709,2166,1681],  RW:[4232,1693,846],   BI:[7927,4172,2086],
        BW:[5506,2937,1835],  NG:[6102,3487,1220],  SS:[8500,3500,2000],  CG:[5404,3782,2161],  MW:[7180,4308,2154] },
  // Burundi — upline earns in BIF
  BI: { UG:[4835,2418,805],  TZ:[3386,2242,1120],  GH:[6459,3875,2583],  KE:[4594,1838,574],
        ZM:[8134,3254,2440],  CM:[5643,2596,2014],  RW:[5071,2028,1014],  BI:[9500,5000,2500],
        BW:[6599,3519,2200],  NG:[7313,4179,1463],  SS:[10186,4194,2397], CG:[6476,4533,2590],  MW:[8604,5163,2581] },
  // Nigeria — upline earns in NGN
  NG: { UG:[2314,1157,385],  TZ:[1621,1073,536],   GH:[3091,1855,1237],  KE:[2199,879,274],
        ZM:[3893,1557,1168],  CM:[2701,1242,964],   RW:[2427,970,485],    BI:[4547,2393,1197],
        BW:[3158,1685,1053],  NG:[3500,2000,700],    SS:[4876,2008,1147],  CG:[3099,2170,1240],  MW:[4118,2471,1235] },
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

export async function getWelcomeBonusSettings(): Promise<Record<string, { amount: number; requiredReferrals: number }>> {
  const keys = COUNTRIES.flatMap(country => [
    `welcome_bonus_${country}_amount`,
    `welcome_bonus_${country}_referrals`,
  ]);
  const { data } = await supabase.from("app_settings").select("key, value").in("key", keys);
  const result: Record<string, { amount: number; requiredReferrals: number }> = {};
  for (const country of COUNTRIES) {
    result[country] = { ...(WELCOME_BONUS_DEFAULTS[country] ?? { amount: 0, requiredReferrals: 0 }) };
  }
  for (const row of (data ?? []) as Array<{ key: string; value: string }>) {
    const match = row.key.match(/^welcome_bonus_([A-Z]+)_(amount|referrals)$/);
    if (!match) continue;
    const country = match[1]!;
    const value = Number(row.value);
    if (!Number.isFinite(value) || value < 0 || !result[country]) continue;
    if (match[2] === "amount") result[country]!.amount = value;
    else result[country]!.requiredReferrals = Math.floor(value);
  }
  return result;
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
