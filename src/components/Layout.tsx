import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeVendorOrders } from "@/lib/supabase";
import { BottomNav } from "./BottomNav";

export function Layout({ children }: { children: React.ReactNode }) {
  const { vendor } = useAuth();
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    if (!vendor) return;
    return subscribeVendorOrders(vendor.id, (orders) => {
      setNewCount(orders.filter((o) => o.status === "pending").length);
    });
  }, [vendor?.id]);

  return (
    <>
      <div className="min-h-screen pb-nav scroll-ios">{children}</div>
      <BottomNav newOrdersCount={newCount} />
    </>
  );
}
