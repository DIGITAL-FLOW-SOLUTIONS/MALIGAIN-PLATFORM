import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useSearch } from "wouter";
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
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" /> Approved
      </span>
    );
  if (status === "rejected")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20">
        <XCircle className="w-3 h-3" /> Rejected
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
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
  const search = useSearch();
  const verificationAmount = new URLSearchParams(search).get("amount") ?? "";

  const [phone, setPhone] = useState(user?.phone ?? "");
  const [amountPaid, setAmountPaid] = useState(verificationAmount);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submittedAmount, setSubmittedAmount] = useState<string | null>(null);
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
          screenshotMime: screenshotFile?.type ?? null,
          amountPaid,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Submission Failed", description: data.message || "Something went wrong.", variant: "destructive" });
      } else {
        setSubmittedAmount(amountPaid);
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
      <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-sm">
        {/* Header */}
        <div className="relative px-6 pt-8 pb-6 text-center overflow-hidden bg-gradient-to-br from-primary to-secondary">
          <div
            className="absolute inset-0 opacity-20"
            style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.5) 0%, transparent 65%)" }}
          />
          <div className="relative z-10 flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center shadow-xl border-2 border-white/30">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="relative z-10 text-xl font-black text-white tracking-wider uppercase">
             {user?.country === "KE" ? "M-Pesa Payment Verification" : "Payment Verification"}
          </h1>
          <p className="relative z-10 text-white/70 text-sm mt-1.5">
            Submit your payment details for verification
          </p>
        </div>

        <div className="px-6 py-6 space-y-5">
          {hasPending && (
            <div className="flex items-start gap-3 rounded-xl px-4 py-3.5 border border-amber-200 bg-amber-50">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-800 text-sm font-semibold">Pending Verification</p>
                <p className="text-amber-700/70 text-xs mt-0.5 leading-relaxed">
                  You have a pending verification under review. You cannot submit another until it is resolved.
                </p>
              </div>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-4 rounded-2xl border border-[#d7e8d7] bg-[#eef9ee] px-5 py-5 shadow-[0_8px_24px_rgba(34,104,55,0.12)]">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#20b35b]">
                <CheckCircle2 className="h-9 w-9 text-white" strokeWidth={2.5} />
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="text-xl font-bold leading-tight text-[#08783d] sm:text-2xl">
                  Request Submitted
                </p>
                <p className="mt-2 text-base leading-relaxed text-[#111827] sm:text-lg">
                  Congratulations!{" "}
                  {submittedAmount
                    ? `Your ${userCurrency} ${Math.round(parseFloat(submittedAmount)).toLocaleString()} payment verification request`
                    : "Your payment verification request"}{" "}
                  has been submitted successfully. We&apos;ll process your payment after verification.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-primary mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={user?.email ?? ""}
                readOnly
                className="w-full py-3 px-4 rounded-xl text-sm text-muted-foreground bg-muted/50 border border-border cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-primary mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XXXXXXXX"
                disabled={hasPending}
                className={cn(
                  "w-full py-3 px-4 rounded-xl text-sm text-foreground placeholder:text-muted-foreground bg-muted/30 border border-input focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all",
                  hasPending && "opacity-50 cursor-not-allowed"
                )}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-primary mb-1.5">
                Amount Paid ({userCurrency})
              </label>
              <input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                 placeholder={`e.g. ${userCurrency === "KES" ? "350" : "100"}`}
                disabled={hasPending}
                min="1"
                className={cn(
                  "w-full py-3 px-4 rounded-xl text-sm text-foreground placeholder:text-muted-foreground bg-muted/30 border border-input focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all",
                  hasPending && "opacity-50 cursor-not-allowed"
                )}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-primary mb-1.5">
                Payment Screenshot <span className="font-semibold normal-case tracking-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => !hasPending && fileInputRef.current?.click()}
                disabled={hasPending}
                className={cn(
                  "w-full rounded-xl border-2 border-dashed border-border bg-muted/30 transition-all flex flex-col items-center justify-center gap-2 text-center py-6",
                  !hasPending && "hover:border-primary/50 hover:bg-primary/5 cursor-pointer",
                  hasPending && "opacity-50 cursor-not-allowed"
                )}
              >
                {screenshotPreview ? (
                  <img
                    src={screenshotPreview}
                    alt="Preview"
                    className="w-full max-h-48 object-contain rounded-lg"
                  />
                ) : (
                  <>
                    <ImagePlus className="w-8 h-8 text-muted-foreground" />
                    <div>
                      <p className="text-foreground text-sm font-semibold">Tap to upload screenshot</p>
                      <p className="text-muted-foreground text-xs mt-0.5">PNG, JPG, WEBP accepted</p>
                    </div>
                  </>
                )}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || hasPending}
              className={cn(
                "w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all",
                loading || hasPending
                  ? "opacity-50 cursor-not-allowed bg-muted text-muted-foreground"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm active:scale-[0.98]"
              )}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {loading ? "Submitting..." : screenshotFile ? "Upload & Verify" : "Submit for Verification"}
            </button>
          </form>

          <div className="h-px bg-border" />

          <div>
            <h2 className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">
              Verification History
            </h2>

            {recordsLoading ? (
              <div className="text-center py-6">
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-6 rounded-xl border border-border bg-muted/30">
                <p className="text-muted-foreground text-sm">No verification records yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {records.map((rec) => (
                  <div
                    key={rec.id}
                    className="rounded-xl border border-border bg-muted/20 px-4 py-3.5 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground text-sm font-semibold">
                          Amount: <span className="text-amber-600">{rec.currency ?? userCurrency} {Math.round(parseFloat(rec.amount_paid))}</span>
                        </p>
                        <p className="text-muted-foreground text-xs mt-0.5">{rec.phone}</p>
                      </div>
                      <StatusBadge status={rec.status} />
                    </div>

                    {rec.screenshot_url && (
                      <a
                        href={rec.screenshot_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary/70 hover:text-primary transition-colors underline"
                      >
                        View Screenshot
                      </a>
                    )}

                    {rec.admin_note && (
                      <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 border border-border">
                        <span className="text-foreground font-semibold">Note:</span> {rec.admin_note}
                      </p>
                    )}

                    <p className="text-muted-foreground text-[10px]">
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
            className="w-full flex items-center justify-center gap-1.5 text-muted-foreground text-xs hover:text-foreground transition-colors py-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
