import { useEffect, useState } from "react";
import { Wallet, TrendingUp, Droplets, ShoppingBag, Clock, CheckCircle2 } from "lucide-react";
import { subscribeVendorPayouts, getEarningSummary, type Payout } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";

function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ElementType; label: string; value: string; sub?: string; accent: string;
}) {
  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-100 border-l-[3px] ${accent}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.07em] mb-1.5">{label}</p>
          <p className="text-[28px] font-bold text-slate-900 leading-none mb-1 tracking-tight">{value}</p>
          {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
        </div>
        <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">
          <Icon className="h-[18px] w-[18px] text-slate-400" />
        </div>
      </div>
    </div>
  );
}

export function Earnings() {
  const { vendor } = useAuth();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [summary, setSummary] = useState({ totalRevenue: 0, totalOrders: 0, totalLitres: 0, pendingPayout: 0, commissionPct: 10 });

  useEffect(() => {
    if (!vendor) return;
    getEarningSummary(vendor.id).then(setSummary);
    return subscribeVendorPayouts(vendor.id, setPayouts);
  }, [vendor?.id]);

  const vendorShare = summary.totalRevenue * (1 - summary.commissionPct / 100);

  return (
    <div className="max-w-4xl animate-fade-in">
      <div className="mb-6">
        <h2 className="text-base font-extrabold text-slate-900">Earnings</h2>
        <p className="text-xs text-slate-400 mt-0.5">Platform takes {summary.commissionPct}% commission · you keep {100 - summary.commissionPct}%</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={TrendingUp}  label="Gross Revenue"  value={`₹${summary.totalRevenue.toFixed(0)}`}  sub="all delivered orders"              accent="border-l-blue-500"    />
        <StatCard icon={Wallet}      label="Your Earnings"  value={`₹${vendorShare.toFixed(0)}`}           sub={`after ${summary.commissionPct}% platform fee`} accent="border-l-teal-500" />
        <StatCard icon={ShoppingBag} label="Orders Done"    value={String(summary.totalOrders)}             sub="delivered to customers"            accent="border-l-emerald-500" />
        <StatCard icon={Droplets}    label="Total Litres"   value={`${summary.totalLitres}L`}               sub="water delivered"                   accent="border-l-violet-500"  />
      </div>

      {/* Pending payout highlight */}
      <div className="bg-gradient-to-r from-teal-600 to-emerald-500 rounded-2xl p-5 mb-6 flex items-center justify-between shadow-lg">
        <div>
          <p className="text-[11px] font-extrabold text-white/70 uppercase tracking-widest mb-1">Pending Payout</p>
          <p className="text-3xl font-extrabold text-white">₹{summary.pendingPayout.toFixed(2)}</p>
          <p className="text-xs text-white/70 mt-1">Will be transferred on the next payout cycle</p>
        </div>
        <Wallet className="h-12 w-12 text-white/20" />
      </div>

      {/* Payout history */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-extrabold text-slate-900">Payout History</h3>
        </div>
        {payouts.length === 0 ? (
          <div className="py-14 text-center">
            <Clock className="h-8 w-8 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No payouts yet</p>
            <p className="text-xs text-slate-300 mt-1">Your payout history will appear here</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                {["Period", "Amount", "Status", "Paid On"].map((h) => (
                  <th key={h} className="px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-[0.07em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {payouts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5 text-xs font-bold text-slate-800">{p.period}</td>
                  <td className="px-5 py-3.5 text-sm font-extrabold text-slate-900">₹{p.amount.toFixed(2)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                      p.status === "paid"
                        ? "text-emerald-600 bg-emerald-50 border-emerald-200"
                        : "text-amber-600 bg-amber-50 border-amber-200"
                    }`}>
                      {p.status === "paid" ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                      {p.status === "paid" ? "Paid" : "Pending"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-400">
                    {p.paidAt ? format(new Date(p.paidAt), "d MMM yyyy") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
