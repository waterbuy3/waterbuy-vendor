import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Droplets, Eye, EyeOff, Loader2, Building2, Phone, MapPin, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export function Register() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) navigate("/", { replace: true });
  }, [user, authLoading, navigate]);
  const [step, setStep]       = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");
  const [phone,    setPhone]    = useState("");
  const [area,     setArea]     = useState("");

  const inp = "w-full px-4 py-3.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:bg-white transition-all";

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) { setError("Supabase not configured"); return; }
    if (!name.trim() || !phone.trim() || !area.trim()) {
      setError("All business fields are required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password });
      if (signUpError) throw signUpError;
      const uid = data.user?.id;
      if (!uid) throw new Error("Could not create account. Please try again.");

      // Only insert vendor row if we have an active session (email confirmation disabled).
      // If confirmation is required, session will be null and the insert would fail due to RLS.
      if (data.session) {
        const { error: insertError } = await supabase.from("vendors").insert({
          id: uid, name: name.trim(), email: email.trim(),
          phone: phone.trim(), area: area.trim(),
          commission_pct: 10, is_open: true, active: true,
        });
        if (insertError) throw insertError;
        // Auth state propagates via onAuthStateChange → Guard navigates when ready.
      } else {
        // Email confirmation required — surface a friendly message and reset.
        setError("✅ Account created! Check your email to confirm, then sign in.");
        setStep(1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col pt-safe pb-safe" style={{ background: "linear-gradient(135deg, #06041a 0%, #0f0c36 40%, #1a1060 70%, #0d1a6e 100%)" }}>
      {/* Decorative blobs */}
      <div className="fixed top-0 right-0 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: "radial-gradient(circle, #7c3aed, transparent)" }} />
      <div className="fixed bottom-0 left-0 w-48 h-48 rounded-full opacity-15 blur-3xl pointer-events-none" style={{ background: "radial-gradient(circle, #2563eb, transparent)" }} />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 relative">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="rounded-3xl flex items-center justify-center shadow-2xl" style={{ width: 56, height: 56, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 8px 32px rgba(99,102,241,0.45)" }}>
            <Droplets className="h-7 w-7 text-white" strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <p className="text-xl font-extrabold text-white">AquaPure</p>
            <p className="text-sm font-medium" style={{ color: "#a5b4fc" }}>Vendor Portal</p>
          </div>
        </div>

        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6">
          <h2 className="text-xl font-extrabold text-slate-900 mb-1">Join as Distributor</h2>
          <p className="text-sm text-slate-400 mb-5">Create your account to start receiving orders</p>

          {error && (
            <div className={`mb-4 px-4 py-3 rounded-2xl text-sm font-medium ${
              error.startsWith("✅")
                ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                : "bg-red-50 border border-red-100 text-red-600"
            }`}>
              {error}
            </div>
          )}

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold transition-all shrink-0 ${
                  step > s
                    ? "text-white"
                    : step === s
                    ? "text-white ring-4 ring-indigo-100"
                    : "bg-slate-100 text-slate-400"
                }`} style={step >= s ? { background: "linear-gradient(135deg, #4f46e5, #7c3aed)" } : {}}>
                  {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
                </div>
                <div className="flex-1">
                  <p className={`text-[11px] font-extrabold ${step === s ? "text-indigo-600" : "text-slate-400"}`}>
                    {s === 1 ? "Account" : "Business Info"}
                  </p>
                  {s < 2 && <div className={`h-0.5 w-full mt-1 rounded-full ${step > s ? "bg-indigo-400" : "bg-slate-200"}`} />}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={step === 1
            ? (e) => { e.preventDefault(); if (email && password.length >= 6) setStep(2); }
            : handleRegister
          }>
            {step === 1 ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Email address</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@yourbusiness.com" className={inp}
                    inputMode="email" autoComplete="email" autoCapitalize="none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Password</label>
                  <div className="relative">
                    <input type={showPw ? "text" : "password"} required minLength={6}
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters" className={`${inp} pr-12`}
                      autoComplete="new-password" />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {password.length > 0 && password.length < 6 && (
                    <p className="text-[11px] text-red-500 font-medium mt-1">At least 6 characters required</p>
                  )}
                </div>
                <button type="submit" disabled={!email || password.length < 6}
                  className="w-full py-4 disabled:opacity-50 text-white font-extrabold rounded-2xl mt-2 shadow-lg"
                  style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 8px 24px rgba(79,70,229,0.35)" }}>
                  Continue →
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Business / Distributor Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input required value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ravi Water Supplies" className={`${inp} pl-11`} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input required value={phone} onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210" className={`${inp} pl-11`} inputMode="tel" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Service Area</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input required value={area} onChange={(e) => setArea(e.target.value)}
                      placeholder="e.g. Koramangala, Bangalore" className={`${inp} pl-11`} />
                  </div>
                </div>
                <div className="flex gap-3 mt-2">
                  <button type="button" onClick={() => setStep(1)}
                    className="flex-1 py-3.5 border border-slate-200 text-slate-700 font-extrabold rounded-2xl">
                    ← Back
                  </button>
                  <button type="submit" disabled={loading || !name || !phone || !area}
                    className="flex-1 py-3.5 disabled:opacity-50 text-white font-extrabold rounded-2xl flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 6px 20px rgba(79,70,229,0.30)" }}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {loading ? "Creating…" : "Create Account"}
                  </button>
                </div>
              </div>
            )}
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="font-bold hover:underline" style={{ color: "#4f46e5" }}>Sign in</Link>
          </p>
        </div>
      </div>
      <p className="text-center text-xs pb-6 relative" style={{ color: "rgba(255,255,255,0.15)" }}>
        AquaPure Vendor Portal · All rights reserved
      </p>
    </div>
  );
}
