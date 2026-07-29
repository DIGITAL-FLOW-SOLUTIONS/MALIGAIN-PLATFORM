import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Save, Settings as SettingsIcon, Rocket, Bell, Smartphone } from "lucide-react";

function toDatetimeLocal(isoString: string): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ""; }
}

function fromDatetimeLocal(value: string): string {
  if (!value) return "";
  return new Date(value).toISOString();
}

const inputCls = "w-full px-3 py-2.5 border border-border rounded-lg text-sm text-foreground bg-muted/20 focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary placeholder:text-muted-foreground";

export default function Settings() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [mtnId, setMtnId] = useState("");
  const [mtnBusinessName, setMtnBusinessName] = useState("");
  const [airtelId, setAirtelId] = useState("");
  const [airtelBusinessName, setAirtelBusinessName] = useState("");
  const [mtnZmId, setMtnZmId] = useState("");
  const [mtnZmBusinessName, setMtnZmBusinessName] = useState("");
  const [airtelZmId, setAirtelZmId] = useState("");
  const [airtelZmBusinessName, setAirtelZmBusinessName] = useState("");
  const [tzPhoneId, setTzPhoneId] = useState("");
  const [tzBusinessName, setTzBusinessName] = useState("");
  const [cmPhone, setCmPhone] = useState("");
  const [cmBusinessName, setCmBusinessName] = useState("");
  const [eversendLink, setEversendLink] = useState("");
  const [congoAgentNumber, setCongoAgentNumber] = useState("");
  const [congoAgentName, setCongoAgentName] = useState("");
  const [malawiPhone, setMalawiPhone] = useState("");
  const [malawiBusinessName, setMalawiBusinessName] = useState("");
  const [botswanaPhone, setBotswanaPhone] = useState("");
  const [botswanaBusinessName, setBotswanaBusinessName] = useState("");
  const [ssPhone, setSsPhone] = useState("");
  const [ssBusinessName, setSsBusinessName] = useState("");
  const [rwandaPhone, setRwandaPhone] = useState("");
  const [rwandaBusinessName, setRwandaBusinessName] = useState("");
  const [activeChannel, setActiveChannel] = useState("8080");
  const [launchEnabled, setLaunchEnabled] = useState(false);
  const [launchDateLocal, setLaunchDateLocal] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => api.getSettings(),
  });

  const { data: notifData } = useQuery({
    queryKey: ["admin-notification-email"],
    queryFn: () => api.getNotificationEmail(),
  });

  useEffect(() => {
    if (notifData !== undefined) {
      setNotificationEmail(notifData?.notificationEmail ?? "");
    }
  }, [notifData]);

  useEffect(() => {
    if (data?.settings) {
      const s = data.settings;
      setMtnId(s["mtn_ug_id"] ?? "");
      setMtnBusinessName(s["mtn_ug_id_business_name"] ?? "");
      setAirtelId(s["airtel_ug_id"] ?? "");
      setAirtelBusinessName(s["airtel_ug_id_business_name"] ?? "");
      setMtnZmId(s["mtn_zm_id"] ?? "");
      setMtnZmBusinessName(s["mtn_zm_id_business_name"] ?? "");
      setAirtelZmId(s["airtel_zm_id"] ?? "");
      setAirtelZmBusinessName(s["airtel_zm_id_business_name"] ?? "");
      setTzPhoneId(s["tz_phone_id"] ?? "");
      setTzBusinessName(s["tz_phone_id_business_name"] ?? "");
      setCmPhone(s["cm_mtn_phone"] ?? "");
      setCmBusinessName(s["cm_mtn_phone_business_name"] ?? "");
      setEversendLink(s["eversend_link"] ?? "");
      setCongoAgentNumber(s["congo_agent_number"] ?? "");
      setCongoAgentName(s["congo_agent_name"] ?? "");
      setMalawiPhone(s["malawi_phone"] ?? "");
      setMalawiBusinessName(s["malawi_business_name"] ?? "");
      setBotswanaPhone(s["botswana_phone"] ?? "");
      setBotswanaBusinessName(s["botswana_business_name"] ?? "");
      setSsPhone(s["ss_phone"] ?? "");
      setSsBusinessName(s["ss_business_name"] ?? "");
      setRwandaPhone(s["rwanda_phone"] ?? "");
      setRwandaBusinessName(s["rwanda_business_name"] ?? "");
      if (s["payhero_active_channel"]) setActiveChannel(s["payhero_active_channel"]);
      setLaunchEnabled(s["launch_mode_enabled"] === "true");
      setLaunchDateLocal(toDatetimeLocal(s["launch_date"] ?? "2026-08-08T10:00:00.000Z"));
    }
  }, [data]);

  const saveNotifEmailMut = useMutation({
    mutationFn: () => api.updateNotificationEmail(notificationEmail.trim()),
    onSuccess: (res) => {
      toast({ title: "Saved", description: res.message });
      qc.invalidateQueries({ queryKey: ["admin-notification-email"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveLaunchMut = useMutation({
    mutationFn: () => api.updateLaunchSettings({ enabled: launchEnabled, launchDate: fromDatetimeLocal(launchDateLocal) }),
    onSuccess: () => {
      toast({ title: launchEnabled ? "🚀 Launch Mode Enabled" : "Launch Mode Disabled", description: launchEnabled ? "Users will see the countdown page in production." : "All pages are now accessible." });
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveUgandaMut = useMutation({
    mutationFn: () => api.updateSettings({ mtn_ug_id: mtnId.trim(), mtn_ug_id_business_name: mtnBusinessName.trim(), airtel_ug_id: airtelId.trim(), airtel_ug_id_business_name: airtelBusinessName.trim(), eversend_link: eversendLink.trim() }),
    onSuccess: () => { toast({ title: "Settings saved", description: "Uganda payment settings have been updated." }); qc.invalidateQueries({ queryKey: ["admin-settings"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveZambiaMut = useMutation({
    mutationFn: () => api.updateSettings({ mtn_zm_id: mtnZmId.trim(), mtn_zm_id_business_name: mtnZmBusinessName.trim(), airtel_zm_id: airtelZmId.trim(), airtel_zm_id_business_name: airtelZmBusinessName.trim() }),
    onSuccess: () => { toast({ title: "Settings saved", description: "Zambia payment settings have been updated." }); qc.invalidateQueries({ queryKey: ["admin-settings"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveTanzaniaMut = useMutation({
    mutationFn: () => api.updateSettings({ tz_phone_id: tzPhoneId.trim(), tz_phone_id_business_name: tzBusinessName.trim() }),
    onSuccess: () => { toast({ title: "Settings saved", description: "Tanzania payment settings have been updated." }); qc.invalidateQueries({ queryKey: ["admin-settings"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveCameroonMut = useMutation({
    mutationFn: () => api.updateSettings({ cm_mtn_phone: cmPhone.trim(), cm_mtn_phone_business_name: cmBusinessName.trim() }),
    onSuccess: () => { toast({ title: "Settings saved", description: "Cameroon payment settings have been updated." }); qc.invalidateQueries({ queryKey: ["admin-settings"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveCongoMut = useMutation({
    mutationFn: () => api.updateSettings({ congo_agent_number: congoAgentNumber.trim(), congo_agent_name: congoAgentName.trim() }),
    onSuccess: () => { toast({ title: "Settings saved", description: "Congo payment settings have been updated." }); qc.invalidateQueries({ queryKey: ["admin-settings"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveMalawiMut = useMutation({
    mutationFn: () => api.updateSettings({ malawi_phone: malawiPhone.trim(), malawi_business_name: malawiBusinessName.trim() }),
    onSuccess: () => { toast({ title: "Settings saved", description: "Malawi payment settings have been updated." }); qc.invalidateQueries({ queryKey: ["admin-settings"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveBotswanaMut = useMutation({
    mutationFn: () => api.updateSettings({ botswana_phone: botswanaPhone.trim(), botswana_business_name: botswanaBusinessName.trim() }),
    onSuccess: () => { toast({ title: "Settings saved", description: "Botswana payment settings have been updated." }); qc.invalidateQueries({ queryKey: ["admin-settings"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveSouthSudanMut = useMutation({
    mutationFn: () => api.updateSettings({ ss_phone: ssPhone.trim(), ss_business_name: ssBusinessName.trim() }),
    onSuccess: () => { toast({ title: "Settings saved", description: "South Sudan payment settings have been updated." }); qc.invalidateQueries({ queryKey: ["admin-settings"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveRwandaMut = useMutation({
    mutationFn: () => api.updateSettings({ rwanda_phone: rwandaPhone.trim(), rwanda_business_name: rwandaBusinessName.trim() }),
    onSuccess: () => { toast({ title: "Settings saved", description: "Rwanda payment settings have been updated." }); qc.invalidateQueries({ queryKey: ["admin-settings"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveKenyaMut = useMutation({
    mutationFn: () => api.updateSettings({ payhero_active_channel: activeChannel }),
    onSuccess: () => { toast({ title: "Channel updated", description: "Kenya PayHero channel is now active." }); qc.invalidateQueries({ queryKey: ["admin-settings"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const PAYHERO_CHANNELS = [
    { id: "8080",  type: "Till",  detail: "5580730",            label: "M-Pesa Till" },
    { id: "10333", type: "Bank",  detail: "I & M Bank Limited", label: "I & M Bank" },
    { id: "8087",  type: "Bank",  detail: "Co-operative Bank",  label: "Co-operative Bank" },
  ];

  const sectionCard = "bg-card rounded-xl shadow-sm border border-border overflow-hidden max-w-lg";
  const sectionHeader = "px-6 py-4 border-b border-border bg-muted/20";
  const labelCls = "block text-sm font-medium text-foreground/80 mb-1.5";
  const subLabelCls = "text-xs text-muted-foreground mt-1";
  const saveBtnCls = "flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-lg text-sm font-medium transition-colors";
  const sectionSubhead = "text-sm font-semibold text-foreground uppercase tracking-wider";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Manage launch mode and mobile money payment settings</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── WITHDRAWAL NOTIFICATION EMAIL ────────────────────────────── */}
          <div className={sectionCard}>
            <div className="px-6 py-4 border-b border-border bg-muted/20">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                Withdrawal Notification Email
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Receive an email alert every time a user submits a withdrawal request.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={labelCls}>Notification Email</label>
                <input
                  type="email"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  placeholder="e.g. admin@maligain.com"
                  className={inputCls}
                />
                <p className={subLabelCls}>
                  An email will be sent to this address each time a user places a withdrawal request. Leave blank to disable.
                </p>
              </div>
              <button
                onClick={() => saveNotifEmailMut.mutate()}
                disabled={saveNotifEmailMut.isPending}
                className={saveBtnCls}
              >
                <Save className="h-4 w-4" />
                {saveNotifEmailMut.isPending ? "Saving..." : "Save Notification Email"}
              </button>
            </div>
          </div>

          {/* ── LAUNCH MODE ─────────────────────────────────────────────── */}
          <div className={sectionCard}>
            <div className={`px-6 py-4 border-b border-border bg-muted/20`}>
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Rocket className="h-4 w-4 text-primary" />
                Launch Mode
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                When enabled, all user pages show a launch countdown in production only.
              </p>
            </div>

            <div className="p-6 space-y-5">
              {/* Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Enable Launch Mode</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Only active when <code className="bg-muted px-1 rounded text-xs">NODE_ENV=production</code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLaunchEnabled((v) => !v)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${launchEnabled ? "bg-destructive" : "bg-muted"}`}
                  aria-pressed={launchEnabled}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${launchEnabled ? "translate-x-[22px]" : "translate-x-[4px]"}`}
                  />
                </button>
              </div>

              {/* Status pill */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border ${launchEnabled ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-muted/40 border-border text-muted-foreground"}`}>
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${launchEnabled ? "bg-destructive" : "bg-muted-foreground/50"}`} />
                {launchEnabled ? "Launch mode is ON — users will see the countdown" : "Launch mode is OFF — all pages are accessible"}
              </div>

              {/* Date & time picker */}
              <div>
                <label className={labelCls}>
                  Launch Date &amp; Time <span className="text-muted-foreground font-normal">(your local time)</span>
                </label>
                <input
                  type="datetime-local"
                  value={launchDateLocal}
                  onChange={(e) => setLaunchDateLocal(e.target.value)}
                  className={inputCls}
                />
                <p className={subLabelCls}>
                  When this time arrives the countdown expires and launch mode turns off automatically.
                </p>
              </div>

              <button
                onClick={() => saveLaunchMut.mutate()}
                disabled={saveLaunchMut.isPending || !launchDateLocal}
                className={saveBtnCls}
              >
                <Save className="h-4 w-4" />
                {saveLaunchMut.isPending ? "Saving..." : "Save Launch Settings"}
              </button>
            </div>
          </div>

          {/* ── KENYA (PayHero channel selector) ────────────────────── */}
          <div className={sectionCard}>
            <div className={sectionHeader}>
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                Kenya Payment Settings
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Choose which PayHero channel receives M-Pesa STK push payments from Kenyan users.
                The change takes effect immediately.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-muted-foreground">Active channel — all PayHero STK pushes will be sent to this channel:</p>
              <div className="space-y-2">
                {PAYHERO_CHANNELS.map(ch => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setActiveChannel(ch.id)}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border-2 transition-all text-left ${
                      activeChannel === ch.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-muted/10 hover:border-border/70 hover:bg-muted/20"
                    }`}
                  >
                    {/* Radio dot */}
                    <span className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      activeChannel === ch.id ? "border-primary" : "border-muted-foreground/40"
                    }`}>
                      {activeChannel === ch.id && (
                        <span className="w-2 h-2 rounded-full bg-primary block" />
                      )}
                    </span>
                    {/* Channel info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{ch.label}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                          ch.type === "Till"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}>{ch.type}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{ch.detail}</p>
                    </div>
                    {/* Channel ID badge */}
                    <span className="flex-shrink-0 text-xs font-mono font-semibold text-muted-foreground bg-muted/60 px-2 py-1 rounded-lg">
                      #{ch.id}
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => saveKenyaMut.mutate()}
                disabled={saveKenyaMut.isPending}
                className={saveBtnCls}
              >
                <Save className="h-4 w-4" />
                {saveKenyaMut.isPending ? "Saving..." : "Save Kenya Channel"}
              </button>
            </div>
          </div>

          {/* ── UGANDA ─────────────────────────────────────────────────── */}
          <div className={sectionCard}>
            <div className={sectionHeader}>
              <h2 className="font-semibold text-foreground">Uganda Payment Settings</h2>
              <p className="text-xs text-muted-foreground mt-0.5">These are shown to Ugandan users when they pay via MTN or Airtel</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <h3 className={sectionSubhead}>MTN Uganda</h3>
                <div>
                  <label className={labelCls}>Payment ID</label>
                  <input type="text" value={mtnId} onChange={(e) => setMtnId(e.target.value)} placeholder="e.g. 698734" className={inputCls} />
                  <p className={subLabelCls}>Merchant ID shown in step 2 (*165*3#)</p>
                </div>
                <div>
                  <label className={labelCls}>Business Name</label>
                  <input type="text" value={mtnBusinessName} onChange={(e) => setMtnBusinessName(e.target.value)} placeholder="e.g. MALIGAIN LTD" className={inputCls} />
                  <p className={subLabelCls}>Displayed in the "CONFIRM it is..." step</p>
                </div>
              </div>
              <div className="border-t border-border pt-5 space-y-3">
                <h3 className={sectionSubhead}>Airtel Uganda</h3>
                <div>
                  <label className={labelCls}>Payment ID</label>
                  <input type="text" value={airtelId} onChange={(e) => setAirtelId(e.target.value)} placeholder="e.g. 698734" className={inputCls} />
                  <p className={subLabelCls}>Merchant ID shown in step 2 (*185*9#)</p>
                </div>
                <div>
                  <label className={labelCls}>Business Name</label>
                  <input type="text" value={airtelBusinessName} onChange={(e) => setAirtelBusinessName(e.target.value)} placeholder="e.g. MALIGAIN LTD" className={inputCls} />
                  <p className={subLabelCls}>Displayed in the "CONFIRM it is..." step</p>
                </div>
              </div>
              <div className="border-t border-border pt-5 space-y-3">
                <h3 className={sectionSubhead}>Eversend Payment Link</h3>
                <div>
                  <label className={labelCls}>Payment Link URL</label>
                  <input type="url" value={eversendLink} onChange={(e) => setEversendLink(e.target.value)} placeholder="https://eversend.me/kantolah" className={inputCls} />
                  <p className={subLabelCls}>Shown to other international users</p>
                </div>
              </div>
              <button onClick={() => saveUgandaMut.mutate()} disabled={saveUgandaMut.isPending} className={saveBtnCls}>
                <Save className="h-4 w-4" />
                {saveUgandaMut.isPending ? "Saving..." : "Save Uganda Settings"}
              </button>
            </div>
          </div>

          {/* ── ZAMBIA ──────────────────────────────────────────────────── */}
          <div className={sectionCard}>
            <div className={sectionHeader}>
              <h2 className="font-semibold text-foreground">Zambia Payment Settings</h2>
              <p className="text-xs text-muted-foreground mt-0.5">These are shown to Zambian users when they pay via MTN or Airtel</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <h3 className={sectionSubhead}>MTN Zambia</h3>
                <div>
                  <label className={labelCls}>Phone Number</label>
                  <input type="text" value={mtnZmId} onChange={(e) => setMtnZmId(e.target.value)} placeholder="e.g. 254757574729" className={inputCls} />
                  <p className={subLabelCls}>Number shown in step 5 of payment instructions</p>
                </div>
                <div>
                  <label className={labelCls}>Account Name</label>
                  <input type="text" value={mtnZmBusinessName} onChange={(e) => setMtnZmBusinessName(e.target.value)} placeholder="e.g. Charles Vundi Nzive" className={inputCls} />
                </div>
              </div>
              <div className="border-t border-border pt-5 space-y-3">
                <h3 className={sectionSubhead}>Airtel Zambia</h3>
                <div>
                  <label className={labelCls}>Phone Number</label>
                  <input type="text" value={airtelZmId} onChange={(e) => setAirtelZmId(e.target.value)} placeholder="e.g. 254717290995" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Account Name</label>
                  <input type="text" value={airtelZmBusinessName} onChange={(e) => setAirtelZmBusinessName(e.target.value)} placeholder="e.g. Pauline Mukai Vundi" className={inputCls} />
                </div>
              </div>
              <button onClick={() => saveZambiaMut.mutate()} disabled={saveZambiaMut.isPending} className={saveBtnCls}>
                <Save className="h-4 w-4" />
                {saveZambiaMut.isPending ? "Saving..." : "Save Zambia Settings"}
              </button>
            </div>
          </div>

          {/* ── TANZANIA ────────────────────────────────────────────────── */}
          <div className={sectionCard}>
            <div className={sectionHeader}>
              <h2 className="font-semibold text-foreground">Tanzania Payment Settings</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Shown to Tanzanian users for Vodacom International Transfer to Kenya</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <h3 className={sectionSubhead}>Vodacom Tanzania (*150*60#)</h3>
                <div>
                  <label className={labelCls}>Recipient Phone Number (Kenya / Safaricom)</label>
                  <input type="text" value={tzPhoneId} onChange={(e) => setTzPhoneId(e.target.value)} placeholder="e.g. 254757574729" className={inputCls} />
                  <p className={subLabelCls}>Number shown in step 5 of payment instructions</p>
                </div>
                <div>
                  <label className={labelCls}>Account Name (optional)</label>
                  <input type="text" value={tzBusinessName} onChange={(e) => setTzBusinessName(e.target.value)} placeholder="e.g. Charles Vundi Nzive" className={inputCls} />
                </div>
              </div>
              <button onClick={() => saveTanzaniaMut.mutate()} disabled={saveTanzaniaMut.isPending} className={saveBtnCls}>
                <Save className="h-4 w-4" />
                {saveTanzaniaMut.isPending ? "Saving..." : "Save Tanzania Settings"}
              </button>
            </div>
          </div>

          {/* ── CAMEROON ────────────────────────────────────────────────── */}
          <div className={sectionCard}>
            <div className={sectionHeader}>
              <h2 className="font-semibold text-foreground">Cameroon Payment Settings</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Shown to Cameroonian users — now pays via Eversend link (*126* MTN kept for legacy)</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <h3 className={sectionSubhead}>MTN Cameroon (*126*) — Legacy</h3>
                <div>
                  <label className={labelCls}>Recipient Phone Number (Kenya / Mpesa)</label>
                  <input type="text" value={cmPhone} onChange={(e) => setCmPhone(e.target.value)} placeholder="e.g. +254757574729" className={inputCls} />
                  <p className={subLabelCls}>Number shown in legacy Cameroon pay page instructions</p>
                </div>
                <div>
                  <label className={labelCls}>Account Name</label>
                  <input type="text" value={cmBusinessName} onChange={(e) => setCmBusinessName(e.target.value)} placeholder="e.g. Charles Nzive" className={inputCls} />
                </div>
              </div>
              <button onClick={() => saveCameroonMut.mutate()} disabled={saveCameroonMut.isPending} className={saveBtnCls}>
                <Save className="h-4 w-4" />
                {saveCameroonMut.isPending ? "Saving..." : "Save Cameroon Settings"}
              </button>
            </div>
          </div>

          {/* ── CONGO ───────────────────────────────────────────────────── */}
          <div className={sectionCard}>
            <div className={sectionHeader}>
              <h2 className="font-semibold text-foreground">Congo Payment Settings</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Shown to Congolese users for M-Pesa agent payment (*1122#)</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <h3 className={sectionSubhead}>M-Pesa Congo (*1122#)</h3>
                <div>
                  <label className={labelCls}>Agent Number</label>
                  <input type="text" value={congoAgentNumber} onChange={(e) => setCongoAgentNumber(e.target.value)} placeholder="e.g. 03317296" className={inputCls} />
                  <p className={subLabelCls}>Agent number shown in step 5 of payment instructions</p>
                </div>
                <div>
                  <label className={labelCls}>Agent Name</label>
                  <input type="text" value={congoAgentName} onChange={(e) => setCongoAgentName(e.target.value)} placeholder="e.g. ADEZILA" className={inputCls} />
                  <p className={subLabelCls}>Displayed next to the agent number for confirmation</p>
                </div>
              </div>
              <button onClick={() => saveCongoMut.mutate()} disabled={saveCongoMut.isPending} className={saveBtnCls}>
                <Save className="h-4 w-4" />
                {saveCongoMut.isPending ? "Saving..." : "Save Congo Settings"}
              </button>
            </div>
          </div>

          {/* ── MALAWI ──────────────────────────────────────────────────── */}
          <div className={sectionCard}>
            <div className={sectionHeader}>
              <h2 className="font-semibold text-foreground">Malawi Payment Settings</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Shown to Malawian users for Airtel International Transfer to Kenya (*211#)</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <h3 className={sectionSubhead}>Airtel Malawi (*211#)</h3>
                <div>
                  <label className={labelCls}>Recipient Phone Number (Kenya / Safaricom)</label>
                  <input type="text" value={malawiPhone} onChange={(e) => setMalawiPhone(e.target.value)} placeholder="e.g. 254757574729" className={inputCls} />
                  <p className={subLabelCls}>Number shown in step 6 of payment instructions</p>
                </div>
                <div>
                  <label className={labelCls}>Account Name</label>
                  <input type="text" value={malawiBusinessName} onChange={(e) => setMalawiBusinessName(e.target.value)} placeholder="e.g. CHARLES" className={inputCls} />
                </div>
              </div>
              <button onClick={() => saveMalawiMut.mutate()} disabled={saveMalawiMut.isPending} className={saveBtnCls}>
                <Save className="h-4 w-4" />
                {saveMalawiMut.isPending ? "Saving..." : "Save Malawi Settings"}
              </button>
            </div>
          </div>

          {/* ── BOTSWANA ────────────────────────────────────────────────── */}
          <div className={sectionCard}>
            <div className={sectionHeader}>
              <h2 className="font-semibold text-foreground">Botswana Payment Settings</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Shown to Botswanan users for Orange Money International Transfer to Uganda (*145#)</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <h3 className={sectionSubhead}>Orange Money Botswana (*145#)</h3>
                <div>
                  <label className={labelCls}>Recipient Phone Number (Uganda MTN)</label>
                  <input type="text" value={botswanaPhone} onChange={(e) => setBotswanaPhone(e.target.value)} placeholder="e.g. 256787102308" className={inputCls} />
                  <p className={subLabelCls}>Number shown in step 5 of payment instructions</p>
                </div>
                <div>
                  <label className={labelCls}>Account Name</label>
                  <input type="text" value={botswanaBusinessName} onChange={(e) => setBotswanaBusinessName(e.target.value)} placeholder="e.g. Amundala Munyama" className={inputCls} />
                </div>
              </div>
              <button onClick={() => saveBotswanaMut.mutate()} disabled={saveBotswanaMut.isPending} className={saveBtnCls}>
                <Save className="h-4 w-4" />
                {saveBotswanaMut.isPending ? "Saving..." : "Save Botswana Settings"}
              </button>
            </div>
          </div>

          {/* ── SOUTH SUDAN ─────────────────────────────────────────────── */}
          <div className={sectionCard}>
            <div className={sectionHeader}>
              <h2 className="font-semibold text-foreground">South Sudan Payment Settings</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Shown to South Sudanese users for MTN MoMo International Transfer to Uganda (200*1*3#)</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <h3 className={sectionSubhead}>MTN South Sudan MoMo (200*1*3#)</h3>
                <div>
                  <label className={labelCls}>Recipient Phone Number (Uganda MTN)</label>
                  <input type="text" value={ssPhone} onChange={(e) => setSsPhone(e.target.value)} placeholder="e.g. 256787102308" className={inputCls} />
                  <p className={subLabelCls}>Number shown in step 4 of payment instructions</p>
                </div>
                <div>
                  <label className={labelCls}>Account Name</label>
                  <input type="text" value={ssBusinessName} onChange={(e) => setSsBusinessName(e.target.value)} placeholder="e.g. Amundala Munyama" className={inputCls} />
                </div>
              </div>
              <button onClick={() => saveSouthSudanMut.mutate()} disabled={saveSouthSudanMut.isPending} className={saveBtnCls}>
                <Save className="h-4 w-4" />
                {saveSouthSudanMut.isPending ? "Saving..." : "Save South Sudan Settings"}
              </button>
            </div>
          </div>

          {/* ── RWANDA ──────────────────────────────────────────────────── */}
          <div className={sectionCard}>
            <div className={sectionHeader}>
              <h2 className="font-semibold text-foreground">Rwanda Payment Settings</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Shown to Rwandan users for MTN MoMo International Transfer to Uganda (*182*1*3#)</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <h3 className={sectionSubhead}>MTN Rwanda MoMo (*182*1*3#)</h3>
                <div>
                  <label className={labelCls}>Recipient Phone Number (Uganda MTN)</label>
                  <input type="text" value={rwandaPhone} onChange={(e) => setRwandaPhone(e.target.value)} placeholder="e.g. 256787102308" className={inputCls} />
                  <p className={subLabelCls}>Number shown in step 3 of payment instructions</p>
                </div>
                <div>
                  <label className={labelCls}>Account Name</label>
                  <input type="text" value={rwandaBusinessName} onChange={(e) => setRwandaBusinessName(e.target.value)} placeholder="e.g. Amundala Munyama" className={inputCls} />
                </div>
              </div>
              <button onClick={() => saveRwandaMut.mutate()} disabled={saveRwandaMut.isPending} className={saveBtnCls}>
                <Save className="h-4 w-4" />
                {saveRwandaMut.isPending ? "Saving..." : "Save Rwanda Settings"}
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
