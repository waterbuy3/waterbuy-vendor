import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useLocation } from "react-router-dom";

const TITLES: Record<string, string> = {
  "/":          "Dashboard",
  "/orders":    "Orders",
  "/products":  "My Products",
  "/earnings":  "Earnings",
  "/profile":   "Profile",
};

export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const title = TITLES[pathname] ?? "Vendor Portal";

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <TopBar title={title} />
      <main className="ml-[220px] pt-[56px] min-h-screen">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
