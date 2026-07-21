import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Save, Settings as SettingsIcon, Rocket } from "lucide-react";

// ---------------------------------------------------------------------------
// Datetime-local helpers
// datetime-local inputs use local time; we store UTC ISO strings in the DB.
// ---------------------------------------------------------------------------
function toDatetimeLocal(isoString: string): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function fromDatetimeLocal(value: string): string {
  if (!value) return "";
  return new Date(value).toISOString();
}

export default function Settings() {
  const { toast } = useToast();
  const qc = useQueryClient();

  // --- Payment settings state ---
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

  // --- Launch mode state ---
  const [launchEnabled, setLaunchEnabled] = useState(false);
  const [launchDateLocal, setLaunchDateLocal] = useState(""); // datetime-local string

  const { data, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => api.getSettings(),
  });

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
      // Launch mode
      setLaunchEnabled(s["launch_mode_enabled"] === "true");
      setLaunchDateLocal(toDatetimeLocal(s["launch_date"] ?? "2026-08-08T10:00:00.000Z"));
    }
  }, [data]);

  // --- Launch mode mutation ---
  const saveLaunchMut = useMutation({
    mutationFn: () =>
      api.updateLaunchSettings({
        enabled: launchEnabled,
        launchDate: fromDatetimeLocal(launchDateLocal),
      }),
    onSuccess: () => {
      toast({
        title: launchEnabled ? "🚀 Launch Mode Enabled" : "Launch Mode Disabled",
        description: launchEnabled
          ? "Users will see the countdown page in production."
          : "All pages are now accessible.",
      });
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // --- Payment mutations ---
  const saveUgandaMut = useMutation({
    mutationFn: () =>
      api.updateSettings({
        mtn_ug_id: mtnId.trim(),
        mtn_ug_id_business_name: mtnBusinessName.trim(),
        airtel_ug_id: airtelId.trim(),
        airtel_ug_id_business_name: airtelBusinessName.trim(),
        eversend_link: eversendLink.trim(),
      }),
    onSuccess: () => {
      toast({ title: "Settings saved", description: "Uganda payment settings have been updated." });
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveZambiaMut = useMutation({
    mutationFn: () =>
      api.updateSettings({
        mtn_zm_id: mtnZmId.trim(),
        mtn_zm_id_business_name: mtnZmBusinessName.trim(),
        airtel_zm_id: airtelZmId.trim(),
        airtel_zm_id_business_name: airtelZmBusinessName.trim(),
      }),
    onSuccess: () => {
      toast({ title: "Settings saved", description: "Zambia payment settings have been updated." });
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveTanzaniaMut = useMutation({
    mutationFn: () =>
      api.updateSettings({
        tz_phone_id: tzPhoneId.trim(),
        tz_phone_id_business_name: tzBusinessName.trim(),
      }),
    onSuccess: () => {
      toast({ title: "Settings saved", description: "Tanzania payment settings have been updated." });
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveCameroonMut = useMutation({
    mutationFn: () =>
      api.updateSettings({
        cm_mtn_phone: cmPhone.trim(),
        cm_mtn_phone_business_name: cmBusinessName.trim(),
      }),
    onSuccess: () => {
      toast({ title: "Settings saved", description: "Cameroon payment settings have been updated." });
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-indigo-600" />
          Settings
        </h1>
        <p className="text-gray-500 text-sm mt-1">Manage launch mode and mobile money payment settings</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <div className="space-y-6">

          {/* ----------------------------------------------------------------
              LAUNCH MODE
          ---------------------------------------------------------------- */}
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden max-w-lg">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-red-50 to-orange-50">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Rocket className="h-4 w-4 text-red-600" />
                Launch Mode
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                When enabled, all user pages show a launch countdown in production only.
              </p>
            </div>

            <div className="p-6 space-y-5">
              {/* Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">Enable Launch Mode</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Only active when <code className="bg-gray-100 px-1 rounded text-xs">NODE_ENV=production</code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLaunchEnabled((v) => !v)}
                  className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  style={{ backgroundColor: launchEnabled ? "#dc2626" : "#d1d5db" }}
                  aria-pressed={launchEnabled}
                >
                  <span
                    className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                    style={{ transform: launchEnabled ? "translateX(22px)" : "translateX(4px)" }}
                  />
                </button>
              </div>

              {/* Status pill */}
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
                style={{
                  background: launchEnabled ? "rgba(220,38,38,0.06)" : "rgba(0,0,0,0.04)",
                  border: `1px solid ${launchEnabled ? "rgba(220,38,38,0.2)" : "rgba(0,0,0,0.08)"}`,
                  color: launchEnabled ? "#dc2626" : "#6b7280",
                }}
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: launchEnabled ? "#dc2626" : "#9ca3af" }}
                />
                {launchEnabled ? "Launch mode is ON — users will see the countdown" : "Launch mode is OFF — all pages are accessible"}
              </div>

              {/* Date & time picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Launch Date &amp; Time <span className="text-gray-400 font-normal">(your local time)</span>
                </label>
                <input
                  type="datetime-local"
                  value={launchDateLocal}
                  onChange={(e) => setLaunchDateLocal(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  When this time arrives the countdown expires and launch mode turns off automatically.
                </p>
              </div>

              <button
                onClick={() => saveLaunchMut.mutate()}
                disabled={saveLaunchMut.isPending || !launchDateLocal}
                className="flex items-center gap-2 px-5 py-2.5 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                style={{ background: launchEnabled ? "#dc2626" : "#4f46e5" }}
              >
                <Save className="h-4 w-4" />
                {saveLaunchMut.isPending ? "Saving..." : "Save Launch Settings"}
              </button>
            </div>
          </div>

          {/* ----------------------------------------------------------------
              UGANDA
          ---------------------------------------------------------------- */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-w-lg">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-900">Uganda Payment Settings</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                These are shown to Ugandan users when they pay via MTN or Airtel
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">MTN Uganda</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment ID</label>
                  <input
                    type="text"
                    value={mtnId}
                    onChange={(e) => setMtnId(e.target.value)}
                    placeholder="e.g. 698734"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Merchant ID shown in step 2 (*165*3#)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Name</label>
                  <input
                    type="text"
                    value={mtnBusinessName}
                    onChange={(e) => setMtnBusinessName(e.target.value)}
                    placeholder="e.g. MALIGAIN LTD"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Displayed in the "CONFIRM it is..." step</p>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5 space-y-3">
                <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">Airtel Uganda</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment ID</label>
                  <input
                    type="text"
                    value={airtelId}
                    onChange={(e) => setAirtelId(e.target.value)}
                    placeholder="e.g. 698734"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Merchant ID shown in step 2 (*185*9#)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Name</label>
                  <input
                    type="text"
                    value={airtelBusinessName}
                    onChange={(e) => setAirtelBusinessName(e.target.value)}
                    placeholder="e.g. MALIGAIN LTD"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Displayed in the "CONFIRM it is..." step</p>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5 space-y-3">
                <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">Eversend Payment Link</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Link URL</label>
                  <input
                    type="url"
                    value={eversendLink}
                    onChange={(e) => setEversendLink(e.target.value)}
                    placeholder="https://eversend.me/kantolah"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Shown to other international users</p>
                </div>
              </div>

              <button
                onClick={() => saveUgandaMut.mutate()}
                disabled={saveUgandaMut.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Save className="h-4 w-4" />
                {saveUgandaMut.isPending ? "Saving..." : "Save Uganda Settings"}
              </button>
            </div>
          </div>

          {/* ----------------------------------------------------------------
              ZAMBIA
          ---------------------------------------------------------------- */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-w-lg">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-900">Zambia Payment Settings</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                These are shown to Zambian users when they pay via MTN or Airtel
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">MTN Zambia</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    value={mtnZmId}
                    onChange={(e) => setMtnZmId(e.target.value)}
                    placeholder="e.g. 254757574729"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Number shown in step 5 of payment instructions</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Name</label>
                  <input
                    type="text"
                    value={mtnZmBusinessName}
                    onChange={(e) => setMtnZmBusinessName(e.target.value)}
                    placeholder="e.g. Charles Vundi Nzive"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5 space-y-3">
                <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">Airtel Zambia</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    value={airtelZmId}
                    onChange={(e) => setAirtelZmId(e.target.value)}
                    placeholder="e.g. 254717290995"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Name</label>
                  <input
                    type="text"
                    value={airtelZmBusinessName}
                    onChange={(e) => setAirtelZmBusinessName(e.target.value)}
                    placeholder="e.g. Pauline Mukai Vundi"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                onClick={() => saveZambiaMut.mutate()}
                disabled={saveZambiaMut.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Save className="h-4 w-4" />
                {saveZambiaMut.isPending ? "Saving..." : "Save Zambia Settings"}
              </button>
            </div>
          </div>

          {/* ----------------------------------------------------------------
              TANZANIA
          ---------------------------------------------------------------- */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-w-lg">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-900">Tanzania Payment Settings</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Shown to Tanzanian users for Vodacom International Transfer to Kenya
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">Vodacom Tanzania (*150*60#)</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Recipient Phone Number (Kenya / Safaricom)</label>
                  <input
                    type="text"
                    value={tzPhoneId}
                    onChange={(e) => setTzPhoneId(e.target.value)}
                    placeholder="e.g. 254757574729"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Number shown in step 5 of payment instructions</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Name (optional)</label>
                  <input
                    type="text"
                    value={tzBusinessName}
                    onChange={(e) => setTzBusinessName(e.target.value)}
                    placeholder="e.g. Charles Vundi Nzive"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                onClick={() => saveTanzaniaMut.mutate()}
                disabled={saveTanzaniaMut.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Save className="h-4 w-4" />
                {saveTanzaniaMut.isPending ? "Saving..." : "Save Tanzania Settings"}
              </button>
            </div>
          </div>

          {/* ----------------------------------------------------------------
              CAMEROON
          ---------------------------------------------------------------- */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-900">Cameroon Payment Settings</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Shown to Cameroonian users for MTN International Transfer (*126*)
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">MTN Cameroon (*126*)</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Recipient Phone Number (Kenya / Mpesa)</label>
                  <input
                    type="text"
                    value={cmPhone}
                    onChange={(e) => setCmPhone(e.target.value)}
                    placeholder="e.g. +254757574729"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Number shown in step 4 of the Cameroon payment instructions</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Name</label>
                  <input
                    type="text"
                    value={cmBusinessName}
                    onChange={(e) => setCmBusinessName(e.target.value)}
                    placeholder="e.g. Charles Nzive"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Name shown in step 5 (CONFIRM it is ...)</p>
                </div>
              </div>

              <button
                onClick={() => saveCameroonMut.mutate()}
                disabled={saveCameroonMut.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Save className="h-4 w-4" />
                {saveCameroonMut.isPending ? "Saving..." : "Save Cameroon Settings"}
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
