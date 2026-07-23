import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Save, Sliders, DollarSign, GitBranch } from "lucide-react";

const COUNTRIES = ["KE", "UG", "TZ", "GH", "ZM", "CM"] as const;
type Country = (typeof COUNTRIES)[number];

const COUNTRY_LABELS: Record<Country, { name: string; currency: string; flag: string }> = {
  KE: { name: "Kenya",    currency: "KES", flag: "🇰🇪" },
  UG: { name: "Uganda",   currency: "UGX", flag: "🇺🇬" },
  TZ: { name: "Tanzania", currency: "TZS", flag: "🇹🇿" },
  GH: { name: "Ghana",    currency: "GHS", flag: "🇬🇭" },
  ZM: { name: "Zambia",   currency: "ZMW", flag: "🇿🇲" },
  CM: { name: "Cameroon", currency: "XAF", flag: "🇨🇲" },
};

type BonusTable   = Record<Country, Record<Country, [number, number, number]>>;
type ActivationFees = Record<Country, number>;

function emptyFees(): ActivationFees {
  return { KE: 100, UG: 10000, TZ: 7500, GH: 55, ZM: 100, CM: 2510 };
}

function emptyBonusTable(): BonusTable {
  const table = {} as BonusTable;
  for (const up of COUNTRIES) {
    table[up] = {} as Record<Country, [number, number, number]>;
    for (const down of COUNTRIES) table[up][down] = [0, 0, 0];
  }
  return table;
}

export default function Control() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [fees, setFees]           = useState<ActivationFees>(emptyFees());
  const [bonusTable, setBonusTable] = useState<BonusTable>(emptyBonusTable());
  const [activeUpline, setActiveUpline] = useState<Country>("KE");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-control"],
    queryFn:  () => api.getControl(),
  });

  useEffect(() => {
    if (!data) return;
    setFees({ ...emptyFees(), ...(data.activationFees as Partial<ActivationFees>) });
    const bt = emptyBonusTable();
    for (const up of COUNTRIES)
      for (const down of COUNTRIES) {
        const src = (data.bonusTable as Partial<BonusTable>)?.[up]?.[down];
        if (src) bt[up][down] = [src[0] ?? 0, src[1] ?? 0, src[2] ?? 0];
      }
    setBonusTable(bt);
  }, [data]);

  const saveFeeMut = useMutation({
    mutationFn: () => api.updateActivationFees(fees),
    onSuccess:  () => { toast({ title: "Saved", description: "Activation fees updated." }); qc.invalidateQueries({ queryKey: ["admin-control"] }); },
    onError:    (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveBonusMut = useMutation({
    mutationFn: () => api.updateBonusTable(bonusTable),
    onSuccess:  () => { toast({ title: "Saved", description: "Referral bonus table updated." }); qc.invalidateQueries({ queryKey: ["admin-control"] }); },
    onError:    (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const setBonus = (up: Country, down: Country, level: 0 | 1 | 2, value: string) => {
    const num = parseFloat(value) || 0;
    setBonusTable(prev => {
      const next = { ...prev, [up]: { ...prev[up], [down]: [...prev[up][down]] as [number, number, number] } };
      next[up][down][level] = num;
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b border-border-2 border-primary" />
      </div>
    );
  }

  const uplineCurrency = COUNTRY_LABELS[activeUpline].currency;

  return (
    <div className="space-y-6">

      {/* Page heading */}
      <div className="flex items-center gap-3">
        <Sliders className="h-6 w-6 text-primary shrink-0" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Control Panel</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Manage activation fees and referral bonus rates per country</p>
        </div>
      </div>

      {/* ── Activation Fees ───────────────────────────────────────────── */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-border flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <DollarSign className="h-5 w-5 text-primary shrink-0" />
            <h2 className="text-base sm:text-lg font-semibold text-foreground">Activation Fees</h2>
          </div>
          <button
            onClick={() => saveFeeMut.mutate()}
            disabled={saveFeeMut.isPending}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 w-full sm:w-auto justify-center"
          >
            <Save className="h-4 w-4" />
            {saveFeeMut.isPending ? "Saving…" : "Save Fees"}
          </button>
        </div>

        <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {COUNTRIES.map(code => {
            const { name, currency, flag } = COUNTRY_LABELS[code];
            return (
              <div key={code} className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground/80">
                  <span>{flag}</span>
                  <span>{name}</span>
                  <span className="text-xs text-muted-foreground font-normal">({currency})</span>
                </label>
                <div className="flex items-center border border-input rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-primary">
                  <span className="px-3 py-2.5 bg-muted/30 text-muted-foreground text-sm border-r border-input font-mono shrink-0">
                    {currency}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="1"
                    value={fees[code]}
                    onChange={e => setFees(prev => ({ ...prev, [code]: parseFloat(e.target.value) || 0 }))}
                    className="flex-1 min-w-0 px-3 py-2.5 text-sm text-foreground bg-card outline-none"
                  />
                </div>
                {code === "CM" && (
                  <p className="text-xs text-amber-600">Includes international transfer fee</p>
                )}
                {code === "UG" && (
                  <p className="text-xs text-amber-600">A ±5 UGX jitter is applied automatically</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Referral Bonus Table ──────────────────────────────────────── */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">

        {/* Section header */}
        <div className="px-4 sm:px-6 py-4 border-b border-border flex flex-wrap items-start gap-3">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <GitBranch className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-foreground">Referral Bonus Table</h2>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Bonus paid to the <strong>upline</strong> in their currency when a new member activates.
              </p>
            </div>
          </div>
          <button
            onClick={() => saveBonusMut.mutate()}
            disabled={saveBonusMut.isPending}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 w-full sm:w-auto justify-center"
          >
            <Save className="h-4 w-4" />
            {saveBonusMut.isPending ? "Saving…" : "Save Bonuses"}
          </button>
        </div>

        {/* Upline tabs — show code on mobile, full name on sm+ */}
        <div className="border-b border-border bg-muted/30">
          <div className="flex overflow-x-auto px-3 sm:px-6 py-2 gap-1 scrollbar-hide">
            {COUNTRIES.map(code => {
              const { name, currency, flag } = COUNTRY_LABELS[code];
              const active = activeUpline === code;
              return (
                <button
                  key={code}
                  onClick={() => setActiveUpline(code)}
                  className={`flex flex-col items-center px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                    active
                      ? "bg-primary text-white shadow-sm"
                      : "text-muted-foreground hover:bg-card hover:shadow-sm"
                  }`}
                >
                  <span className="text-base leading-none mb-0.5">{flag}</span>
                  <span className="hidden sm:block">{name}</span>
                  <span className="sm:hidden">{code}</span>
                  <span className={`text-[10px] mt-0.5 ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {currency}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Context label */}
        <div className="px-4 sm:px-6 py-3 bg-primary/10 border-b border-border border-indigo-100">
          <p className="text-xs sm:text-sm text-primary">
            <strong>{COUNTRY_LABELS[activeUpline].flag} {COUNTRY_LABELS[activeUpline].name}</strong> upline earns bonuses in{" "}
            <strong>{uplineCurrency}</strong> when members from each country below activate.
          </p>
        </div>

        {/* ── Mobile: card grid (hidden on lg+) ── */}
        <div className="lg:hidden p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {COUNTRIES.map(down => {
            const { name, currency, flag } = COUNTRY_LABELS[down];
            return (
              <div key={down} className="border border-border rounded-xl p-4 space-y-3 bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{flag}</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{name}</p>
                    <p className="text-xs text-muted-foreground">New member from {currency}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {([0, 1, 2] as const).map(lvl => (
                    <div key={lvl} className="flex items-center gap-2">
                      <span className="w-8 shrink-0 text-xs font-bold text-primary uppercase tracking-wide">
                        L{lvl + 1}
                      </span>
                      <div className="flex-1 flex items-center border border-input rounded-lg overflow-hidden bg-card focus-within:ring-2 focus-within:ring-primary focus-within:border-primary">
                        <span className="px-2 py-2 bg-muted/30 text-muted-foreground text-xs border-r border-border font-mono shrink-0">
                          {uplineCurrency}
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="1"
                          value={bonusTable[activeUpline][down][lvl]}
                          onChange={e => setBonus(activeUpline, down, lvl, e.target.value)}
                          className="flex-1 min-w-0 px-3 py-2 text-sm text-foreground bg-card outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Desktop: table (hidden below lg) ── */}
        <div className="hidden lg:block p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-semibold text-foreground/80 w-44">
                    New Member Country
                  </th>
                  {(["L1 Bonus", "L2 Bonus", "L3 Bonus"] as const).map((label, i) => (
                    <th key={i} className="text-center py-2 px-3 font-semibold text-foreground/80 w-40">
                      {label}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {i === 0 ? "Direct referral" : i === 1 ? "2nd level" : "3rd level"}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {COUNTRIES.map(down => (
                  <tr key={down} className="hover:bg-muted/30">
                    <td className="py-3 pr-4">
                      <span className="mr-1.5">{COUNTRY_LABELS[down].flag}</span>
                      <span className="font-medium text-foreground">{COUNTRY_LABELS[down].name}</span>
                      <span className="ml-1.5 text-xs text-muted-foreground">{COUNTRY_LABELS[down].currency}</span>
                    </td>
                    {([0, 1, 2] as const).map(lvl => (
                      <td key={lvl} className="py-3 px-3">
                        <div className="flex items-center border border-input rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-primary">
                          <span className="px-2 py-1.5 bg-muted/30 text-muted-foreground text-xs border-r border-input font-mono shrink-0">
                            {uplineCurrency}
                          </span>
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="1"
                            value={bonusTable[activeUpline][down][lvl]}
                            onChange={e => setBonus(activeUpline, down, lvl, e.target.value)}
                            className="w-full px-2 py-1.5 text-sm text-foreground bg-card outline-none min-w-0"
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-4 sm:px-6 pb-4">
          <p className="text-xs text-muted-foreground">Set a bonus to 0 to disable that level for that country combination.</p>
        </div>
      </div>
    </div>
  );
}
