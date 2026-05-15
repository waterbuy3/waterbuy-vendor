import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Droplets, Eye, EyeOff, Loader2 } from "lucide-react";
import { signInWithEmail } from "@/lib/supabase";

export function Login() {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmail(email.trim(), password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #06041a 0%, #0f0c36 40%, #1a1060 70%, #0d1a6e 100%)" }}>
      {/* Decorative blobs */}
      <div className="fixed top-0 right-0 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: "radial-gradient(circle, #7c3aed, transparent)" }} />
      <div className="fixed bottom-0 left-0 w-48 h-48 rounded-full opacity-15 blur-3xl pointer-events-none" style={{ background: "radial-gradient(circle, #2563eb, transparent)" }} />

      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8 relative">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <div className="w-18 h-18 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/40" style={{ width: 72, height: 72, background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            <Droplets className="h-9 w-9 text-white" strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <p className="text-2xl font-extrabold text-white tracking-tight">AquaPure</p>
            <p className="text-sm font-medium" style={{ color: "#a5b4fc" }}>Vendor Portal</p>
          </div>
        </div>

        {/* Card */}
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6">
          <h2 className="text-xl font-extrabold text-slate-900 mb-1">Welcome back</h2>
          <p className="text-sm text-slate-400 mb-6">Sign in to manage your orders</p>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-2xl bg-red-50 border border-red-100 text-sm text-red-600 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Email address</label>
              <input
                type="email" required autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"} required autoComplete="current-password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 pr-12 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:bg-white transition-all"
                />
                <button
                  type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-4 disabled:opacity-60 text-white font-extrabold rounded-2xl transition-all flex items-center justify-center gap-2 mt-2 shadow-lg"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 8px 24px rgba(79,70,229,0.35)" }}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            New distributor?{" "}
            <Link to="/register" className="font-bold hover:underline" style={{ color: "#4f46e5" }}>
              Register your business
            </Link>
          </p>
        </div>
      </div>

      <p className="text-center text-xs pb-8 relative" style={{ color: "rgba(255,255,255,0.15)" }}>
        AquaPure Vendor Portal · All rights reserved
      </p>
    </div>
  );
}
