import { useState, useMemo } from "react";
import {
  ShoppingBag, CheckCircle2, XCircle, Truck, MapPin, Phone,
  CreditCard, Package, Droplets, X, Search, ChevronRight,
  MessageCircle, Clock,
} from "lucide-react";
import {
  acceptOrder, rejectOrder, updateOrderStatus,
  type VendorOrder,
} from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useVendorData } from "@/context/VendorDataContext";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { toast } from "sonner";

const TABS = ["All", "New", "Active", "Delivered", "Cancelled"] as const;
type Tab = (typeof TABS)[number];

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  pending:    { label: "New",        bg: "bg-amber-100",   text: "text-amber-700"   },
  confirmed:  { label: "Confirmed",  bg: "bg-blue-100",    text: "text-blue-700"    },
  in_transit: { label: "In Transit", bg: "bg-violet-100",  text: "text-violet-700"  },
  delivered:  { label: "Delivered",  bg: "bg-emerald-100", text: "text-emerald-700" },
  cancelled:  { label: "Cancelled",  bg: "bg-red-100",     text: "text-red-600"     },
};

const ORDER_STEPS = [
  { key: "pending",    label: "Received"  },
  { key: "confirmed",  label: "Confirmed" },
  { key: "in_transit", label: "Dispatched"},
  { key: "delivered",  label: "Delivered" },
] as const;

const NEXT_STATUS: Record<string, string> = {
  pending:    "confirmed",
  confirmed:  "in_transit",
  in_transit: "delivered",
};

const NEXT_LABEL: Record<string, string> = {
  pending:    "Accept Order",
  confirmed:  "Mark Dispatched",
  in_transit: "Mark Delivered",
};

function timeAgo(str: string): string {
  try { return formatDistanceToNow(parseISO(str), { addSuffix: true }); }
  catch { return ""; }
}

function filterOrders(orders: VendorOrder[], tab: Tab): VendorOrder[] {
  switch (tab) {
    case "New":       return orders; // pool is already pre-filtered to unassigned pending
    case "Active":    return orders.filter((o) => ["confirmed", "in_transit"].includes(o.status));
    case "Delivered": return orders.filter((o) => o.status === "delivered");
    case "Cancelled": return orders.filter((o) => o.status === "cancelled");
    default:          return orders;
  }
}

function OrderDetailSheet({ order, onClose, onAction }: {
  order: VendorOrder;
  onClose: () => void;
  onAction: (action: "accept" | "reject" | "advance", id: string) => Promise<void>;
}) {
  const [acting, setActing] = useState(false);
  const meta = STATUS_META[order.status] ?? STATUS_META.pending;
  const stepIdx = ORDER_STEPS.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === "cancelled";

  const doAction = async (action: "accept" | "reject" | "advance") => {
    setActing(true);
    try { await onAction(action, order.id); }
    finally { setActing(false); }
  };

  const phone = order.phone?.replace(/\D/g, "") ?? "";
  const waLink = `https://wa.me/${phone.startsWith("91") ? phone : "91" + phone.slice(-10)}?text=${encodeURIComponent(`Hi ${order.customer}, your AquaPure order #${order.id.slice(-6).toUpperCase()} has been ${order.status === "pending" ? "confirmed" : order.status}.`)}`;
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-backdrop" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 shrink-0">
          <div>
            <p className="text-base font-extrabold text-slate-900">#{order.id.slice(-6).toUpperCase()}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {order.placedAt ? format(parseISO(order.placedAt), "d MMM yyyy, h:mm a") : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${meta.bg} ${meta.text}`}>
              {meta.label}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 pb-2 space-y-4">
          {/* Timeline */}
          {!isCancelled && (
            <div className="bg-slate-50 rounded-2xl p-4">
              <div className="flex items-center gap-0">
                {ORDER_STEPS.map((step, i) => {
                  const done = i <= stepIdx;
                  const current = i === stepIdx;
                  return (
                    <div key={step.key} className="flex items-center flex-1">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold border-2 transition-all ${
                          done ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-200 text-slate-400"
                        } ${current ? "ring-2 ring-indigo-200 ring-offset-1" : ""}`}>
                          {done ? "✓" : i + 1}
                        </div>
                        <span className={`text-[9px] font-bold text-center leading-tight ${done ? "text-indigo-600" : "text-slate-400"}`}>
                          {step.label}
                        </span>
                      </div>
                      {i < ORDER_STEPS.length - 1 && (
                        <div className={`flex-1 h-0.5 mx-1 mb-4 ${done && i < stepIdx ? "bg-indigo-400" : "bg-slate-200"}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Customer */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Customer</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-extrabold text-indigo-700">{order.customer?.[0]?.toUpperCase() ?? "C"}</span>
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-900">{order.customer}</p>
                  <p className="text-xs text-slate-500">{order.phone}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <a
                  href={`tel:${order.phone}`}
                  className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center"
                >
                  <Phone className="h-4 w-4 text-blue-600" />
                </a>
                <a
                  href={waLink}
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center"
                >
                  <MessageCircle className="h-4 w-4 text-emerald-600" />
                </a>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-slate-50 rounded-2xl p-4">
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Delivery Address</p>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <p className="text-sm text-slate-700 leading-relaxed flex-1">{order.address}</p>
            </div>
            <a
              href={mapsLink}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 w-fit"
            >
              <MapPin className="h-3.5 w-3.5" /> Open in Maps
            </a>
          </div>

          {/* Items */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Order Details</p>
            <div className="flex items-start gap-2">
              <Package className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <p className="text-sm text-slate-700">{order.items}</p>
            </div>
            {order.litres > 0 && (
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-slate-400 shrink-0" />
                <p className="text-sm text-slate-700">{order.litres}L water</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-slate-400 shrink-0" />
              <p className="text-sm text-slate-700">{order.payment?.toUpperCase()} · <span className="font-extrabold text-slate-900">₹{order.total}</span></p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-slate-100 space-y-2 shrink-0 pb-safe">
          {NEXT_STATUS[order.status] && (
            <button
              disabled={acting}
              onClick={() => doAction(order.status === "pending" ? "accept" : "advance")}
              className={`w-full py-3.5 disabled:opacity-60 text-white text-sm font-extrabold rounded-2xl flex items-center justify-center gap-2 transition-colors ${
                order.status === "pending"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              <Truck className="h-4 w-4" />
              {NEXT_LABEL[order.status] ?? "Advance"}
            </button>
          )}
          {order.status === "pending" && (
            <button
              disabled={acting}
              onClick={() => doAction("reject")}
              className="w-full py-3 bg-red-50 text-red-600 text-sm font-extrabold rounded-2xl border border-red-100 transition-colors"
            >
              Reject Order
            </button>
          )}
          {order.status === "delivered" && (
            <div className="flex items-center justify-center gap-2 py-3 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-extrabold">Order completed successfully</span>
            </div>
          )}
          {isCancelled && (
            <div className="flex items-center justify-center gap-2 py-3 text-red-400">
              <XCircle className="h-5 w-5" />
              <span className="text-sm font-extrabold">Order was cancelled</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Orders() {
  const { vendor } = useAuth();
  const { myOrders, newOrders } = useVendorData();
  const [tab,      setTab]      = useState<Tab>("All");
  const [selected, setSelected] = useState<VendorOrder | null>(null);
  const [query,    setQuery]    = useState("");

  // Keep selected order in sync when realtime updates arrive
  useMemo(() => {
    if (!selected) return;
    const all = [...myOrders, ...newOrders];
    const fresh = all.find((o) => o.id === selected.id);
    if (fresh && fresh.status !== selected.status) setSelected(fresh);
  }, [myOrders, newOrders]);

  const handleAction = async (action: "accept" | "reject" | "advance", id: string) => {
    try {
      if (action === "accept") await acceptOrder(id, vendor!.id);
      else if (action === "reject") await rejectOrder(id);
      else {
        const order = orders.find((o) => o.id === id);
        if (order && NEXT_STATUS[order.status]) await updateOrderStatus(id, NEXT_STATUS[order.status]);
      }
      const label = action === "accept" ? "Order accepted" : action === "reject" ? "Order rejected" : "Status updated";
      toast.success(label);
    } catch { toast.error("Action failed"); }
  };

  const tabCounts = useMemo(() => ({
    All:       myOrders.length,
    New:       newOrders.length,
    Active:    myOrders.filter((o) => ["confirmed","in_transit"].includes(o.status)).length,
    Delivered: myOrders.filter((o) => o.status === "delivered").length,
    Cancelled: myOrders.filter((o) => o.status === "cancelled").length,
  }), [myOrders, newOrders]);

  const visible = useMemo(() => {
    // "New" tab shows claimable unassigned orders; all other tabs show this vendor's orders
    const pool = tab === "New" ? newOrders : myOrders;
    const base = filterOrders(pool, tab);
    if (!query.trim()) return base;
    const q = query.toLowerCase();
    return base.filter((o) =>
      o.customer.toLowerCase().includes(q) ||
      o.id.slice(-6).toLowerCase().includes(q) ||
      o.items.toLowerCase().includes(q)
    );
  }, [myOrders, newOrders, tab, query]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-white pt-safe px-4 pt-4 pb-3 border-b border-slate-100 sticky top-0 z-10">
        <h1 className="text-xl font-extrabold text-slate-900 mb-3">Orders</h1>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search orders, customers…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {TABS.map((t) => {
            const count = tabCounts[t];
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  active
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {t}{count > 0 ? ` (${count})` : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* Order list */}
      <div className="px-4 py-3 space-y-2">
        {visible.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center mt-4">
            <ShoppingBag className="h-8 w-8 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-400">
              {query ? "No orders match your search" : "No orders here"}
            </p>
          </div>
        ) : (
          visible.map((order) => {
            const meta = STATUS_META[order.status] ?? STATUS_META.pending;
            const isNew = order.status === "pending" && !order.vendorId;
            const isActive = order.status === "confirmed" || order.status === "in_transit";
            return (
              <button
                key={order.id}
                onClick={() => setSelected(order)}
                className={`w-full bg-white rounded-2xl border shadow-sm p-4 text-left transition-all active:scale-[0.98] ${
                  isNew ? "border-amber-200 ring-1 ring-amber-100" : "border-slate-100"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-extrabold text-slate-900">#{order.id.slice(-6).toUpperCase()}</p>
                      {isNew && (
                        <span className="text-[9px] font-extrabold bg-amber-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">NEW</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{order.customer} · {order.items}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-extrabold text-slate-900">₹{order.total}</p>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${meta.bg} ${meta.text}`}>
                      {meta.label}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-slate-300" />
                    <span className="text-[10px] text-slate-400">{timeAgo(order.placedAt)}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>

                {isNew && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAction("accept", order.id); }}
                      className="flex-1 py-2 bg-emerald-600 text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Accept
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAction("reject", order.id); }}
                      className="flex-1 py-2 bg-red-50 text-red-600 text-xs font-extrabold rounded-xl border border-red-100 flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </button>
                  </div>
                )}

                {isActive && (
                  <div className="mt-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAction("advance", order.id); }}
                      className="w-full py-2 bg-indigo-50 text-indigo-700 text-xs font-extrabold rounded-xl border border-indigo-200 flex items-center justify-center gap-1.5"
                    >
                      <Truck className="h-3.5 w-3.5" /> {NEXT_LABEL[order.status] ?? "Advance"}
                    </button>
                  </div>
                )}
              </button>
            );
          })
        )}
        <div className="h-2" />
      </div>

      {/* Detail sheet */}
      {selected && (
        <OrderDetailSheet
          order={selected}
          onClose={() => setSelected(null)}
          onAction={handleAction}
        />
      )}
    </div>
  );
}
