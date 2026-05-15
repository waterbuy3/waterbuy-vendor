import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { Droplets, Clock } from "lucide-react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { VendorDataProvider } from "@/context/VendorDataContext";
import { Layout } from "@/components/Layout";
import { Login }     from "@/pages/Login";
import { Register }  from "@/pages/Register";
import { Dashboard } from "@/pages/Dashboard";
import { Orders }    from "@/pages/Orders";
import { Products }  from "@/pages/Products";
import { Earnings }  from "@/pages/Earnings";
import { Settings }  from "@/pages/Settings";
import { Support }   from "@/pages/Support";
import { vendorSignOut } from "@/lib/supabase";

function Guard({ children }: { children: React.ReactNode }) {
  const { user, vendor, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-teal-500 flex items-center justify-center shadow-lg">
            <Droplets className="h-8 w-8 text-white" strokeWidth={2.5} />
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-teal-400"
                style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!vendor || vendor.active === false) {
    const isDeactivated = !!vendor && vendor.active === false;
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-xs w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <Clock className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 mb-2">
            {isDeactivated ? "Account Deactivated" : "Pending Activation"}
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            {isDeactivated
              ? "Your vendor account has been deactivated by the platform admin. Please contact support for help."
              : "Your vendor account is being set up by the platform admin. You'll be notified when it's ready."}
          </p>
          <button
            onClick={() => vendorSignOut()}
            className="mt-6 w-full py-3 text-sm font-extrabold text-red-500 bg-red-50 rounded-2xl"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return <VendorDataProvider>{children}</VendorDataProvider>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-center" richColors closeButton />
        <Routes>
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/*" element={
            <Guard>
              <Layout>
                <Routes>
                  <Route path="/"         element={<Dashboard />} />
                  <Route path="/orders"   element={<Orders />}    />
                  <Route path="/products" element={<Products />}  />
                  <Route path="/earnings" element={<Earnings />}  />
                  <Route path="/settings" element={<Settings />}  />
                  <Route path="/support"  element={<Support />}   />
                  <Route path="*"         element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </Guard>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
