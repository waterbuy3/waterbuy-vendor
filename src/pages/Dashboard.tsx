import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingBag, Droplets, TrendingUp, Wallet, Zap, ChevronRight,
  Bell, ToggleLeft, ToggleRight, CheckCircle2, XCircle, Clock, Truck,
} from "lucide-react";
import {
  updateVendorProfile, acceptOrder, rejectOrder, updateOrderStatus, type VendorOrder,
} from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useVendorData } from "@/context/VendorDataContext";
import { format, isToday, subDays, parseISO } from "date-fns";
import { toast } from "sonner";

const STATUS_COLOR: Record<string, string> = {
  pending:    "bg-amber-100 text-amber-700",
  confirmed:  "bg-blue-100 text-blue-700",
  in_transit: "bg-violet-100 text-violet-700",
  delivered:  "bg-emerald-100 text-emerald-700",
  cancelled:  "bg-red-100 text-red-500",
};
const STATUS_LABEL: Record<string, string> = {
  pending:    "New",
  confirmed:  "Confirmed",
  in_transit: "In Transit",
  delivered:  "Delivered",
  cancelled:  "Cancelled",
};

function WeekChart({ orders }: { orders: VendorOrder[] }) {
  const days = useMemo(() => {
    const arr = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      return { label: format(d, "EEE"), date: format(d, "yyyy-MM-dd"), amount: 0, today: isToday(d) };
    });
    orders
      .filter((o) => o.status === "delivered")
      .forEach((o) => {
        try {
          const ds = format(parseISO(o.placedAt), "yyyy-MM-dd");
          const day = arr.find((d) => d.date === ds);
          if (day) day.amount += o.total;
        } catch { /* skip */ }
      });
    return arr;
  }, [orders]);

  const max = Math.max(...days.map((d) => d.amount), 1);
  const H = 52;

  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height: H }}>
        {days.map((day) => {
          const barH = Math.max((day.amount / max) * H, day.amount > 0 ? 6 : 3);
          return (
            <div key={day.date} className="flex-1 flex items-end justify-center">
              <div
                style={{ height: barH }}
                className={`w-full rounded-t-md transition-all duration-500 ${
                  day.today
                    ? "bg-gradient-to-t from-indigo-600 to-violet-500"
                    : day.amount > 0 ? "bg-indigo-200" : "bg-slate-100"
                }`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {days.map((day) => (
          <div key={day.date} className="flex-1 text-center">
            <span className={`text-[9px] font-bold ${day.today ? "text-indigo-600" : "text-slate-400"}`}>
              {day.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { vendor, refreshVendor } = useAuth();
  const { myOrders, newOrders, totalRevenue, totalDelivered, totalLitres, pendingPayout } = useVendorData();
  const navigate = useNavigate();
  const [toggling, setToggling] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const todayOrders = useMemo(() =>
    myOrders.filter((o) => { try { return isToday(parseISO(o.placedAt)); } catch { return false; } }),
    [myOrders]);

  const todayRevenue = useMemo(() =>
    todayOrders.filter((o) => o.status === "delivered").reduce((s, o) => s + o.total, 0),
    [todayOrders]);

  const todayLitres = useMemo(() =>
    todayOrders.filter((o) => o.status === "delivered").reduce((s, o) => s + o.litres, 0),
    [todayOrders]);

  const recentOrders = myOrders.slice(0, 5);

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  })();

  const initials = vendor?.name
    ? vendor.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "V";

  const toggleOpen = async () => {
    if (!vendor || toggling) return;
    setToggling(true);
    try {
      await updateVendorProfile(vendor.id, { isOpen: !vendor.isOpen });
      await refreshVendor();
      toast.success(vendor.isOpen ? "Store closed" : "You're now open for orders!");
    } catch { toast.error("Failed to update status"); }
    finally { setToggling(false); }
  };

  const handleAccept = async (orderId: string) => {
    if (!vendor || acting) return;
    setActing(orderId);
    try {
      await acceptOrder(orderId, vendor.id);
      toast.success("Order accepted");
    } catch { toast.error("Action failed"); }
    finally { setActing(null); }
  };

  const handleReject = async (orderId: string) => {
    if (acting) return;
    setActing(orderId);
    try {
      await rejectOrder(orderId);
      toast.success("Order rejected");
    } catch { toast.error("Action failed"); }
    finally { setActing(null); }
  };

  const handleAdvance = async (order: VendorOrder) => {
    if (acting) return;
    const next = order.status === "confirmed" ? "in_transit" : "delivered";
    setActing(order.id);
    try {
      await updateOrderStatus(order.id, next);
      toast.success(next === "in_transit" ? "Order out for delivery" : "Order marked as delivered!");
    } catch { toast.error("Action failed"); }
    finally { setActing(null); }
  };

  return (
    <div className="animate-fade-in">
      {/* ── Rich Header ── */}
      <div className="relative bg-gradient-to-br from-[#0f0c29] via-[#1a1260] to-[#2d1fa3] pt-safe px-4 pt-4 pb-8 overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-violet-500/15 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-indigo-400/10 blur-xl pointer-events-none" />

        <div className="relative flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-sm font-extrabold text-white border border-white/10 shrink-0">
              {initials}
            </div>
            <div>
              <p className="text-xs text-indigo-300 font-medium">{greeting}</p>
              <p className="text-base font-extrabold text-white">{vendor?.name ?? "Vendor"}</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/orders")}
            className="relative w-10 h-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center"
          >
            <Bell className="h-[18px] w-[18px] text-white" />
            {newOrders.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full text-[10px] font-extrabold text-white flex items-center justify-center">
                {newOrders.length}
              </span>
            )}
          </button>
        </div>

        {/* Store status toggle */}
        <button
          onClick={toggleOpen}
          disabled={toggling}
          className={`relative w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all border ${
            vendor?.isOpen
              ? "bg-white/10 border-white/15"
              : "bg-rose-500/20 border-rose-400/25"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full ${vendor?.isOpen ? "bg-emerald-400 live-dot" : "bg-rose-400"}`} />
            <div className="text-left">
              <p className="text-sm font-extrabold text-white leading-none">
                {vendor?.isOpen ? "Open for Orders" : "Store Closed"}
              </p>
              <p className="text-[10px] text-white/50 mt-0.5">
                {vendor?.isOpen ? "Customers can place orders" : "Tap to open your store"}
              </p>
            </div>
          </div>
          {vendor?.isOpen
            ? <ToggleRight className="h-6 w-6 text-emerald-300 shrink-0" />
            : <ToggleLeft  className="h-6 w-6 text-rose-300 shrink-0" />
          }
        </button>
      </div>

      {/* ── Today Stats ── */}
      <div className="px-4 -mt-4 grid grid-cols-3 gap-2.5 mb-4">
        {[
          { label: "Today's Orders", value: String(todayOrders.length),  icon: ShoppingBag, bg: "bg-orange-50",  ic: "text-orange-500",  border: "border-orange-100" },
          { label: "Revenue Today",  value: `₹${todayRevenue}`,          icon: TrendingUp,  bg: "bg-emerald-50", ic: "text-emerald-600", border: "border-emerald-100" },
          { label: "Litres Deliv.",  value: `${todayLitres}L`,           icon: Droplets,    bg: "bg-blue-50",    ic: "text-blue-500",    border: "border-blue-100"   },
        ].map((s) => (
          <div key={s.label} className={`bg-white rounded-2xl shadow-md border ${s.border} p-3`}>
            <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center mb-2`}>
              <s.icon className={`h-4 w-4 ${s.ic}`} strokeWidth={1.8} />
            </div>
            <p className="text-[10px] text-slate-400 font-medium leading-tight">{s.label}</p>
            <p className="text-[17px] font-extrabold text-slate-900 leading-tight mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="px-4 space-y-4">
        {/* ── New Orders Alert ── */}
        {newOrders.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                <Zap className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-amber-900">
                  {newOrders.length} new order{newOrders.length > 1 ? "s" : ""} waiting
                </p>
                <p className="text-xs text-amber-600">Accept to confirm delivery</p>
              </div>
            </div>
            {newOrders.slice(0, 2).map((order) => (
              <div key={order.id} className="bg-white rounded-xl p-3 mb-2 border border-amber-100 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs font-extrabold text-slate-900">{order.customer}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{order.items}</p>
                  </div>
                  <p className="text-sm font-extrabold text-slate-900">₹{order.total}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={acting === order.id}
                    onClick={() => handleAccept(order.id)}
                    className="flex-1 py-1.5 bg-emerald-600 text-white text-xs font-extrabold rounded-lg flex items-center justify-center gap-1 disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Accept
                  </button>
                  <button
                    disabled={acting === order.id}
                    onClick={() => handleReject(order.id)}
                    className="flex-1 py-1.5 bg-red-50 text-red-600 text-xs font-extrabold rounded-lg border border-red-100 flex items-center justify-center gap-1 disabled:opacity-60"
                  >
                    <XCircle className="h-3 w-3" /> Reject
                  </button>
                </div>
              </div>
            ))}
            {newOrders.length > 2 && (
              <button
                onClick={() => navigate("/orders")}
                className="w-full py-2 text-xs font-extrabold text-amber-700 bg-amber-100 rounded-xl"
              >
                +{newOrders.length - 2} more — View all orders
              </button>
            )}
          </div>
        )}

        {/* ── Weekly Revenue Chart ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Total Revenue</p>
              <p className="text-2xl font-extrabold text-slate-900">₹{totalRevenue.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-slate-400 font-medium">Pending Payout</p>
              <p className="text-lg font-extrabold text-indigo-600">₹{pendingPayout.toLocaleString()}</p>
            </div>
          </div>
          <WeekChart orders={myOrders} />
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
            <div className="flex items-center gap-2">
              <Wallet className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-400 font-medium">{totalDelivered} orders delivered</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">{totalLitres}L water</span>
          </div>
        </div>

        {/* ── Recent Orders ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-extrabold text-slate-900">Recent Orders</h3>
            <button onClick={() => navigate("/orders")} className="flex items-center gap-0.5 text-xs font-bold text-indigo-600">
              See all <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 py-10 text-center">
              <ShoppingBag className="h-8 w-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400 font-medium">No orders yet</p>
              <p className="text-xs text-slate-300 mt-1">Orders will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order) => {
                const color = STATUS_COLOR[order.status] ?? "bg-slate-100 text-slate-600";
                const label = STATUS_LABEL[order.status] ?? order.status;
                const canAdvance = order.status === "confirmed" || order.status === "in_transit";
                let timeStr = "";
                try { timeStr = format(parseISO(order.placedAt), "h:mm a"); } catch { /* skip */ }
                return (
                  <div key={order.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <div
                      className="flex items-start justify-between cursor-pointer active:opacity-75"
                      onClick={() => navigate("/orders")}
                    >
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-sm font-extrabold text-slate-900 mb-0.5">#{order.id.slice(-6).toUpperCase()}</p>
                        <p className="text-xs text-slate-500 truncate">{order.customer} · {order.items}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-extrabold text-slate-900">₹{order.total}</p>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${color}`}>{label}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-2 mb-2">
                      <Clock className="h-3 w-3 text-slate-300" />
                      <span className="text-[10px] text-slate-400 font-medium">{timeStr}</span>
                    </div>
                    {canAdvance && (
                      <button
                        disabled={acting === order.id}
                        onClick={() => handleAdvance(order)}
                        className="w-full py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-60"
                      >
                        <Truck className="h-3 w-3" />
                        {order.status === "confirmed" ? "Mark Out for Delivery" : "Mark as Delivered"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="h-2" />
      </div>
    </div>
  );
}
