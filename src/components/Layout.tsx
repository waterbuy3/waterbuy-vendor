import { useVendorData } from "@/context/VendorDataContext";
import { BottomNav } from "./BottomNav";

export function Layout({ children }: { children: React.ReactNode }) {
  // Reuse the shared VendorDataContext — no extra Supabase subscription.
  // Badge = everything claimable: new cart orders + unclaimed recurring.
  const { newOrders, unclaimedSchedules, unclaimedSubscriptions } = useVendorData();
  const badge = newOrders.length + unclaimedSchedules.length + unclaimedSubscriptions.length;

  return (
    <>
      <div className="min-h-screen pb-nav scroll-ios">{children}</div>
      <BottomNav newOrdersCount={badge} />
    </>
  );
}
