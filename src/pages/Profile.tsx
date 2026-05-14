import { useState } from "react";
import { User, Phone, MapPin, Building2, Save, Loader2, Percent } from "lucide-react";
import { updateVendorProfile } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export function Profile() {
  const { vendor } = useAuth();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name:        vendor?.name        ?? "",
    phone:       vendor?.phone       ?? "",
    area:        vendor?.area        ?? "",
    bankName:    vendor?.bankName    ?? "",
    bankAccount: vendor?.bankAccount ?? "",
    bankIfsc:    vendor?.bankIfsc    ?? "",
  });

  // Keep form in sync if vendor loads after mount
  if (vendor && !form.name && vendor.name) {
    setForm({
      name: vendor.name, phone: vendor.phone, area: vendor.area,
      bankName: vendor.bankName, bankAccount: vendor.bankAccount, bankIfsc: vendor.bankIfsc,
    });
  }

  const handleSave = async () => {
    if (!vendor) return;
    setSaving(true);
    try {
      await updateVendorProfile(vendor.id, form);
      toast.success("Profile updated");
    } catch { toast.error("Failed to update profile"); }
    finally { setSaving(false); }
  };

  const fieldCls = "w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all";

  const initials = vendor?.name
    ? vendor.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "V";

  return (
    <div className="max-w-xl animate-fade-in">
      {/* Avatar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-4 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-2xl font-extrabold text-white shadow">
          {initials}
        </div>
        <div>
          <h2 className="text-base font-extrabold text-slate-900">{vendor?.name || "Your Business"}</h2>
          <p className="text-sm text-slate-400">{vendor?.email}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
              vendor?.isOpen
                ? "text-emerald-600 bg-emerald-50 border-emerald-200"
                : "text-red-500 bg-red-50 border-red-200"
            }`}>
              {vendor?.isOpen ? "Open for Orders" : "Closed"}
            </span>
            {vendor?.commissionPct !== undefined && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-slate-400">
                <Percent className="h-2.5 w-2.5" />{vendor.commissionPct}% platform fee
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Business info */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-4">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <User className="h-4 w-4 text-teal-600" />
          <h3 className="text-sm font-extrabold text-slate-900">Business Details</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Business / Distributor Name</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={`${fieldCls} pl-9`} placeholder="Your company name" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Contact Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={`${fieldCls} pl-9`} placeholder="+91 98765 43210" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Service Area / Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}
                className={`${fieldCls} pl-9`} placeholder="e.g. Koramangala, Bangalore" />
            </div>
          </div>
        </div>
      </div>

      {/* Bank details */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-5">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <Building2 className="h-4 w-4 text-teal-600" />
          <h3 className="text-sm font-extrabold text-slate-900">Payout Bank Details</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Bank Name</label>
            <input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              className={fieldCls} placeholder="e.g. State Bank of India" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Account Number</label>
            <input value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
              className={fieldCls} placeholder="Enter account number" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">IFSC Code</label>
            <input value={form.bankIfsc} onChange={(e) => setForm({ ...form, bankIfsc: e.target.value.toUpperCase() })}
              className={fieldCls} placeholder="e.g. SBIN0001234" />
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-extrabold rounded-xl transition-colors flex items-center justify-center gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}
