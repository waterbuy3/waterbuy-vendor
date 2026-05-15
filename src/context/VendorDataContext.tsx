import {
  createContext, useContext, useEffect, useMemo, useState, type ReactNode,
} from "react";
import {
  subscribeMyOrders,
  subscribeNewOrders,
  subscribeAllSchedules,
  subscribeVendorPayouts,
  type VendorOrder,
  type VendorSchedule,
  type Payout,
} from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

interface VendorDataContextValue {
  myOrders:  VendorOrder[];
  newOrders: VendorOrder[];
  schedules: VendorSchedule[];
  payouts:   Payout[];
  loading:   boolean;
  // Pre-computed summary (avoids redundant getEarningSummary() calls)
  totalRevenue:   number;
  totalDelivered: number;
  totalLitres:    number;
  pendingPayout:  number;
}

const VendorDataContext = createContext<VendorDataContextValue>({
  myOrders: [], newOrders: [], schedules: [], payouts: [], loading: true,
  totalRevenue: 0, totalDelivered: 0, totalLitres: 0, pendingPayout: 0,
});

export function VendorDataProvider({ children }: { children: ReactNode }) {
  const { vendor } = useAuth();
  const [myOrders,  setMyOrders]  = useState<VendorOrder[]>([]);
  const [newOrders, setNewOrders] = useState<VendorOrder[]>([]);
  const [schedules, setSchedules] = useState<VendorSchedule[]>([]);
  const [payouts,   setPayouts]   = useState<Payout[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!vendor?.id) {
      // No vendor yet — drop loading so we don't block the UI indefinitely
      // and reset cached arrays from any previous vendor.
      setMyOrders([]);
      setNewOrders([]);
      setPayouts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let myDone  = false;
    let newDone = false;
    const maybeFinish = () => { if (myDone && newDone) setLoading(false); };

    const unsubMy = subscribeMyOrders(vendor.id, (orders) => {
      setMyOrders(orders);
      myDone = true;
      maybeFinish();
    });

    const unsubNew = subscribeNewOrders((orders) => {
      setNewOrders(orders);
      newDone = true;
      maybeFinish();
    });

    const unsubSchedules = subscribeAllSchedules(setSchedules);
    const unsubPay = subscribeVendorPayouts(vendor.id, setPayouts);

    return () => { unsubMy(); unsubNew(); unsubSchedules(); unsubPay(); };
  }, [vendor?.id]);

  const { totalRevenue, totalDelivered, totalLitres, pendingPayout } = useMemo(() => {
    const delivered = myOrders.filter((o) => o.status === "delivered");
    const revenue   = delivered.reduce((s, o) => s + o.total,  0);
    const litres    = delivered.reduce((s, o) => s + o.litres, 0);
    const commPct   = vendor?.commissionPct ?? 10;
    const vendorShare = revenue * (1 - commPct / 100);
    const paid = payouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
    return {
      totalRevenue:   revenue,
      totalDelivered: delivered.length,
      totalLitres:    +litres.toFixed(1),
      pendingPayout:  +Math.max(0, vendorShare - paid).toFixed(2),
    };
  }, [myOrders, payouts, vendor?.commissionPct]);

  // Memoize the context value so consumers don't re-render unless the
  // underlying data actually changed (otherwise every parent render of
  // VendorDataProvider would re-render every consumer of useVendorData).
  const value = useMemo(() => ({
    myOrders, newOrders, schedules, payouts, loading,
    totalRevenue, totalDelivered, totalLitres, pendingPayout,
  }), [myOrders, newOrders, schedules, payouts, loading,
       totalRevenue, totalDelivered, totalLitres, pendingPayout]);

  return (
    <VendorDataContext.Provider value={value}>
      {children}
    </VendorDataContext.Provider>
  );
}

export const useVendorData = () => useContext(VendorDataContext);
