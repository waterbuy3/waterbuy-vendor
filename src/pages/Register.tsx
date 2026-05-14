import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Droplets, Eye, EyeOff, Loader2, Building2, Phone, MapPin } from "lucide-react";
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
        id:    uid,
        name:  name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        area:  area.trim(),
        commission_pct: 10,
        is_open: true,
        active: true,
      });
      if (insertError) throw insertError;

      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:bg-white transition-all";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-[#0c1122] flex items-center justify-center p-4">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center shadow-lg">
            <Droplets className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[18px] font-extrabold text-white leading-tight">AquaPure</p>
            <p className="text-[11px] text-white/40 font-medium">Vendor Portal</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-extrabold text-slate-900 mb-1">Join as a Distributor</h2>
          <p className="text-sm text-slate-400 mb-6">Create your vendor account to start receiving orders</p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 font-medium">
              {error}
            </div>
          )}

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold transition-all ${
                  step === s ? "bg-teal-600 text-white" : step > s ? "bg-teal-100 text-teal-600" : "bg-slate-100 text-slate-400"
                }`}>{s}</div>
                {s === 1 && <div className={`flex-1 h-0.5 w-16 ${step > 1 ? "bg-teal-400" : "bg-slate-200"}`} />}
              </div>
            ))}
            <span className="text-xs text-slate-400 ml-1">{step === 1 ? "Account" : "Business Info"}</span>
          </div>

          <form onSubmit={step === 1 ? (e) => { e.preventDefault(); if (email && password.length >= 6) setStep(2); } : handleRegister}>
            {step === 1 ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Email address</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@yourbusiness.com" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Password</label>
                  <div className="relative">
                    <input type={showPw ? "text" : "password"} required minLength={6}
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters" className={`${inputCls} pr-10`} />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {password && password.length < 6 && (
                    <p className="text-[11px] text-red-500 mt-1">At least 6 characters required</p>
                  )}
                </div>
                <button type="submit" disabled={!email || password.length < 6}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-extrabold rounded-xl transition-colors mt-2">
                  Continue →
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Business / Distributor Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input required value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ravi Water Supplies" className={`${inputCls} pl-9`} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input required value={phone} onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210" className={`${inputCls} pl-9`} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Service Area</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input required value={area} onChange={(e) => setArea(e.target.value)}
                      placeholder="e.g. Koramangala, Bangalore" className={`${inputCls} pl-9`} />
                  </div>
                </div>
                <div className="flex gap-3 mt-2">
                  <button type="button" onClick={() => setStep(1)}
                    className="flex-1 py-3 border border-slate-200 text-slate-600 font-extrabold rounded-xl hover:bg-slate-50 transition-colors">
                    ← Back
                  </button>
                  <button type="submit" disabled={loading || !name || !phone || !area}
                    className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-extrabold rounded-xl transition-colors flex items-center justify-center gap-2">
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {loading ? "Creating…" : "Create Account"}
                  </button>
                </div>
              </div>
            )}
          </form>

          <p className="text-center text-xs text-slate-400 mt-5">
            Already have an account?{" "}
            <Link to="/login" className="text-teal-600 font-bold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
