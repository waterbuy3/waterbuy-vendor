import { useEffect, useState } from "react";
import {
  ShoppingBag, CheckCircle2, XCircle, Truck, ChevronRight,
  MapPin, Phone, CreditCard, Package, Droplets,
} from "lucide-react";
import { subscribeVendorOrders, acceptOrder, rejectOrder, updateOrderStatus, type VendorOrder } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { toast } from "sonner";

const TABS = ["All", "New", "Active", "Delivered", "Cancelled"] as const;
type Tab = (typeof TABS)[number];

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending:    { label: "New",        color: "text-amber-600 bg-amber-50 border-amber-200"    },
  confirmed:  { label: "Confirmed",  color: "text-blue-600 bg-blue-50 border-blue-200"       },
  in_transit: { label: "In Transit", color: "text-purple-600 bg-purple-50 border-purple-200" },
  delivered:  { label: "Delivered",  color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  cancelled:  { label: "Cancelled",  color: "text-red-500 bg-red-50 border-red-200"          },
};

const ORDER_STEPS = [
  { key: "pending",    label: "Received"   },
  { key: "confirmed",  label: "Confirmed"  },
  { key: "in_transit", label: "Dispatched" },
  { key: "delivered",  label: "Delivered"  },
] as const;

const NEXT_STATUS: Record<string, string> = {
  pending:    "confirmed",
  confirmed:  "in_transit",
  in_transit: "delivered",
};

function filterOrders(orders: VendorOrder[], tab: Tab): VendorOrder[] {
  if (tab === "All")       return orders;
  if (tab === "New")       return orders.filter((o) => o.status === "pending");
  if (tab === "Active")    return orders.filter((o) => ["confirmed","in_transit"].includes(o.status));
  if (tab === "Delivered") return orders.filter((o) => o.status === "delivered");
  if (tab === "Cancelled") return orders.filter((o) => o.status === "cancelled");
  return orders;
}

export function Orders() {
  const { vendor } = useAuth();
  const [orders,   setOrders]   = useState<VendorOrder[]>([]);
  const [tab,      setTab]      = useState<Tab>("All");
  const [selected, setSelected] = useState<VendorOrder | null>(null);

  useEffect(() => {
    if (!vendor) return;
    return subscribeVendorOrders(vendor.id, (o) => {
      setOrders(o);
      setSelected((prev) => prev ? (o.find((x) => x.id === prev.id) ?? prev) : null);
    });
  }, [vendor?.id]);

  const visible = filterOrders(orders, tab);

  const handle = async (action: "accept" | "reject" | "advance", id: string) => {
    try {
      if (action === "accept")  await acceptOrder(id, vendor!.id);
      if (action === "reject")  await rejectOrder(id);
      if (action === "advance") {
        const order = orders.find((o) => o.id === id);
        if (order && NEXT_STATUS[order.status]) await updateOrderStatus(id, NEXT_STATUS[order.status]);
      }
      toast.success(action === "accept" ? "Order accepted" : action === "reject" ? "Order rejected" : "Status updated");
    } catch { toast.error("Action failed"); }
  };

  return (
    <div className="max-w-6xl animate-fade-in">
      {/* Tabs */}
      <div className="flex gap-1.5 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map((t) => {
          const count = filterOrders(orders, t).length;
          return (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}>
              {t}{count > 0 && ` (${count})`}
            </button>
          );
        })}
      </div>

      <div className="flex gap-5">
        {/* Order list */}
        <div className="flex-1 space-y-2">
          {visible.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center">
              <ShoppingBag className="h-8 w-8 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No orders in this category</p>
            </div>
          )}
          {visible.map((order) => {
            const meta = STATUS_META[order.status] ?? STATUS_META.pending;
            const isNew = order.status === "pending";
            return (
              <div key={order.id}
                onClick={() => setSelected(order)}
                className={`bg-white rounded-2xl border cursor-pointer transition-all hover:shadow-md ${
                  selected?.id === order.id ? "border-teal-300 shadow-md ring-1 ring-teal-200" : "border-slate-100"
                } ${isNew ? "ring-1 ring-amber-200" : ""}`}>
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isNew ? "bg-amber-50" : "bg-slate-50"}`}>
                    <Package className={`h-4 w-4 ${isNew ? "text-amber-500" : "text-slate-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-extrabold text-slate-900">#{order.id.slice(-6).toUpperCase()}</span>
                      {isNew && <span className="text-[9px] font-extrabold bg-amber-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">NEW</span>}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{order.items}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-extrabold text-slate-900">₹{order.total}</p>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${meta.color}`}>{meta.label}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                </div>

                {/* Quick accept/reject for new orders */}
                {isNew && (
                  <div className="flex gap-2 px-5 pb-4">
                    <button onClick={(e) => { e.stopPropagation(); handle("accept", order.id); }}
                      className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold rounded-xl transition-colors flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Accept Order
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handle("reject", order.id); }}
                      className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-extrabold rounded-xl transition-colors flex items-center justify-center gap-1.5 border border-red-100">
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-[320px] shrink-0 bg-white rounded-2xl border border-slate-100 shadow-sm h-fit sticky top-[80px]">
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-slate-900">#{selected.id.slice(-6).toUpperCase()}</span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${(STATUS_META[selected.status] ?? STATUS_META.pending).color}`}>
                  {(STATUS_META[selected.status] ?? STATUS_META.pending).label}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {selected.placedAt ? format(new Date(selected.placedAt), "d MMM yyyy, h:mm a") : "—"}
              </p>
            </div>

            {/* Timeline */}
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-0">
                {ORDER_STEPS.map((step, i) => {
                  const stepIdx  = ORDER_STEPS.findIndex((s) => s.key === selected.status);
                  const done     = i <= stepIdx;
                  const current  = i === stepIdx;
                  return (
                    <div key={step.key} className="flex items-center flex-1">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-extrabold ${
                          done ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-400"
                        } ${current ? "ring-2 ring-teal-200" : ""}`}>
                          {done ? "✓" : i + 1}
                        </div>
                        <span className={`text-[9px] font-semibold ${done ? "text-teal-600" : "text-slate-300"}`}>{step.label}</span>
                      </div>
                      {i < ORDER_STEPS.length - 1 && (
                        <div className={`flex-1 h-0.5 mb-4 ${done && i < stepIdx ? "bg-teal-400" : "bg-slate-100"}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Details */}
            <div className="px-5 py-4 space-y-3 border-b border-slate-100">
              <div className="flex gap-2">
                <Package className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold mb-0.5">Items</p>
                  <p className="text-xs text-slate-700">{selected.items}</p>
                </div>
              </div>
              {selected.litres > 0 && (
                <div className="flex gap-2">
                  <Droplets className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold mb-0.5">Litres</p>
                    <p className="text-xs text-slate-700">{selected.litres}L</p>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Phone className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold mb-0.5">Customer</p>
                  <p className="text-xs font-bold text-slate-800">{selected.customer}</p>
                  <p className="text-xs text-slate-500">{selected.phone}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold mb-0.5">Address</p>
                  <p className="text-xs text-slate-700">{selected.address}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <CreditCard className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold mb-0.5">Payment</p>
                  <p className="text-xs text-slate-700">{selected.payment?.toUpperCase()} · ₹{selected.total}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 py-4 space-y-2">
              {NEXT_STATUS[selected.status] && (
                <button onClick={() => handle("advance", selected.id)}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold rounded-xl transition-colors flex items-center justify-center gap-1.5">
                  <Truck className="h-3.5 w-3.5" />
                  Mark as {(STATUS_META[NEXT_STATUS[selected.status]] ?? {}).label ?? "Next"}
                </button>
              )}
              {selected.status === "pending" && (
                <button onClick={() => handle("reject", selected.id)}
                  className="w-full py-2 bg-red-50 text-red-600 text-xs font-extrabold rounded-xl hover:bg-red-100 transition-colors border border-red-100">
                  Reject Order
                </button>
              )}
              {selected.status === "delivered" && (
                <div className="flex items-center justify-center gap-1.5 py-2 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-xs font-extrabold">Order completed</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
