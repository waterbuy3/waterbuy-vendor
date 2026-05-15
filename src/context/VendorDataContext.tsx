import {
  createContext, useContext, useEffect, useMemo, useState, type ReactNode,
} from "react";
import {
  subscribeMyOrders,
  subscribeNewOrders,
  subscribeUnclaimedSchedules,
  subscribeMySchedules,
  subscribeUnclaimedSubscriptions,
  subscribeMySubscriptions,
  subscribeVendorPayouts,
  type VendorOrder,
  type VendorSchedule,
  type Payout,
} from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

interface VendorDataContextValue {
  myOrders:               VendorOrder[];
  newOrders:              VendorOrder[];
  unclaimedSchedules:     VendorSchedule[];
  mySchedules:            VendorSchedule[];
  unclaimedSubscriptions: VendorOrder[];
  mySubscriptions:        VendorOrder[];
  payouts:                Payout[];
  loading:                boolean;
  totalRevenue:   number;
  totalDelivered: number;
  totalLitres:    number;
  pendingPayout:  number;
}

const VendorDataContext = createContext<VendorDataContextValue>({
  myOrders: [], newOrders: [],
  unclaimedSchedules: [], mySchedules: [],
  unclaimedSubscriptions: [], mySubscriptions: [],
  payouts: [], loading: true,
  totalRevenue: 0, totalDelivered: 0, totalLitres: 0, pendingPayout: 0,
});

export function VendorDataProvider({ children }: { children: ReactNode }) {
  const { vendor } = useAuth();
  const [myOrders,               setMyOrders]               = useState<VendorOrder[]>([]);
  const [newOrders,              setNewOrders]              = useState<VendorOrder[]>([]);
  const [unclaimedSchedules,     setUnclaimedSchedules]     = useState<VendorSchedule[]>([]);
  const [mySchedules,            setMySchedules]            = useState<VendorSchedule[]>([]);
  const [unclaimedSubscriptions, setUnclaimedSubscriptions] = useState<VendorOrder[]>([]);
  const [mySubscriptions,        setMySubscriptions]        = useState<VendorOrder[]>([]);
  const [payouts,                setPayouts]                = useState<Payout[]>([]);
  const [loading,                setLoading]                = useState(true);

  useEffect(() => {
    if (!vendor?.id) {
      setMyOrders([]); setNewOrders([]);
      setUnclaimedSchedules([]); setMySchedules([]);
      setUnclaimedSubscriptions([]); setMySubscriptions([]);
      setPayouts([]); setLoading(false);
      return;
    }

    setLoading(true);
    let myDone = false, newDone = false;
    const maybeFinish = () => { if (myDone && newDone) setLoading(false); };

    const unsubMy  = subscribeMyOrders(vendor.id, (o) => { setMyOrders(o);  myDone  = true; maybeFinish(); });
    const unsubNew = subscribeNewOrders((o)        => { setNewOrders(o); newDone = true; maybeFinish(); });

    const unsubUnclaimedSched = subscribeUnclaimedSchedules(setUnclaimedSchedules);
    const unsubMySched        = subscribeMySchedules(vendor.id, setMySchedules);
    const unsubUnclaimedSub   = subscribeUnclaimedSubscriptions(setUnclaimedSubscriptions);
    const unsubMySub          = subscribeMySubscriptions(vendor.id, setMySubscriptions);
    const unsubPay            = subscribeVendorPayouts(vendor.id, setPayouts);

    return () => {
      unsubMy(); unsubNew();
      unsubUnclaimedSched(); unsubMySched();
      unsubUnclaimedSub(); unsubMySub();
      unsubPay();
    };
  }, [vendor?.id]);

  const { totalRevenue, totalDelivered, totalLitres, pendingPayout } = useMemo(() => {
    const delivered = myOrders.filter((o) => o.status === "delivered");
    // Subscription parent orders (confirmed) count their monthly fee once
    const confirmedSubs = myOrders.filter((o) => o.orderType === "subscription" && o.status === "confirmed");
    const revenue = [...delivered, ...confirmedSubs].reduce((s, o) => s + o.total, 0);
    const litres  = delivered.reduce((s, o) => s + o.litres, 0);
    const commPct = vendor?.commissionPct ?? 10;
    const vendorShare = revenue * (1 - commPct / 100);
    const paid = payouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
    return {
      totalRevenue:   revenue,
      totalDelivered: delivered.length,
      totalLitres:    +litres.toFixed(1),
      pendingPayout:  +Math.max(0, vendorShare - paid).toFixed(2),
    };
  }, [myOrders, payouts, vendor?.commissionPct]);

  const value = useMemo(() => ({
    myOrders, newOrders,
    unclaimedSchedules, mySchedules,
    unclaimedSubscriptions, mySubscriptions,
    payouts, loading,
    totalRevenue, totalDelivered, totalLitres, pendingPayout,
  }), [myOrders, newOrders, unclaimedSchedules, mySchedules,
       unclaimedSubscriptions, mySubscriptions, payouts, loading,
       totalRevenue, totalDelivered, totalLitres, pendingPayout]);

  return (
    <VendorDataContext.Provider value={value}>
      {children}
    </VendorDataContext.Provider>
  );
}

export const useVendorData = () => useContext(VendorDataContext);
