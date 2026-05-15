import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Droplets, Eye, EyeOff, Loader2, Building2, Phone, MapPin, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function Register() {
  const navigate = useNavigate();
  const [step, setStep]       = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");
  const [phone,    setPhone]    = useState("");
  const [area,     setArea]     = useState("");

  const inp = "w-full px-4 py-3.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500/25 focus:bg-white transition-all";

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) { setError("Supabase not configured"); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password });
      if (signUpError) throw signUpError;
      const uid = data.user?.id;
      if (!uid) throw new Error("Could not create account. Please try again.");

      const { error: insertError } = await supabase.from("vendors").insert({
        id: uid, name: name.trim(), email: email.trim(),
        phone: phone.trim(), area: area.trim(),
        commission_pct: 10, is_open: true, active: true,
      });
      if (insertError) throw insertError;

      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c1122] via-slate-900 to-teal-950 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-2xl shadow-teal-500/40">
            <Droplets className="h-7 w-7 text-white" strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <p className="text-xl font-extrabold text-white">AquaPure</p>
            <p className="text-sm text-teal-400 font-medium">Vendor Portal</p>
          </div>
        </div>

        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6">
          <h2 className="text-xl font-extrabold text-slate-900 mb-1">Join as Distributor</h2>
          <p className="text-sm text-slate-400 mb-5">Create your account to start receiving orders</p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-2xl bg-red-50 border border-red-100 text-sm text-red-600 font-medium">
              {error}
            </div>
          )}

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold transition-all shrink-0 ${
                  step > s ? "bg-teal-500 text-white" : step === s ? "bg-teal-600 text-white ring-4 ring-teal-100" : "bg-slate-100 text-slate-400"
                }`}>
                  {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
                </div>
                <div className="flex-1">
                  <p className={`text-[11px] font-extrabold ${step === s ? "text-teal-600" : "text-slate-400"}`}>
                    {s === 1 ? "Account" : "Business Info"}
                  </p>
                  {s < 2 && <div className={`h-0.5 w-full mt-1 rounded-full ${step > s ? "bg-teal-400" : "bg-slate-200"}`} />}
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
                    placeholder="you@yourbusiness.com" className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Password</label>
                  <div className="relative">
                    <input type={showPw ? "text" : "password"} required minLength={6}
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters" className={`${inp} pr-12`} />
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
                  className="w-full py-4 bg-teal-600 disabled:opacity-50 text-white font-extrabold rounded-2xl mt-2 shadow-lg shadow-teal-600/25">
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
                    className="flex-1 py-3.5 bg-teal-600 disabled:opacity-50 text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20">
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {loading ? "Creating…" : "Create Account"}
                  </button>
                </div>
              </div>
            )}
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-teal-600 font-bold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
      <p className="text-center text-xs text-white/20 pb-8">AquaPure Vendor Portal · All rights reserved</p>
    </div>
  );
}
