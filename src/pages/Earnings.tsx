import { useEffect, useState, useMemo } from "react";
import { Wallet, TrendingUp, Droplets, ShoppingBag, Clock, CheckCircle2, ChevronRight } from "lucide-react";
import { subscribeVendorOrders, subscribeVendorPayouts, getEarningSummary, type VendorOrder, type Payout } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { format, parseISO, isToday, differenceInDays, isSameMonth } from "date-fns";

type Period = "today" | "week" | "month" | "all";

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Today"    },
  { key: "week",  label: "7 Days"   },
  { key: "month", label: "Month"    },
  { key: "all",   label: "All Time" },
];

function RevenueBar({ orders, period }: { orders: VendorOrder[]; period: Period }) {
  const days = useMemo(() => {
    const n = period === "today" ? 24 : period === "week" ? 7 : period === "month" ? 30 : 7;
    if (period === "today") {
      const arr = Array.from({ length: 24 }, (_, i) => ({ label: i % 6 === 0 ? `${i}h` : "", amount: 0 }));
      orders.filter((o) => o.status === "delivered").forEach((o) => {
        try {
          const d = parseISO(o.placedAt);
          if (isToday(d)) arr[d.getHours()].amount += o.total;
        } catch { /* skip */ }
      });
      return arr;
    }
    const arr = Array.from({ length: n }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (n - 1 - i));
      return {
        label: i % Math.ceil(n / 5) === 0 ? format(d, n <= 7 ? "EEE" : "d") : "",
        date: format(d, "yyyy-MM-dd"),
        amount: 0,
      };
    });
    orders.filter((o) => o.status === "delivered").forEach((o) => {
      try {
        const ds = format(parseISO(o.placedAt), "yyyy-MM-dd");
        const day = arr.find((d) => (d as { date?: string }).date === ds);
        if (day) day.amount += o.total;
      } catch { /* skip */ }
    });
    return arr;
  }, [orders, period]);

  const max = Math.max(...days.map((d) => d.amount), 1);
  const H = 48;

  return (
    <div>
      <div className="flex items-end gap-0.5" style={{ height: H }}>
        {days.map((day, i) => {
          const barH = Math.max((day.amount / max) * H, day.amount > 0 ? 4 : 2);
          return (
            <div key={i} className="flex-1 flex items-end justify-center">
              <div
                style={{ height: barH }}
                className={`w-full rounded-t-sm transition-all duration-500 ${
                  day.amount > 0 ? "bg-teal-400" : "bg-slate-100"
                }`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-0.5 mt-1">
        {days.map((day, i) => (
          <div key={i} className="flex-1 text-center">
            {day.label && (
              <span className="text-[8px] font-semibold text-slate-400">{day.label}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function filterByPeriod(orders: VendorOrder[], period: Period): VendorOrder[] {
  const now = new Date();
  return orders.filter((o) => {
    if (o.status !== "delivered") return false;
    try {
      const d = parseISO(o.placedAt);
      if (period === "today") return isToday(d);
      if (period === "week")  return differenceInDays(now, d) < 7;
      if (period === "month") return isSameMonth(d, now);
      return true;
    } catch { return false; }
  });
}

export function Earnings() {
  const { vendor } = useAuth();
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [summary, setSummary] = useState({ totalRevenue: 0, totalOrders: 0, totalLitres: 0, pendingPayout: 0, commissionPct: 10 });
  const [period, setPeriod] = useState<Period>("week");

  useEffect(() => {
    if (!vendor) return;
    const u1 = subscribeVendorOrders(vendor.id, setOrders);
    const u2 = subscribeVendorPayouts(vendor.id, setPayouts);
    getEarningSummary(vendor.id).then(setSummary);
    return () => { u1(); u2(); };
  }, [vendor?.id]);

  const periodOrders = useMemo(() => filterByPeriod(orders, period), [orders, period]);
  const periodRevenue = useMemo(() => periodOrders.reduce((s, o) => s + o.total, 0), [periodOrders]);
  const periodLitres  = useMemo(() => periodOrders.reduce((s, o) => s + o.litres, 0), [periodOrders]);
  const vendorShare   = summary.totalRevenue * (1 - summary.commissionPct / 100);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-white pt-safe px-4 pt-4 pb-3 border-b border-slate-100">
        <h1 className="text-xl font-extrabold text-slate-900 mb-3">Earnings</h1>
        <div className="flex gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all ${
                period === p.key ? "bg-teal-600 text-white shadow-sm" : "bg-slate-100 text-slate-500"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Revenue card */}
        <div className="bg-gradient-to-br from-teal-600 via-teal-600 to-emerald-700 rounded-2xl p-5 shadow-lg">
          <p className="text-xs font-extrabold text-teal-200 uppercase tracking-wider mb-1">
            {PERIODS.find((p) => p.key === period)?.label} Revenue
          </p>
          <p className="text-4xl font-extrabold text-white mb-1">₹{periodRevenue.toLocaleString()}</p>
          <p className="text-sm text-teal-200">{periodOrders.length} orders · {periodLitres}L delivered</p>

          <div className="mt-4">
            <RevenueBar orders={orders} period={period} />
          </div>
        </div>

        {/* All-time stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Gross Revenue",   value: `₹${summary.totalRevenue.toLocaleString()}`, icon: TrendingUp,  bg: "bg-blue-50",    ic: "text-blue-500"   },
            { label: "Your Earnings",   value: `₹${vendorShare.toFixed(0)}`,                icon: Wallet,      bg: "bg-teal-50",    ic: "text-teal-600"   },
            { label: "Orders Done",     value: String(summary.totalOrders),                  icon: ShoppingBag, bg: "bg-emerald-50", ic: "text-emerald-600"},
            { label: "Water Delivered", value: `${summary.totalLitres}L`,                   icon: Droplets,    bg: "bg-violet-50",  ic: "text-violet-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center mb-2`}>
                <s.icon className={`h-4 w-4 ${s.ic}`} strokeWidth={1.8} />
              </div>
              <p className="text-[10px] text-slate-400 font-medium">{s.label}</p>
              <p className="text-lg font-extrabold text-slate-900">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Pending payout */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium mb-0.5">Pending Payout</p>
            <p className="text-2xl font-extrabold text-slate-900">₹{summary.pendingPayout.toFixed(0)}</p>
            <p className="text-xs text-slate-400 mt-1">Platform keeps {summary.commissionPct}% · you keep {100 - summary.commissionPct}%</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center">
            <Wallet className="h-7 w-7 text-teal-500" strokeWidth={1.6} />
          </div>
        </div>

        {/* Payout history */}
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 mb-3">Payout History</h3>
          {payouts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 py-10 text-center">
              <Clock className="h-7 w-7 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400 font-medium">No payouts yet</p>
              <p className="text-xs text-slate-300">Your payout history will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {payouts.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${p.status === "paid" ? "bg-emerald-50" : "bg-amber-50"}`}>
                      {p.status === "paid"
                        ? <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                        : <Clock className="h-4.5 w-4.5 text-amber-600" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">₹{p.amount.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{p.period}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                      p.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {p.status === "paid" ? "Paid" : "Pending"}
                    </span>
                    {p.paidAt && (
                      <p className="text-[10px] text-slate-400 mt-1">{format(new Date(p.paidAt), "d MMM yyyy")}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Commission info */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <ChevronRight className="h-4 w-4 text-slate-500" />
            <p className="text-xs font-extrabold text-slate-700">Commission Structure</p>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            AquaPure takes <span className="font-bold text-slate-700">{summary.commissionPct}%</span> of each delivered order as a platform fee.
            Your earnings are <span className="font-bold text-teal-600">{100 - summary.commissionPct}%</span> of all revenue.
            Payouts are processed on a weekly cycle.
          </p>
        </div>

        <div className="h-2" />
      </div>
    </div>
  );
}
