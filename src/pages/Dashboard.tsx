import { useEffect, useState } from "react";
import { ShoppingBag, Droplets, Wallet, TrendingUp, Clock, CheckCircle2, XCircle, Truck } from "lucide-react";
import { subscribeVendorOrders, getEarningSummary, type VendorOrder } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending:    { label: "New",       color: "text-amber-600 bg-amber-50 border-amber-200" },
  confirmed:  { label: "Confirmed", color: "text-blue-600 bg-blue-50 border-blue-200"   },
  in_transit: { label: "In Transit",color: "text-purple-600 bg-purple-50 border-purple-200" },
  delivered:  { label: "Delivered", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  cancelled:  { label: "Cancelled", color: "text-red-500 bg-red-50 border-red-200"      },
};

function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ElementType; label: string; value: string; sub?: string; accent: string;
}) {
  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-100 border-l-[3px] ${accent} flex items-start justify-between gap-4`}>
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.07em] mb-1.5">{label}</p>
        <p className="text-[28px] font-bold text-slate-900 leading-none mb-1 tracking-tight">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 font-medium">{sub}</p>}
      </div>
      <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-[18px] w-[18px] text-slate-400" />
      </div>
    </div>
  );
}

export function Dashboard() {
  const { vendor } = useAuth();
  const [orders,  setOrders]  = useState<VendorOrder[]>([]);
  const [summary, setSummary] = useState({ totalRevenue: 0, totalOrders: 0, totalLitres: 0, pendingPayout: 0, commissionPct: 10 });

  useEffect(() => {
    if (!vendor) return;
    const unsub = subscribeVendorOrders(vendor.id, setOrders);
    getEarningSummary(vendor.id).then(setSummary);
    return unsub;
  }, [vendor?.id]);

  const today = format(new Date(), "yyyy-MM-dd");
  const todayOrders  = orders.filter((o) => o.placedAt?.slice(0, 10) === today);
  const pendingOrders = orders.filter((o) => o.status === "pending");
  const recentOrders  = orders.slice(0, 8);

  return (
    <div className="max-w-5xl animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {vendor?.name?.split(" ")[0] ?? "Vendor"}</h2>
          <p className="text-sm text-slate-400 mt-0.5">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
        </div>
        {pendingOrders.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-sm font-extrabold text-amber-700">{pendingOrders.length} new order{pendingOrders.length !== 1 ? "s" : ""} waiting</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={ShoppingBag} label="Today's Orders"  value={String(todayOrders.length)}          sub="orders placed today"     accent="border-l-blue-500"    />
        <StatCard icon={Droplets}    label="Total Delivered"  value={`${summary.totalLitres}L`}           sub="across all orders"       accent="border-l-teal-500"    />
        <StatCard icon={TrendingUp}  label="Total Revenue"    value={`₹${summary.totalRevenue.toFixed(0)}`} sub={`after ${summary.commissionPct}% commission`} accent="border-l-emerald-500" />
        <StatCard icon={Wallet}      label="Pending Payout"   value={`₹${summary.pendingPayout.toFixed(0)}`} sub="awaiting transfer"    accent="border-l-violet-500"  />
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-extrabold text-slate-900">Recent Orders</h3>
          <span className="text-xs text-slate-400">{orders.length} total</span>
        </div>
        {recentOrders.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingBag className="h-8 w-8 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No orders yet</p>
            <p className="text-xs text-slate-300 mt-1">Orders assigned to you will appear here</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                {["Order", "Customer", "Items", "Total", "Status", "Time"].map((h) => (
                  <th key={h} className="px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-[0.07em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentOrders.map((order) => {
                const meta = STATUS_META[order.status] ?? STATUS_META.pending;
                return (
                  <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 text-xs font-bold text-slate-900">#{order.id.slice(-6).toUpperCase()}</td>
                    <td className="px-5 py-3.5">
                      <p className="text-xs font-bold text-slate-900">{order.customer}</p>
                      <p className="text-[10px] text-slate-400">{order.phone}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600 max-w-[160px] truncate">{order.items}</td>
                    <td className="px-5 py-3.5 text-xs font-bold text-slate-900">₹{order.total}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${meta.color}`}>
                        {order.status === "delivered" && <CheckCircle2 className="h-2.5 w-2.5" />}
                        {order.status === "in_transit" && <Truck className="h-2.5 w-2.5" />}
                        {order.status === "cancelled" && <XCircle className="h-2.5 w-2.5" />}
                        {order.status === "pending" && <Clock className="h-2.5 w-2.5" />}
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[10px] text-slate-400">
                      {order.placedAt ? format(new Date(order.placedAt), "d MMM, h:mm a") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
