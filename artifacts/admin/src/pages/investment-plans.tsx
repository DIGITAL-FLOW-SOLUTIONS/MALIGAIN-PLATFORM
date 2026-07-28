import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, ToggleLeft, ToggleRight, Image } from "lucide-react";

interface InvestmentPlan {
  id: number; brand_name: string; name: string; category: string;
  deposit_amount: number; daily_profit: number; total_days: number;
  total_profit: number; image_url: string | null; country: string;
  is_active: boolean; sort_order: number; created_at: string;
}

const EMPTY: Partial<InvestmentPlan> = {
  brand_name: "TEKSAN", name: "", category: "basic",
  deposit_amount: 0, daily_profit: 0, total_days: 120, total_profit: 0,
  image_url: "", country: "ALL", sort_order: 0, is_active: true,
};

const COUNTRIES = [
  "ALL","KE","UG","TZ","GH","ZM","CM","NG","RW","BI","MW","BW","SS","CG",
];

export default function InvestmentPlans() {
  const { toast }  = useToast();
  const qc         = useQueryClient();
  const [modal, setModal]   = useState<"create" | "edit" | null>(null);
  const [form, setForm]     = useState<Partial<InvestmentPlan>>(EMPTY);
  const [delId, setDelId]   = useState<number | null>(null);
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState("image/jpeg");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-investment-plans"],
    queryFn: () => api.investmentListPlans(),
  });

  const createMut = useMutation({
    mutationFn: (f: Partial<InvestmentPlan>) => api.investmentCreatePlan({
      brandName: f.brand_name!, name: f.name!, category: f.category!,
      depositAmount: Number(f.deposit_amount), dailyProfit: Number(f.daily_profit),
      totalDays: Number(f.total_days), totalProfit: Number(f.total_profit),
      imageUrl: imageFile || f.image_url || null,
      country: f.country ?? "ALL", sortOrder: f.sort_order ?? 0,
    }),
    onSuccess: () => { toast({ title: "Plan created" }); qc.invalidateQueries({ queryKey: ["admin-investment-plans"] }); setModal(null); setImageFile(null); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, f }: { id: number; f: Partial<InvestmentPlan> }) =>
      api.investmentUpdatePlan(id, {
        brandName: f.brand_name, name: f.name, category: f.category,
        depositAmount: Number(f.deposit_amount), dailyProfit: Number(f.daily_profit),
        totalDays: Number(f.total_days), totalProfit: Number(f.total_profit),
        imageUrl: imageFile !== null ? imageFile : f.image_url,
        country: f.country, sortOrder: f.sort_order, isActive: f.is_active,
      }),
    onSuccess: () => { toast({ title: "Plan updated" }); qc.invalidateQueries({ queryKey: ["admin-investment-plans"] }); setModal(null); setImageFile(null); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.investmentDeletePlan(id),
    onSuccess: () => { toast({ title: "Plan deleted" }); qc.invalidateQueries({ queryKey: ["admin-investment-plans"] }); setDelId(null); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      api.investmentUpdatePlan(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-investment-plans"] }),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function openCreate() { setForm({ ...EMPTY }); setImageFile(null); setModal("create"); }
  function openEdit(p: InvestmentPlan) { setForm({ ...p }); setImageFile(null); setModal("edit"); }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageMime(file.type);
    const reader = new FileReader();
    reader.onload = ev => setImageFile(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleSubmit() {
    if (modal === "create") createMut.mutate(form);
    else if (modal === "edit" && form.id) updateMut.mutate({ id: form.id, f: form });
  }

  function field(key: keyof InvestmentPlan, label: string, type = "text", opts?: string[]) {
    return (
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
        {opts ? (
          <select
            value={String(form[key] ?? "")}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input
            type={type} value={String(form[key] ?? "")}
            onChange={e => setForm(f => ({ ...f, [key]: type === "number" ? parseFloat(e.target.value) || 0 : e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        )}
      </div>
    );
  }

  const plans = (data as { plans: InvestmentPlan[] })?.plans ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Investment Plans</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create and manage investment plans for all countries</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />New Plan
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Image className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No investment plans yet</p>
          <p className="text-xs mt-1">Click "New Plan" to create the first one</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Deposit</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Daily</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Days</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Total Profit</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Country</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {plans.map(plan => (
                <tr key={plan.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {plan.image_url ? (
                        <img src={plan.image_url} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0 bg-muted" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Image className="w-4 h-4 text-muted-foreground opacity-50" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-foreground text-xs">{plan.name}</p>
                        <p className="text-[10px] text-muted-foreground">{plan.brand_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${plan.category === "premium" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                      {plan.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-foreground font-medium">{plan.deposit_amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-rose-500 font-bold">{plan.daily_profit.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-foreground">{plan.total_days}</td>
                  <td className="px-4 py-3 text-right text-emerald-600 font-medium">{plan.total_profit.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-muted text-muted-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">{plan.country}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleMut.mutate({ id: plan.id, isActive: !plan.is_active })}>
                      {plan.is_active
                        ? <ToggleRight className="w-6 h-6 text-emerald-500 mx-auto" />
                        : <ToggleLeft  className="w-6 h-6 text-muted-foreground mx-auto" />
                      }
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(plan)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDelId(plan.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-bold text-foreground">{modal === "create" ? "New Investment Plan" : "Edit Plan"}</h2>
              <button onClick={() => setModal(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {field("brand_name", "Brand Name")}
                {field("name", "Plan Name")}
                {field("category", "Category", "text", ["basic", "premium"])}
                {field("country", "Country", "text", COUNTRIES)}
                {field("deposit_amount", "Deposit Amount", "number")}
                {field("daily_profit", "Daily Profit", "number")}
                {field("total_days", "Total Days", "number")}
                {field("total_profit", "Total Profit", "number")}
                {field("sort_order", "Sort Order", "number")}
              </div>

              {/* Image */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Plan Image</label>
                <div className="flex items-center gap-3">
                  {(imageFile || form.image_url) && (
                    <img src={imageFile ?? form.image_url!} alt="" className="w-16 h-16 rounded-lg object-cover border border-border" />
                  )}
                  <label className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-primary/50 transition-colors text-xs text-muted-foreground">
                    <Image className="w-4 h-4" />
                    {imageFile ? "Change image" : "Upload image"}
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>
                {!imageFile && (
                  <input
                    type="text" placeholder="Or paste image URL"
                    value={form.image_url ?? ""}
                    onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                    className="w-full mt-2 px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                )}
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Active</label>
                <button
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? "bg-emerald-500" : "bg-muted"}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.is_active ? "left-5" : "left-0.5"}`} />
                </button>
              </div>

              <button
                onClick={handleSubmit}
                disabled={createMut.isPending || updateMut.isPending}
                className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {createMut.isPending || updateMut.isPending ? "Saving…" : modal === "create" ? "Create Plan" : "Update Plan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {delId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h2 className="font-bold text-foreground mb-2">Delete Plan?</h2>
            <p className="text-sm text-muted-foreground mb-6">This action cannot be undone. Active user investments using this plan will remain intact.</p>
            <div className="flex gap-3">
              <button onClick={() => setDelId(null)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted">Cancel</button>
              <button
                onClick={() => deleteMut.mutate(delId)}
                disabled={deleteMut.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-50"
              >
                {deleteMut.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
