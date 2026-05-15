import { useState, useEffect, useMemo } from "react";
import {
  Building2, Phone, MapPin, Landmark, KeyRound, LogOut,
  ChevronRight, Droplets, Save, Loader2, Eye, EyeOff,
  ToggleLeft, ToggleRight, Percent, X, Mail,
  HelpCircle, ChevronDown, ShieldCheck,
} from "lucide-react";
import { updateVendorProfile, vendorSignOut, supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { tap } from "@/lib/ui";
import { format } from "date-fns";
import { toast } from "sonner";

const FAQS: { q: string; a: string }[] = [
  { q: "How do I receive new orders?",
    a: "Keep your store Open. New cart orders appear under Orders › New — accept them to confirm delivery." },
  { q: "What are recurring orders?",
    a: "Schedules and subscriptions are repeat deliveries. Claim one from the Recurring tab to own all its future deliveries." },
  { q: "When do I get paid?",
    a: "Payouts run on a weekly cycle. Your pending balance is shown on the Earnings page after the platform commission." },
  { q: "Why is a product hidden from customers?",
    a: "Inactive products and items with zero stock are not shown. Toggle a product Active and keep stock above zero." },
];

type Section = "profile" | "bank" | "password" | null;

async function updatePassword(newPw: string): Promise<void> {
  if (!supabase) throw new Error("Not configured");
  const { error } = await supabase.auth.updateUser({ password: newPw });
  if (error) throw error;
}

function SectionEditor({ title, onClose, children, onSave, saving }: {
  title: string; onClose: () => void; onSave: () => void; saving: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-backdrop" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col animate-slide-up">
        <div className="flex justify-center pt-3 shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0">
          <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4">{children}</div>
        <div className="flex gap-3 px-5 py-4 border-t border-slate-100 shrink-0 pb-safe">
          <button onClick={onClose} className="flex-1 py-3 border border-slate-200 text-slate-700 text-sm font-extrabold rounded-2xl">
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 py-3 bg-indigo-600 text-white text-sm font-extrabold rounded-2xl disabled:opacity-60 flex items-center justify-center gap-2 shadow-md shadow-indigo-200"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export function Settings() {
  const { vendor, user } = useAuth();
  const navigate = useNavigate();
  const [openSection, setOpenSection] = useState<Section>(null);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  const [profile, setProfile] = useState({ name: "", phone: "", area: "" });
  const [bank, setBank] = useState({ bankName: "", bankAccount: "", bankIfsc: "" });
  const [pw, setPw] = useState({ current: "", newPw: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (!vendor) return;
    setProfile({ name: vendor.name ?? "", phone: vendor.phone ?? "", area: vendor.area ?? "" });
    setBank({ bankName: vendor.bankName ?? "", bankAccount: vendor.bankAccount ?? "", bankIfsc: vendor.bankIfsc ?? "" });
    // Re-sync whenever the underlying vendor data changes so external updates
    // (e.g. admin tweaks) show up in the editor sheets.
  }, [vendor?.id, vendor?.name, vendor?.phone, vendor?.area, vendor?.bankName, vendor?.bankAccount, vendor?.bankIfsc]);

  const inp = "w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all";

  const saveProfile = async () => {
    if (!vendor) return;
    if (!profile.name.trim()) { toast.error("Business name is required"); return; }
    if (!profile.phone.trim()) { toast.error("Phone number is required"); return; }
    setSaving(true);
    try {
      await updateVendorProfile(vendor.id, {
        name:  profile.name.trim(),
        phone: profile.phone.trim(),
        area:  profile.area.trim(),
      });
      toast.success("Profile updated");
      setOpenSection(null);
    } catch { toast.error("Failed to update profile"); }
    finally { setSaving(false); }
  };

  const saveBank = async () => {
    if (!vendor) return;
    if (!bank.bankName.trim() || !bank.bankAccount.trim() || !bank.bankIfsc.trim()) {
      toast.error("All bank fields are required"); return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bank.bankIfsc.trim())) {
      toast.error("Enter a valid IFSC code"); return;
    }
    setSaving(true);
    try {
      await updateVendorProfile(vendor.id, {
        bankName:    bank.bankName.trim(),
        bankAccount: bank.bankAccount.trim(),
        bankIfsc:    bank.bankIfsc.trim().toUpperCase(),
      });
      toast.success("Bank details updated");
      setOpenSection(null);
    } catch { toast.error("Failed to update bank details"); }
    finally { setSaving(false); }
  };

  const savePassword = async () => {
    if (pw.newPw.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (pw.newPw !== pw.confirm) { toast.error("Passwords don't match"); return; }
    setSaving(true);
    try {
      await updatePassword(pw.newPw);
      toast.success("Password changed successfully");
      setPw({ current: "", newPw: "", confirm: "" });
      setOpenSection(null);
    } catch { toast.error("Failed to change password"); }
    finally { setSaving(false); }
  };

  const toggleOpen = async () => {
    if (!vendor || toggling) return;
    setToggling(true);
    try {
      // Realtime subscription will push the updated row — skip extra fetch.
      await updateVendorProfile(vendor.id, { isOpen: !vendor.isOpen });
      toast.success(vendor.isOpen ? "Store closed" : "Store is now open!");
    } catch { toast.error("Failed to update status"); }
    finally { setToggling(false); }
  };

  const signOut = async () => {
    await vendorSignOut();
    navigate("/login");
  };

  const initials = vendor?.name
    ? vendor.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "V";

  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  // Profile completeness — drives the setup banner.
  const completeness = useMemo(() => {
    const checks: [string, boolean][] = [
      ["Business name",  !!vendor?.name?.trim()],
      ["Phone number",   !!vendor?.phone?.trim()],
      ["Service area",   !!vendor?.area?.trim()],
      ["Bank name",      !!vendor?.bankName?.trim()],
      ["Account number", !!vendor?.bankAccount?.trim()],
      ["IFSC code",      !!vendor?.bankIfsc?.trim()],
    ];
    const done = checks.filter(([, ok]) => ok).length;
    return {
      pct: Math.round((done / checks.length) * 100),
      missing: checks.filter(([, ok]) => !ok).map(([l]) => l),
    };
  }, [vendor]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-white pt-safe-header px-4 pb-3 border-b border-slate-100">
        <h1 className="text-xl font-extrabold text-slate-900">Settings</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Business card — rich gradient */}
        <div className="relative bg-gradient-to-br from-[#0f0c29] via-[#1a1260] to-[#2d1fa3] rounded-2xl p-5 flex items-center gap-4 overflow-hidden">
          <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-violet-500/20 blur-xl pointer-events-none" />
          <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/10 flex items-center justify-center text-xl font-extrabold text-white shrink-0">
            {initials}
          </div>
          <div className="relative flex-1 min-w-0">
            <p className="text-lg font-extrabold text-white truncate">{vendor?.name ?? "Your Business"}</p>
            <p className="text-sm text-indigo-300 truncate">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${vendor?.isOpen ? "bg-emerald-400/30 text-emerald-200" : "bg-rose-400/30 text-rose-200"}`}>
                {vendor?.isOpen ? "Open" : "Closed"}
              </span>
              {vendor?.commissionPct !== undefined && (
                <span className="flex items-center gap-0.5 text-[10px] text-indigo-300 font-medium">
                  <Percent className="h-2.5 w-2.5" />{vendor.commissionPct}% fee
                </span>
              )}
              <span className="text-[10px] text-indigo-400 font-medium">
                {vendor?.createdAt ? `Since ${format(new Date(vendor.createdAt), "MMM yyyy")}` : ""}
              </span>
            </div>
          </div>
          <div className="relative shrink-0">
            <Droplets className="h-8 w-8 text-white/20" strokeWidth={1.5} />
          </div>
        </div>

        {/* Profile completeness */}
        {completeness.pct < 100 ? (
          <button
            onClick={() => {
              tap();
              setOpenSection(completeness.missing.some((m) => /bank|account|ifsc/i.test(m)) && completeness.missing.length <= 3
                ? "bank" : "profile");
            }}
            className="w-full bg-white rounded-2xl border border-amber-200 shadow-sm p-4 text-left animate-pop-in"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-extrabold text-slate-900">Complete your profile</p>
              <span className="text-xs font-extrabold text-amber-600">{completeness.pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-2.5">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-700"
                style={{ width: `${completeness.pct}%` }} />
            </div>
            <p className="text-xs text-slate-500">
              Add: <span className="font-semibold text-slate-700">{completeness.missing.join(", ")}</span>
            </p>
          </button>
        ) : (
          <div className="w-full bg-emerald-50 rounded-2xl border border-emerald-200 p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-emerald-800">Profile complete</p>
              <p className="text-xs text-emerald-600">You're all set to receive orders and payouts.</p>
            </div>
          </div>
        )}

        {/* Store Status */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50">
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Store</p>
          </div>
          <button
            onClick={toggleOpen}
            disabled={toggling}
            className="w-full flex items-center justify-between px-4 py-4"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${vendor?.isOpen ? "bg-emerald-50" : "bg-rose-50"}`}>
                {vendor?.isOpen
                  ? <ToggleRight className="h-5 w-5 text-emerald-600" />
                  : <ToggleLeft  className="h-5 w-5 text-rose-500" />
                }
              </div>
              <div className="text-left">
                <p className="text-sm font-extrabold text-slate-900">
                  {vendor?.isOpen ? "Open for Orders" : "Store Closed"}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {vendor?.isOpen ? "Customers can place orders now" : "Tap to open your store"}
                </p>
              </div>
            </div>
            <div className={`w-12 h-6 rounded-full relative transition-all ${vendor?.isOpen ? "bg-emerald-500" : "bg-slate-300"}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${vendor?.isOpen ? "left-6" : "left-0.5"}`} />
            </div>
          </button>
        </div>

        {/* Profile & Bank */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50">
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Business</p>
          </div>

          <button
            onClick={() => { tap(); setOpenSection("profile"); }}
            className="w-full flex items-center gap-3 px-4 py-4 border-b border-slate-50 active:bg-slate-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-extrabold text-slate-900">Business Profile</p>
              <p className="text-xs text-slate-400 truncate mt-0.5">{vendor?.name} · {vendor?.area || "No area set"}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
          </button>

          <button
            onClick={() => { tap(); setOpenSection("bank"); }}
            className="w-full flex items-center gap-3 px-4 py-4 active:bg-slate-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
              <Landmark className="h-5 w-5 text-violet-600" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-extrabold text-slate-900">Bank Details</p>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {vendor?.bankName && vendor?.bankAccount
                  ? `${vendor.bankName} · ****${vendor.bankAccount.slice(-4)}`
                  : "Not set — add for payouts"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
          </button>
        </div>

        {/* Account */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50">
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Account</p>
          </div>

          <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-50">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
              <Mail className="h-5 w-5 text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-extrabold text-slate-900">Email</p>
              <p className="text-xs text-slate-400 truncate mt-0.5">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={() => { tap(); setOpenSection("password"); }}
            className="w-full flex items-center gap-3 px-4 py-4 border-b border-slate-50 active:bg-slate-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <KeyRound className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-extrabold text-slate-900">Change Password</p>
              <p className="text-xs text-slate-400 mt-0.5">Update your account password</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
          </button>

          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-4 active:bg-red-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <LogOut className="h-5 w-5 text-red-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-extrabold text-red-500">Sign Out</p>
              <p className="text-xs text-slate-400 mt-0.5">Log out of your vendor account</p>
            </div>
          </button>
        </div>

        {/* Help & FAQ */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
            <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Help &amp; FAQ</p>
          </div>
          {FAQS.map((f, i) => {
            const open = faqOpen === i;
            return (
              <div key={i} className={i < FAQS.length - 1 ? "border-b border-slate-50" : ""}>
                <button
                  onClick={() => { tap(); setFaqOpen(open ? null : i); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50 transition-colors"
                >
                  <p className="flex-1 text-sm font-bold text-slate-800">{f.q}</p>
                  <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
                {open && (
                  <p className="px-4 pb-4 -mt-1 text-xs text-slate-500 leading-relaxed animate-fade-in">
                    {f.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* App info */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
            <Droplets className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-extrabold text-slate-900">AquaPure Vendor</p>
            <p className="text-xs text-slate-400">v1.0.0 · Powered by AquaPure Platform</p>
          </div>
        </div>

        <div className="h-2" />
      </div>

      {/* ── Business Profile Sheet ── */}
      {openSection === "profile" && (
        <SectionEditor title="Business Profile" onClose={() => setOpenSection(null)} onSave={saveProfile} saving={saving}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Business / Distributor Name</label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="Your business name" className={`${inp} pl-10`} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Contact Phone</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+91 98765 43210" className={`${inp} pl-10`} inputMode="tel" autoComplete="tel" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Service Area</label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input value={profile.area} onChange={(e) => setProfile({ ...profile, area: e.target.value })}
                  placeholder="e.g. Koramangala, Bangalore" className={`${inp} pl-10`} />
              </div>
            </div>
          </div>
        </SectionEditor>
      )}

      {/* ── Bank Details Sheet ── */}
      {openSection === "bank" && (
        <SectionEditor title="Bank Details" onClose={() => setOpenSection(null)} onSave={saveBank} saving={saving}>
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              <p className="text-xs text-amber-700 font-medium">Your bank details are used for payouts. Ensure they are accurate.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Bank Name</label>
              <div className="relative">
                <Landmark className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input value={bank.bankName} onChange={(e) => setBank({ ...bank, bankName: e.target.value })}
                  placeholder="e.g. State Bank of India" className={`${inp} pl-10`} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Account Number</label>
              <input
                value={bank.bankAccount}
                onChange={(e) => setBank({ ...bank, bankAccount: e.target.value.replace(/\D/g, "") })}
                placeholder="Enter account number"
                className={inp}
                inputMode="numeric"
                maxLength={20}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">IFSC Code</label>
              <input
                value={bank.bankIfsc}
                onChange={(e) => setBank({ ...bank, bankIfsc: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
                placeholder="e.g. SBIN0001234"
                className={inp}
                style={{ textTransform: "uppercase" }}
                maxLength={11}
                autoCapitalize="characters"
                autoComplete="off"
              />
            </div>
          </div>
        </SectionEditor>
      )}

      {/* ── Change Password Sheet ── */}
      {openSection === "password" && (
        <SectionEditor title="Change Password" onClose={() => setOpenSection(null)} onSave={savePassword} saving={saving}>
          <div className="space-y-4">
            {[
              { label: "New Password",     key: "newPw",   placeholder: "Min. 6 characters" },
              { label: "Confirm Password", key: "confirm", placeholder: "Re-enter new password" },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">{f.label}</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={pw[f.key as keyof typeof pw]}
                    onChange={(e) => setPw({ ...pw, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    className={`${inp} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))}
            {pw.confirm && pw.newPw !== pw.confirm && (
              <p className="text-xs text-red-500 font-medium">Passwords don't match</p>
            )}
          </div>
        </SectionEditor>
      )}
    </div>
  );
}
