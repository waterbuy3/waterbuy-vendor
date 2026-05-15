import { useState, useMemo } from "react";
import {
  Wallet, TrendingUp, Droplets, ShoppingBag, Clock, CheckCircle2,
  ChevronRight, ArrowUpRight, ArrowDownRight, CalendarCheck, Receipt, Minus,
} from "lucide-react";
import { type VendorOrder } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useVendorData } from "@/context/VendorDataContext";
import { useCountUp, tap, inr } from "@/lib/ui";
import { format, parseISO, isToday, isYesterday, differenceInDays, isSameMonth, subMonths } from "date-fns";

type Period = "today" | "week" | "month" | "all";

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Today"    },
  { key: "week",  label: "7 Days"   },
  { key: "month", label: "Month"    },
  { key: "all",   label: "All Time" },
];

function RevenueBar({ orders, period }: { orders: VendorOrder[]; period: Period }) {
  const days = useMemo(() => {
    const n = period === "today" ? 24 : period === "week" ? 7 : 30;
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
                  day.amount > 0 ? "bg-white/70" : "bg-white/20"
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
              <span className="text-[8px] font-semibold text-white/60">{day.label}</span>
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

/** Delivered orders from the period immediately before the selected one. */
function filterPrevPeriod(orders: VendorOrder[], period: Period): VendorOrder[] {
  const now = new Date();
  return orders.filter((o) => {
    if (o.status !== "delivered") return false;
    try {
      const d = parseISO(o.placedAt);
      if (period === "today") return isYesterday(d);
      if (period === "week")  { const diff = differenceInDays(now, d); return diff >= 7 && diff < 14; }
      if (period === "month") return isSameMonth(d, subMonths(now, 1));
      return false;
    } catch { return false; }
  });
}

export function Earnings() {
  const { vendor } = useAuth();
  const { myOrders, payouts, totalRevenue, totalDelivered, totalLitres, pendingPayout } = useVendorData();
  const [period, setPeriod] = useState<Period>("week");

  const periodOrders  = useMemo(() => filterByPeriod(myOrders, period), [myOrders, period]);
  const periodRevenue = useMemo(() => periodOrders.reduce((s, o) => s + o.total,  0), [periodOrders]);
  const periodLitres  = useMemo(() => periodOrders.reduce((s, o) => s + o.litres, 0), [periodOrders]);
  const vendorShare   = totalRevenue * (1 - (vendor?.commissionPct ?? 10) / 100);

  // Trend vs the previous comparable period.
  const prevRevenue = useMemo(
    () => filterPrevPeriod(myOrders, period).reduce((s, o) => s + o.total, 0),
    [myOrders, period]);
  const trend = useMemo(() => {
    if (period === "all" || prevRevenue === 0) return null;
    return Math.round(((periodRevenue - prevRevenue) / prevRevenue) * 100);
  }, [period, periodRevenue, prevRevenue]);

  const avgOrder = periodOrders.length ? periodRevenue / periodOrders.length : 0;

  // Highest-revenue single day inside the selected period.
  const bestDay = useMemo(() => {
    const map = new Map<string, number>();
    periodOrders.forEach((o) => {
      try {
        const k = format(parseISO(o.placedAt), "yyyy-MM-dd");
        map.set(k, (map.get(k) ?? 0) + o.total);
      } catch { /* skip */ }
    });
    let best: { date: string; amount: number } | null = null;
    map.forEach((amount, date) => {
      if (!best || amount > best.amount) best = { date, amount };
    });
    return best as { date: string; amount: number } | null;
  }, [periodOrders]);

  const animatedRevenue = useCountUp(periodRevenue);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-white pt-safe-header px-4 pb-3 border-b border-slate-100">
        <h1 className="text-xl font-extrabold text-slate-900 mb-3">Earnings</h1>
        <div className="flex gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => { tap(); setPeriod(p.key); }}
              className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all ${
                period === p.key
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Revenue card — rich multi-color gradient */}
        <div className="relative bg-gradient-to-br from-violet-700 via-indigo-700 to-blue-700 rounded-2xl p-5 shadow-xl shadow-indigo-300/40 overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-violet-400/20 blur-xl pointer-events-none" />
          <div className="relative flex items-center justify-between mb-1">
            <p className="text-xs font-extrabold text-indigo-200 uppercase tracking-wider">
              {PERIODS.find((p) => p.key === period)?.label} Revenue
            </p>
            {trend !== null && (
              <span className={`flex items-center gap-0.5 text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                trend > 0 ? "bg-emerald-400/25 text-emerald-200"
                : trend < 0 ? "bg-rose-400/25 text-rose-200"
                : "bg-white/15 text-white/70"
              }`}>
                {trend > 0 ? <ArrowUpRight className="h-3 w-3" />
                  : trend < 0 ? <ArrowDownRight className="h-3 w-3" />
                  : <Minus className="h-3 w-3" />}
                {Math.abs(trend)}%
              </span>
            )}
          </div>
          <p className="relative text-4xl font-extrabold text-white mb-1">
            ₹{Math.round(animatedRevenue).toLocaleString("en-IN")}
          </p>
          <p className="relative text-sm text-indigo-200">
            {periodOrders.length} orders · {periodLitres}L delivered
            {trend !== null && (
              <span className="text-indigo-300">
                {" "}· {trend >= 0 ? "up" : "down"} from {inr(prevRevenue)}
              </span>
            )}
          </p>

          <div className="relative mt-4">
            <RevenueBar orders={myOrders} period={period} />
          </div>
        </div>

        {/* Insights — avg order value + best day */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center mb-2">
              <Receipt className="h-4 w-4 text-indigo-600" strokeWidth={1.8} />
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Avg Order Value</p>
            <p className="text-lg font-extrabold text-slate-900">{inr(avgOrder)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center mb-2">
              <CalendarCheck className="h-4 w-4 text-emerald-600" strokeWidth={1.8} />
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Best Day</p>
            <p className="text-lg font-extrabold text-slate-900">
              {bestDay ? inr(bestDay.amount) : "—"}
            </p>
            {bestDay && (
              <p className="text-[10px] text-slate-400 font-medium">
                {format(parseISO(bestDay.date), "d MMM")}
              </p>
            )}
          </div>
        </div>

        {/* All-time stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Gross Revenue",   value: `₹${totalRevenue.toLocaleString()}`, icon: TrendingUp,  bg: "bg-blue-50",    ic: "text-blue-500",    border: "border-blue-100"    },
            { label: "Your Earnings",   value: `₹${vendorShare.toFixed(0)}`,       icon: Wallet,      bg: "bg-violet-50",  ic: "text-violet-600",  border: "border-violet-100"  },
            { label: "Orders Done",     value: String(totalDelivered),              icon: ShoppingBag, bg: "bg-orange-50",  ic: "text-orange-500",  border: "border-orange-100"  },
            { label: "Water Delivered", value: `${totalLitres}L`,                  icon: Droplets,    bg: "bg-emerald-50", ic: "text-emerald-600", border: "border-emerald-100" },
          ].map((s) => (
            <div key={s.label} className={`bg-white rounded-2xl border ${s.border} shadow-sm p-4`}>
              <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center mb-2`}>
                <s.icon className={`h-4 w-4 ${s.ic}`} strokeWidth={1.8} />
              </div>
              <p className="text-[10px] text-slate-400 font-medium">{s.label}</p>
              <p className="text-lg font-extrabold text-slate-900">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Pending payout */}
        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100 shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium mb-0.5">Pending Payout</p>
            <p className="text-2xl font-extrabold text-slate-900">₹{pendingPayout.toFixed(0)}</p>
            <p className="text-xs text-slate-400 mt-1">Platform keeps {vendor?.commissionPct ?? 10}% · you keep {100 - (vendor?.commissionPct ?? 10)}%</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center">
            <Wallet className="h-7 w-7 text-indigo-600" strokeWidth={1.6} />
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
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        : <Clock className="h-4 w-4 text-amber-600" />
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
            AquaPure takes <span className="font-bold text-slate-700">{vendor?.commissionPct ?? 10}%</span> of each delivered order as a platform fee.
            Your earnings are <span className="font-bold text-indigo-600">{100 - (vendor?.commissionPct ?? 10)}%</span> of all revenue.
            Payouts are processed on a weekly cycle.
          </p>
        </div>

        <div className="h-2" />
      </div>
    </div>
  );
}
