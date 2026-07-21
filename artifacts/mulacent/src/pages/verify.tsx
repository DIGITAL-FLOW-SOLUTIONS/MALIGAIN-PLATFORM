import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  ShieldCheck,
  Upload,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronLeft,
  ImagePlus,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VerificationRecord {
  id: number;
  email: string;
  phone: string;
  screenshot_url: string;
  amount_paid: string;
  currency: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        <CheckCircle2 className="w-3 h-3" /> Approved
      </span>
    );
  if (status === "rejected")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">
        <XCircle className="w-3 h-3" /> Rejected
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
      <Clock className="w-3 h-3" /> Pending
    </span>
  );
}

const COUNTRY_CURRENCY: Record<string, string> = {
  KE: "KES",
  UG: "UGX",
  TZ: "TZS",
  GH: "GHS",
  ZM: "ZMW",
  CM: "XAF",
};

export default function Verify() {
  const { user } = useAuth();
  const userCurrency = COUNTRY_CURRENCY[user?.country ?? "KE"] ?? "KES";
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [phone, setPhone] = useState(user?.phone ?? "");
  const [amountPaid, setAmountPaid] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [records, setRecords] = useState<VerificationRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasPending = records.some((r) => r.status === "pending");

  const fetchRecords = async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/verify`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records ?? []);
      }
    } catch {
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid File", description: "Please upload an image file.", variant: "destructive" });
      return;
    }
    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onload = () => setScreenshotPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (hasPending) {
      toast({ title: "Pending Verification", description: "You already have a pending verification.", variant: "destructive" });
      return;
    }

    if (!phone.trim()) {
      toast({ title: "Phone Required", description: "Please enter your phone number.", variant: "destructive" });
      return;
    }
    if (!screenshotFile || !screenshotPreview) {
      toast({ title: "Screenshot Required", description: "Please upload your payment screenshot.", variant: "destructive" });
      return;
    }
    if (!amountPaid || parseFloat(amountPaid) <= 0) {
      toast({ title: "Amount Required", description: "Please enter the amount you paid.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/verify`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          screenshotBase64: screenshotPreview,
          screenshotMime: screenshotFile.type,
          amountPaid,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Submission Failed", description: data.message || "Something went wrong.", variant: "destructive" });
      } else {
        setSuccess(true);
        setPhone(user?.phone ?? "");
        setAmountPaid("");
        setScreenshotFile(null);
        setScreenshotPreview(null);
        toast({ title: "Submitted!", description: data.message });
        fetchRecords();
      }
    } catch {
      toast({ title: "Network Error", description: "Please check your connection and try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto pb-10">
      <div className="rounded-2xl overflow-hidden border border-red-900/20" style={{ background: "#1a0508" }}>
        <div
          className="relative px-6 pt-8 pb-6 text-center overflow-hidden"
          style={{ background: "linear-gradient(180deg, #2d0508 0%, #1a0508 100%)" }}
        >
          <div
            className="absolute inset-0 opacity-20"
            style={{ background: "radial-gradient(ellipse at 50% 0%, #dc2626 0%, transparent 65%)" }}
          />
          <div className="relative z-10 flex justify-center mb-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center shadow-xl"
              style={{ background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)", boxShadow: "0 0 30px #dc262640" }}
            >
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="relative z-10 text-xl font-black text-white tracking-wider uppercase">
            Eversend Payment Verification
          </h1>
          <p className="relative z-10 text-red-400/70 text-sm mt-1.5">
            Upload payment screenshot for verification
          </p>
        </div>

        <div className="px-6 py-6 space-y-5">
          {hasPending && (
            <div className="flex items-start gap-3 rounded-xl px-4 py-3.5 border border-amber-500/30 bg-amber-500/8">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-300 text-sm font-semibold">Pending Verification</p>
                <p className="text-amber-300/70 text-xs mt-0.5 leading-relaxed">
                  You have a pending verification under review. You cannot submit another until it is resolved.
                </p>
              </div>
            </div>
          )}

          {success && !hasPending && (
            <div className="flex items-start gap-3 rounded-xl px-4 py-3.5 border border-emerald-500/30 bg-emerald-500/8">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-emerald-300 text-sm leading-relaxed">
                Your verification has been submitted and is under review. We'll update you soon.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-red-400 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={user?.email ?? ""}
                readOnly
                className="w-full py-3 px-4 rounded-xl text-sm text-slate-400 bg-white/3 border border-white/8 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-red-400 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XXXXXXXX"
                disabled={hasPending}
                className={cn(
                  "w-full py-3 px-4 rounded-xl text-sm text-white placeholder:text-slate-600 bg-white/5 border border-white/10 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all",
                  hasPending && "opacity-50 cursor-not-allowed"
                )}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-red-400 mb-1.5">
                Payment Screenshot
              </label>
              <button
                type="button"
                onClick={() => !hasPending && fileInputRef.current?.click()}
                disabled={hasPending}
                className={cn(
                  "w-full rounded-xl border-2 border-dashed border-red-900/40 bg-white/3 transition-all flex flex-col items-center justify-center gap-2 text-center",
                  screenshotPreview ? "p-2" : "py-8 px-4",
                  !hasPending && "hover:border-red-500/50 hover:bg-white/5 cursor-pointer",
                  hasPending && "opacity-50 cursor-not-allowed"
                )}
              >
                {screenshotPreview ? (
                  <img
                    src={screenshotPreview}
                    alt="Screenshot preview"
                    className="w-full max-h-48 object-contain rounded-lg"
                  />
                ) : (
                  <>
                    <ImagePlus className="w-8 h-8 text-red-500/50" />
                    <p className="text-slate-400 text-sm font-semibold">Click to upload screenshot</p>
                    <p className="text-slate-600 text-xs">PNG, JPG, JPEG accepted</p>
                  </>
                )}
              </button>
              {screenshotPreview && (
                <button
                  type="button"
                  onClick={() => { setScreenshotFile(null); setScreenshotPreview(null); }}
                  className="mt-1.5 text-xs text-red-400/60 hover:text-red-400 transition-colors"
                >
                  Remove screenshot
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-red-400 mb-1.5">
                Amount Paid
              </label>
              <input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                disabled={hasPending}
                className={cn(
                  "w-full py-3 px-4 rounded-xl text-sm text-white placeholder:text-slate-600 bg-white/5 border border-white/10 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all",
                  hasPending && "opacity-50 cursor-not-allowed"
                )}
              />
            </div>

            <button
              type="submit"
              disabled={loading || hasPending}
              className={cn(
                "w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all",
                loading || hasPending
                  ? "opacity-50 cursor-not-allowed bg-white/5 text-slate-500"
                  : "text-white shadow-lg active:scale-[0.98]"
              )}
              style={loading || hasPending ? {} : {
                background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
                boxShadow: "0 4px 20px #dc262630",
              }}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {loading ? "Uploading..." : "Upload & Verify"}
            </button>
          </form>

          <div className="h-px bg-white/6" />

          <div>
            <h2 className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-3">
              Eversend History
            </h2>

            {recordsLoading ? (
              <div className="text-center py-6">
                <div className="w-5 h-5 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto" />
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-6 rounded-xl border border-white/6 bg-white/3">
                <p className="text-slate-500 text-sm">No verification records yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {records.map((rec) => (
                  <div
                    key={rec.id}
                    className="rounded-xl border border-white/8 bg-white/3 px-4 py-3.5 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold">
                          Amount: <span className="text-amber-400">{rec.currency ?? userCurrency} {Math.round(parseFloat(rec.amount_paid))}</span>
                        </p>
                        <p className="text-slate-500 text-xs mt-0.5">{rec.phone}</p>
                      </div>
                      <StatusBadge status={rec.status} />
                    </div>

                    {rec.screenshot_url && (
                      <a
                        href={rec.screenshot_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-red-400/70 hover:text-red-400 transition-colors underline"
                      >
                        View Screenshot
                      </a>
                    )}

                    {rec.admin_note && (
                      <p className="text-xs text-slate-400 bg-white/5 rounded-lg px-3 py-2 border border-white/8">
                        <span className="text-slate-300 font-semibold">Note:</span> {rec.admin_note}
                      </p>
                    )}

                    <p className="text-slate-600 text-[10px]">
                      {new Date(rec.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate(-1 as any)}
            className="w-full flex items-center justify-center gap-1.5 text-slate-500 text-xs hover:text-slate-400 transition-colors py-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
