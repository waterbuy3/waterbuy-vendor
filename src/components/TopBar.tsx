import { Bell, ToggleLeft, ToggleRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { updateVendorProfile } from "@/lib/supabase";

export function TopBar({ title }: { title: string }) {
  const { vendor } = useAuth();

  const toggleOpen = async () => {
    if (!vendor) return;
    await updateVendorProfile(vendor.id, { isOpen: !vendor.isOpen });
  };

  return (
    <header className="fixed top-0 left-[220px] right-0 h-[56px] bg-white border-b border-slate-100 flex items-center justify-between px-6 z-20">
      <h1 className="text-[15px] font-extrabold text-slate-900">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Open / Closed toggle */}
        <button
          onClick={toggleOpen}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold border transition-all ${
            vendor?.isOpen
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
              : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
          }`}
        >
          {vendor?.isOpen
            ? <><ToggleRight className="h-3.5 w-3.5" /> Open for Orders</>
            : <><ToggleLeft  className="h-3.5 w-3.5" /> Closed</>
          }
        </button>

        {/* Bell */}
        <button className="relative w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
