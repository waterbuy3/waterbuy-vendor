import { useState, useMemo, useEffect, useCallback } from "react";
import {
  ShoppingBag, CheckCircle2, XCircle, Truck, MapPin, Phone,
  CreditCard, Package, Droplets, X, Search, ChevronRight,
  MessageCircle, Clock, CalendarDays, RefreshCw, Star,
} from "lucide-react";
import {
  acceptOrder, rejectOrder, updateOrderStatus,
  claimSchedule, claimSubscriptionOrder,
  markScheduleDelivered, markSubscriptionDelivered,
  getDeliveryStats, parseSubscriptionFrequency, computeNextDueDate,
  type VendorOrder, type VendorSchedule,
} from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useVendorData } from "@/context/VendorDataContext";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { toast } from "sonner";

const TABS = ["All", "New", "Active", "Delivered", "Cancelled", "Recurring"] as const;
type Tab = (typeof TABS)[number];

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  pending:    { label: "New",        bg: "bg-amber-100",   text: "text-amber-700"   },
  confirmed:  { label: "Confirmed",  bg: "bg-blue-100",    text: "text-blue-700"    },
  in_transit: { label: "In Transit", bg: "bg-violet-100",  text: "text-violet-700"  },
  delivered:  { label: "Delivered",  bg: "bg-emerald-100", text: "text-emerald-700" },
  cancelled:  { label: "Cancelled",  bg: "bg-red-100",     text: "text-red-600"     },
  rejected:   { label: "Rejected",   bg: "bg-rose-100",    text: "text-rose-700"    },
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
    case "New":       return orders;
    case "Active":    return orders.filter((o) => ["confirmed", "in_transit"].includes(o.status));
    case "Delivered": return orders.filter((o) => o.status === "delivered");
    case "Cancelled": return orders.filter((o) => o.status === "cancelled" || o.status === "rejected");
    default:          return orders;
  }
}

// ─── Order Detail Sheet ───────────────────────────────────────────────────────

function OrderDetailSheet({ order, onClose, onAction }: {
  order: VendorOrder;
  onClose: () => void;
  onAction: (action: "accept" | "reject" | "advance", id: string) => Promise<void>;
}) {
  const [acting, setActing] = useState(false);
  const meta = STATUS_META[order.status] ?? STATUS_META.pending;
  const stepIdx = ORDER_STEPS.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === "cancelled" || order.status === "rejected";
  const isCart = order.orderType === "cart";

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
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

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
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-2 space-y-4">
          {/* Timeline — cart orders only */}
          {isCart && !isCancelled && (
            <div className="bg-slate-50 rounded-2xl p-4">
              <div className="flex items-center gap-0">
                {ORDER_STEPS.map((step, i) => {
                  const done = i <= stepIdx;
                  const current = i === stepIdx;
                  return (
                    <div key={step.key} className="flex items-center flex-1">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold border-2 transition-all ${done ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-200 text-slate-400"} ${current ? "ring-2 ring-indigo-200 ring-offset-1" : ""}`}>
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
                <a href={`tel:${order.phone}`} className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <Phone className="h-4 w-4 text-blue-600" />
                </a>
                <a href={waLink} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
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
            <a href={mapsLink} target="_blank" rel="noreferrer"
              className="mt-3 flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 w-fit">
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

        {/* Actions — cart orders only get accept/reject/advance */}
        {isCart && (
          <div className="px-5 py-4 border-t border-slate-100 space-y-2 shrink-0 pb-safe">
            {NEXT_STATUS[order.status] && (
              <button
                disabled={acting}
                onClick={() => doAction(order.status === "pending" ? "accept" : "advance")}
                className={`w-full py-3.5 disabled:opacity-60 text-white text-sm font-extrabold rounded-2xl flex items-center justify-center gap-2 transition-colors ${order.status === "pending" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-indigo-600 hover:bg-indigo-700"}`}
              >
                <Truck className="h-4 w-4" />
                {NEXT_LABEL[order.status] ?? "Advance"}
              </button>
            )}
            {order.status === "pending" && (
              <button disabled={acting} onClick={() => doAction("reject")}
                className="w-full py-3 bg-red-50 text-red-600 text-sm font-extrabold rounded-2xl border border-red-100 transition-colors">
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
                <span className="text-sm font-extrabold">
                  {order.status === "rejected" ? "Order was rejected" : "Order was cancelled"}
                </span>
              </div>
            )}
          </div>
        )}
        {!isCart && (
          <div className="px-5 py-4 border-t border-slate-100 shrink-0 pb-safe">
            <div className="flex items-center justify-center gap-2 py-2 text-slate-400">
              <RefreshCw className="h-4 w-4" />
              <span className="text-sm font-semibold">Managed in Recurring tab</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Recurring tab cards ──────────────────────────────────────────────────────

function RecurringScheduleCard({
  schedule, vendorId, mine,
}: { schedule: VendorSchedule; vendorId: string; mine: boolean }) {
  const [acting,        setActing]        = useState(false);
  const [deliveryCount, setDeliveryCount] = useState(0);
  const [lastAt,        setLastAt]        = useState<string | null>(null);

  useEffect(() => {
    if (!mine) return;
    getDeliveryStats(schedule.id).then(({ count, lastAt: la }) => {
      setDeliveryCount(count);
      setLastAt(la);
    });
  }, [mine, schedule.id]);

  const nextDue = computeNextDueDate(
    schedule.frequency,
    lastAt ? lastAt.slice(0, 10) : schedule.startDate,
    lastAt ? 1 : deliveryCount,
  );

  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(schedule.address)}`;
  const waLink = schedule.phone
    ? `https://wa.me/${schedule.phone.replace(/\D/g, "").replace(/^(?!91)/, "91").slice(-12)}?text=${encodeURIComponent(`Hi ${schedule.customer}, your scheduled AquaPure delivery is confirmed.`)}`
    : null;

  const handleClaim = async () => {
    setActing(true);
    try {
      await claimSchedule(schedule.id, vendorId);
      toast.success("Schedule claimed");
    } catch { toast.error("Failed to claim"); }
    finally { setActing(false); }
  };

  const handleDeliver = async () => {
    setActing(true);
    try {
      await markScheduleDelivered(vendorId, schedule);
      setDeliveryCount((c) => c + 1);
      setLastAt(new Date().toISOString());
      toast.success("Delivery recorded ✓");
    } catch { toast.error("Failed to record delivery"); }
    finally { setActing(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-teal-100 shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 mr-2">
          <div className="flex items-center gap-2 mb-0.5">
            <CalendarDays className="h-4 w-4 text-teal-600 shrink-0" />
            <p className="text-sm font-extrabold text-slate-900 truncate">{schedule.customer}</p>
          </div>
          <p className="text-xs text-slate-500 ml-6">{schedule.productName} × {schedule.quantity}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-extrabold text-slate-900">₹{schedule.total}/delivery</p>
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${schedule.status === "active" ? "bg-teal-100 text-teal-700" : "bg-amber-100 text-amber-700"}`}>
            {schedule.status === "active" ? "Active" : "Paused"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
          <span>{schedule.frequency}</span>
        </div>
        {schedule.timeSlot && <>
          <span className="text-slate-200">·</span>
          <span>{schedule.timeSlot}</span>
        </>}
      </div>

      {mine && (
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="font-bold">{deliveryCount} delivered</span>
          </div>
          <div className="flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg">
            <CalendarDays className="h-3.5 w-3.5" />
            <span className="font-bold">Next: {nextDue}</span>
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 text-xs text-slate-500">
        <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
        <span className="line-clamp-2">{schedule.address}</span>
      </div>

      <div className="flex gap-2 pt-1">
        {!mine ? (
          <button disabled={acting} onClick={handleClaim}
            className="flex-1 py-2.5 bg-teal-600 text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-60">
            <Star className="h-3.5 w-3.5" /> Claim Schedule
          </button>
        ) : (
          <button disabled={acting || schedule.status === "paused"} onClick={handleDeliver}
            className="flex-1 py-2.5 bg-emerald-600 text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-60">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {schedule.status === "paused" ? "Paused by customer" : "Mark Delivered"}
          </button>
        )}
        <a href={mapsLink} target="_blank" rel="noreferrer"
          className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100 flex items-center justify-center shrink-0">
          <MapPin className="h-4 w-4" />
        </a>
        {schedule.phone && (
          <a href={`tel:${schedule.phone}`}
            className="w-10 h-10 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 flex items-center justify-center shrink-0">
            <Phone className="h-4 w-4" />
          </a>
        )}
        {waLink && (
          <a href={waLink} target="_blank" rel="noreferrer"
            className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 flex items-center justify-center shrink-0">
            <MessageCircle className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}

function RecurringSubscriptionCard({
  sub, vendorId, mine,
}: { sub: VendorOrder; vendorId: string; mine: boolean }) {
  const [acting,        setActing]        = useState(false);
  const [deliveryCount, setDeliveryCount] = useState(0);
  const [lastAt,        setLastAt]        = useState<string | null>(null);

  const frequency = parseSubscriptionFrequency(sub.items);

  useEffect(() => {
    if (!mine) return;
    getDeliveryStats(sub.id).then(({ count, lastAt: la }) => {
      setDeliveryCount(count);
      setLastAt(la);
    });
  }, [mine, sub.id]);

  const nextDue = computeNextDueDate(
    frequency,
    lastAt ? lastAt.slice(0, 10) : sub.placedAt.slice(0, 10),
    lastAt ? 1 : deliveryCount,
  );

  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sub.address)}`;
  const waLink = sub.phone
    ? `https://wa.me/${sub.phone.replace(/\D/g, "").replace(/^(?!91)/, "91").slice(-12)}?text=${encodeURIComponent(`Hi ${sub.customer}, your AquaPure subscription delivery is confirmed.`)}`
    : null;

  const handleClaim = async () => {
    setActing(true);
    try {
      await claimSubscriptionOrder(sub.id, vendorId);
      toast.success("Subscription claimed");
    } catch { toast.error("Failed to claim"); }
    finally { setActing(false); }
  };

  const handleDeliver = async () => {
    setActing(true);
    try {
      await markSubscriptionDelivered(vendorId, sub);
      setDeliveryCount((c) => c + 1);
      setLastAt(new Date().toISOString());
      toast.success("Delivery recorded ✓");
    } catch { toast.error("Failed to record delivery"); }
    finally { setActing(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 mr-2">
          <div className="flex items-center gap-2 mb-0.5">
            <RefreshCw className="h-4 w-4 text-indigo-600 shrink-0" />
            <p className="text-sm font-extrabold text-slate-900 truncate">{sub.customer}</p>
          </div>
          <p className="text-xs text-slate-500 ml-6 truncate">{sub.items}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-extrabold text-slate-900">₹{sub.total}/mo</p>
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
            {frequency}
          </span>
        </div>
      </div>

      {mine && (
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="font-bold">{deliveryCount} delivered</span>
          </div>
          <div className="flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg">
            <CalendarDays className="h-3.5 w-3.5" />
            <span className="font-bold">Next: {nextDue}</span>
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 text-xs text-slate-500">
        <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
        <span className="line-clamp-2">{sub.address}</span>
      </div>

      <div className="flex gap-2 pt-1">
        {!mine ? (
          <button disabled={acting} onClick={handleClaim}
            className="flex-1 py-2.5 bg-indigo-600 text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-60">
            <Star className="h-3.5 w-3.5" /> Claim Subscription
          </button>
        ) : (
          <button disabled={acting} onClick={handleDeliver}
            className="flex-1 py-2.5 bg-emerald-600 text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-60">
            <CheckCircle2 className="h-3.5 w-3.5" /> Mark Delivered
          </button>
        )}
        <a href={mapsLink} target="_blank" rel="noreferrer"
          className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100 flex items-center justify-center shrink-0">
          <MapPin className="h-4 w-4" />
        </a>
        {sub.phone && (
          <a href={`tel:${sub.phone}`}
            className="w-10 h-10 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 flex items-center justify-center shrink-0">
            <Phone className="h-4 w-4" />
          </a>
        )}
        {waLink && (
          <a href={waLink} target="_blank" rel="noreferrer"
            className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 flex items-center justify-center shrink-0">
            <MessageCircle className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Recurring tab ─────────────────────────────────────────────────────────────

function RecurringTab() {
  const { vendor } = useAuth();
  const { unclaimedSchedules, mySchedules, unclaimedSubscriptions, mySubscriptions } = useVendorData();
  const vendorId = vendor?.id ?? "";

  const hasUnclaimed = unclaimedSchedules.length > 0 || unclaimedSubscriptions.length > 0;
  const hasMine      = mySchedules.length > 0 || mySubscriptions.length > 0;

  if (!hasUnclaimed && !hasMine) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center mt-4 mx-4">
        <CalendarDays className="h-8 w-8 text-slate-200 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-400">No recurring deliveries yet</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-6">
      {/* Available to claim */}
      {hasUnclaimed && (
        <div>
          <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3">
            Available to Claim ({unclaimedSchedules.length + unclaimedSubscriptions.length})
          </p>
          <div className="space-y-2">
            {unclaimedSchedules.map((s) => (
              <RecurringScheduleCard key={s.id} schedule={s} vendorId={vendorId} mine={false} />
            ))}
            {unclaimedSubscriptions.map((s) => (
              <RecurringSubscriptionCard key={s.id} sub={s} vendorId={vendorId} mine={false} />
            ))}
          </div>
        </div>
      )}

      {/* My recurring deliveries */}
      {hasMine && (
        <div>
          <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3">
            My Recurring Deliveries ({mySchedules.length + mySubscriptions.length})
          </p>
          <div className="space-y-2">
            {mySchedules.map((s) => (
              <RecurringScheduleCard key={s.id} schedule={s} vendorId={vendorId} mine={true} />
            ))}
            {mySubscriptions.map((s) => (
              <RecurringSubscriptionCard key={s.id} sub={s} vendorId={vendorId} mine={true} />
            ))}
          </div>
        </div>
      )}
      <div className="h-2" />
    </div>
  );
}

// ─── Main Orders page ─────────────────────────────────────────────────────────

export function Orders() {
  const { vendor } = useAuth();
  const { myOrders, newOrders, unclaimedSchedules, mySchedules, unclaimedSubscriptions, mySubscriptions } = useVendorData();
  const [tab,      setTab]      = useState<Tab>("All");
  const [selected, setSelected] = useState<VendorOrder | null>(null);
  const [query,    setQuery]    = useState("");
  const [acting,   setActing]   = useState<string | null>(null);

  useEffect(() => {
    if (!selected) return;
    const fresh =
      myOrders.find((o) => o.id === selected.id) ??
      newOrders.find((o) => o.id === selected.id);
    if (fresh && fresh.status !== selected.status) setSelected(fresh);
  }, [myOrders, newOrders, selected]);

  const handleAction = useCallback(async (action: "accept" | "reject" | "advance", id: string) => {
    if (acting) return;
    setActing(id);
    try {
      if (action === "accept") await acceptOrder(id, vendor!.id);
      else if (action === "reject") await rejectOrder(id);
      else {
        const order =
          myOrders.find((o) => o.id === id) ??
          newOrders.find((o) => o.id === id);
        if (order && NEXT_STATUS[order.status]) await updateOrderStatus(id, NEXT_STATUS[order.status]);
      }
      toast.success(action === "accept" ? "Order accepted" : action === "reject" ? "Order rejected" : "Status updated");
      if (action !== "advance") setSelected(null);
    } catch { toast.error("Action failed"); }
    finally { setActing(null); }
  }, [vendor, myOrders, newOrders, acting]);

  const recurringCount = unclaimedSchedules.length + mySchedules.length + unclaimedSubscriptions.length + mySubscriptions.length;

  const tabCounts = useMemo(() => ({
    All:       myOrders.filter((o) => o.orderType === "cart").length,
    New:       newOrders.length,
    Active:    myOrders.filter((o) => o.orderType === "cart" && ["confirmed","in_transit"].includes(o.status)).length,
    Delivered: myOrders.filter((o) => o.orderType === "cart" && o.status === "delivered").length,
    Cancelled: myOrders.filter((o) => o.orderType === "cart" && (o.status === "cancelled" || o.status === "rejected")).length,
    Recurring: recurringCount,
  }), [myOrders, newOrders, recurringCount]);

  // Cart-only pool for all non-Recurring tabs
  const cartOrders = useMemo(() => myOrders.filter((o) => o.orderType === "cart"), [myOrders]);

  const visible = useMemo(() => {
    const pool = tab === "New" ? newOrders : cartOrders;
    const base = filterOrders(pool, tab);
    if (!query.trim()) return base;
    const q = query.toLowerCase();
    return base.filter((o) =>
      o.customer.toLowerCase().includes(q) ||
      o.id.slice(-6).toLowerCase().includes(q) ||
      o.items.toLowerCase().includes(q)
    );
  }, [cartOrders, newOrders, tab, query]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-white pt-safe px-4 pt-4 pb-3 border-b border-slate-100 sticky top-0 z-10">
        <h1 className="text-xl font-extrabold text-slate-900 mb-3">Orders</h1>

        {tab !== "Recurring" && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search orders, customers…"
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
            />
          </div>
        )}

        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {TABS.map((t) => {
            const count = tabCounts[t];
            const active = tab === t;
            return (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${active ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200" : "bg-slate-100 text-slate-500"}`}>
                {t}{count > 0 ? ` (${count})` : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recurring tab */}
      {tab === "Recurring" && <RecurringTab />}

      {/* Cart orders list */}
      {tab !== "Recurring" && (
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
              const isNew    = order.status === "pending" && !order.vendorId;
              const isActive = order.status === "confirmed" || order.status === "in_transit";
              return (
                <button key={order.id} onClick={() => setSelected(order)}
                  className={`w-full bg-white rounded-2xl border shadow-sm p-4 text-left transition-all active:scale-[0.98] ${isNew ? "border-amber-200 ring-1 ring-amber-100" : "border-slate-100"}`}>
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
                      <button disabled={acting === order.id}
                        onClick={(e) => { e.stopPropagation(); handleAction("accept", order.id); }}
                        className="flex-1 py-2 min-h-[40px] bg-emerald-600 text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-60">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Accept
                      </button>
                      <button disabled={acting === order.id}
                        onClick={(e) => { e.stopPropagation(); handleAction("reject", order.id); }}
                        className="flex-1 py-2 min-h-[40px] bg-red-50 text-red-600 text-xs font-extrabold rounded-xl border border-red-100 flex items-center justify-center gap-1.5 disabled:opacity-60">
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>
                  )}

                  {isActive && (
                    <div className="mt-3">
                      <button disabled={acting === order.id}
                        onClick={(e) => { e.stopPropagation(); handleAction("advance", order.id); }}
                        className="w-full py-2 min-h-[40px] bg-indigo-50 text-indigo-700 text-xs font-extrabold rounded-xl border border-indigo-200 flex items-center justify-center gap-1.5 disabled:opacity-60">
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
      )}

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
