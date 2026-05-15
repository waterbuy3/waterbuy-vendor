import { useVendorData } from "@/context/VendorDataContext";
import { BottomNav } from "./BottomNav";

export function Layout({ children }: { children: React.ReactNode }) {
  // Reuse the shared VendorDataContext — no extra Supabase subscription.
  // `newOrders` is the unassigned-pending pool the vendor can claim, which
  // is exactly the badge count Layout needs.
  const { newOrders } = useVendorData();

  return (
    <>
      <div className="min-h-screen pb-nav scroll-ios">{children}</div>
      <BottomNav newOrdersCount={newOrders.length} />
    </>
  );
}
