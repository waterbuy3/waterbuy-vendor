import { NavLink } from "react-router-dom";
import { Home, ShoppingBag, Package, BarChart2, Settings } from "lucide-react";

const TABS = [
  { to: "/",         icon: Home,        label: "Home",     exact: true,  badge: false },
  { to: "/orders",   icon: ShoppingBag, label: "Orders",   exact: false, badge: true  },
  { to: "/products", icon: Package,     label: "Products", exact: false, badge: false },
  { to: "/earnings", icon: BarChart2,   label: "Earnings", exact: false, badge: false },
  { to: "/settings", icon: Settings,    label: "Settings", exact: false, badge: false },
] as const;

export function BottomNav({ newOrdersCount }: { newOrdersCount: number }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-100 pb-safe">
      <div className="flex items-stretch h-16">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.exact}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors ${
                isActive ? "text-indigo-600" : "text-slate-400"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[2.5px] bg-indigo-500 rounded-full" />
                )}
                <div className={`relative p-1.5 rounded-xl transition-all duration-150 ${isActive ? "bg-indigo-50" : ""}`}>
                  <tab.icon
                    className={`h-[21px] w-[21px] transition-all ${isActive ? "text-indigo-600" : "text-slate-400"}`}
                    strokeWidth={isActive ? 2.3 : 1.7}
                  />
                  {tab.badge && newOrdersCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-rose-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center px-[3px] leading-none">
                      {newOrdersCount > 9 ? "9+" : newOrdersCount}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-semibold leading-none ${isActive ? "text-indigo-600" : "text-slate-400"}`}>
                  {tab.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
