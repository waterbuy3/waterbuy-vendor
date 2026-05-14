import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/Layout";
import { Login }     from "@/pages/Login";
import { Register }  from "@/pages/Register";
import { Dashboard } from "@/pages/Dashboard";
import { Orders }    from "@/pages/Orders";
import { Products }  from "@/pages/Products";
import { Earnings }  from "@/pages/Earnings";
import { Profile }   from "@/pages/Profile";

function Guard({ children }: { children: React.ReactNode }) {
  const { user, vendor, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400 font-medium">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // User exists but vendor record doesn't — account pending setup by admin
  if (!vendor) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 max-w-sm text-center">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⏳</span>
          </div>
          <h2 className="text-base font-extrabold text-slate-900 mb-2">Account pending activation</h2>
          <p className="text-sm text-slate-400">Your vendor account is being set up by the platform admin. Please check back soon.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/login"    element={<Login />}    />
          <Route path="/register" element={<Register />} />
          <Route path="/*" element={
            <Guard>
              <Layout>
                <Routes>
                  <Route path="/"         element={<Dashboard />} />
                  <Route path="/orders"   element={<Orders />}    />
                  <Route path="/products" element={<Products />}  />
                  <Route path="/earnings" element={<Earnings />}  />
                  <Route path="/profile"  element={<Profile />}   />
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

export default App;
