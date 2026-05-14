import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, ShoppingBag, Package, Wallet, UserCircle, Droplets, LogOut,
} from "lucide-react";
import { vendorSignOut } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

const NAV = [
  { to: "/",           icon: LayoutDashboard, label: "Dashboard"  },
  { to: "/orders",     icon: ShoppingBag,     label: "Orders"     },
  { to: "/products",   icon: Package,         label: "My Products"},
  { to: "/earnings",   icon: Wallet,          label: "Earnings"   },
  { to: "/profile",    icon: UserCircle,      label: "Profile"    },
];

export function Sidebar() {
  const { vendor } = useAuth();
  const navigate   = useNavigate();

  const initials = vendor?.name
    ? vendor.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "V";

  const handleSignOut = async () => {
    await vendorSignOut();
    navigate("/login");
  };

  return (
    <aside className="fixed inset-y-0 left-0 w-[220px] bg-[#0c1122] border-r border-white/[0.07] flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-[56px] border-b border-white/[0.07] shrink-0">
        <div className="w-7 h-7 rounded-lg bg-teal-500 flex items-center justify-center shrink-0">
          <Droplets className="h-4 w-4 text-white" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-extrabold text-white leading-tight">AquaPure</p>
          <p className="text-[10px] text-white/40 font-medium">Vendor Portal</p>
        </div>
      </div>

      {/* Vendor pill */}
      {vendor && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-xl bg-white/[0.05] flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-[11px] font-extrabold text-white shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-white truncate">{vendor.name}</p>
            <p className="text-[10px] text-white/40 truncate">{vendor.area || vendor.email}</p>
          </div>
          {/* Open / Closed badge */}
          <div className={`ml-auto w-2 h-2 rounded-full shrink-0 ${vendor.isOpen ? "bg-emerald-400" : "bg-red-400"}`} />
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto sidebar-scroll px-2 pt-4 space-y-0.5">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-colors ${
                isActive
                  ? "bg-white/[0.08] text-white"
                  : "text-white/40 hover:text-white/75 hover:bg-white/[0.05]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-teal-400" />}
                <item.icon className="h-4 w-4 shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sign out */}
      <div className="px-2 pb-4 pt-2 border-t border-white/[0.07]">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-white/40 hover:text-red-400 hover:bg-white/[0.05] transition-colors"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.8} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
