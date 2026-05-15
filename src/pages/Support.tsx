import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, MessageCircle, Send, Loader2, Mail, LifeBuoy,
  CheckCircle2, Clock, ChevronDown,
} from "lucide-react";
import { subscribeSupportMessages, sendSupportMessage, type SupportTicket } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { tap, success } from "@/lib/ui";
import { SkeletonList } from "@/components/Skeleton";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

const SUBJECTS = [
  "General Enquiry",
  "Order Issue",
  "Payout / Earnings",
  "Product / Catalog",
  "Account Help",
  "Technical Problem",
  "Other",
] as const;

const STATUS_META: Record<SupportTicket["status"], { label: string; cls: string; icon: typeof Clock }> = {
  open:    { label: "Awaiting reply", cls: "bg-amber-100 text-amber-700",     icon: Clock },
  replied: { label: "Replied",        cls: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  closed:  { label: "Closed",         cls: "bg-slate-100 text-slate-500",     icon: CheckCircle2 },
};

const SUPPORT_EMAIL = "support@aquapure.in";

function fmt(iso: string): string {
  try { return format(parseISO(iso), "d MMM, h:mm a"); }
  catch { return ""; }
}

export function Support() {
  const { vendor, user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets]   = useState<SupportTicket[]>([]);
  const [loaded, setLoaded]     = useState(false);
  const [subject, setSubject]   = useState<string>(SUBJECTS[0]);
  const [message, setMessage]   = useState("");
  const [sending, setSending]   = useState(false);

  useEffect(() => {
    if (!vendor?.id) return;
    return subscribeSupportMessages(vendor.id, (t) => { setTickets(t); setLoaded(true); });
  }, [vendor?.id]);

  const openCount = useMemo(
    () => tickets.filter((t) => t.status !== "closed").length,
    [tickets],
  );

  const handleSend = async () => {
    if (!vendor || !message.trim() || sending) return;
    tap();
    setSending(true);
    const ok = await sendSupportMessage({
      vendorId:    vendor.id,
      vendorName:  vendor.name || "Vendor",
      vendorEmail: vendor.email || user?.email || "",
      subject,
      message:     message.trim(),
    });
    if (ok) {
      success();
      toast.success("Message sent — we'll reply soon");
      setMessage("");
      setSubject(SUBJECTS[0]);
    } else {
      toast.error("Failed to send. Please try again.");
    }
    setSending(false);
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-white pt-safe-header px-4 pb-3 border-b border-slate-100 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { tap(); navigate(-1); }}
            className="w-9 h-9 -ml-1 rounded-xl bg-slate-100 flex items-center justify-center active:scale-90 transition-transform"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 leading-none">Support</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {openCount > 0 ? `${openCount} open ticket${openCount > 1 ? "s" : ""}` : "We're here to help"}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Hero / contact */}
        <div className="relative bg-gradient-to-br from-[#0f0c29] via-[#1a1260] to-[#2d1fa3] rounded-2xl p-5 overflow-hidden">
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-violet-500/20 blur-2xl pointer-events-none" />
          <div className="relative flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/10 flex items-center justify-center shrink-0">
              <LifeBuoy className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-extrabold text-white">Need a hand?</p>
              <p className="text-xs text-indigo-200 mt-0.5 leading-relaxed">
                Send us a message below — the platform team usually replies within a few hours.
              </p>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-bold text-white bg-white/10 border border-white/15 rounded-lg px-2.5 py-1.5"
              >
                <Mail className="h-3.5 w-3.5" /> {SUPPORT_EMAIL}
              </a>
            </div>
          </div>
        </div>

        {/* Conversation */}
        <div>
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2.5 ml-1">
            Your Conversations
          </h2>

          {!loaded ? (
            <SkeletonList count={2} />
          ) : tickets.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="h-7 w-7 text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-500">No messages yet</p>
              <p className="text-xs text-slate-400 mt-1">Start a conversation using the form below</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((t) => {
                const meta = STATUS_META[t.status];
                return (
                  <div key={t.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3.5">
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wide truncate">
                        {t.subject}
                      </p>
                      <span className={`flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${meta.cls}`}>
                        <meta.icon className="h-3 w-3" /> {meta.label}
                      </span>
                    </div>

                    {/* Vendor message */}
                    <div className="flex justify-end">
                      <div className="bg-indigo-600 text-white text-sm rounded-2xl rounded-tr-md px-3.5 py-2.5 max-w-[88%]">
                        <p className="leading-relaxed whitespace-pre-wrap break-words">{t.message}</p>
                        <p className="text-[10px] text-white/60 mt-1 text-right">{fmt(t.createdAt)}</p>
                      </div>
                    </div>

                    {/* Admin reply */}
                    {t.adminReply ? (
                      <div className="flex justify-start mt-2">
                        <div className="bg-slate-50 border border-slate-100 text-slate-700 text-sm rounded-2xl rounded-tl-md px-3.5 py-2.5 max-w-[88%]">
                          <p className="text-[10px] font-extrabold text-indigo-600 mb-0.5">Support Team</p>
                          <p className="leading-relaxed whitespace-pre-wrap break-words">{t.adminReply}</p>
                          {t.repliedAt && (
                            <p className="text-[10px] text-slate-400 mt-1">{fmt(t.repliedAt)}</p>
                          )}
                        </div>
                      </div>
                    ) : t.status !== "closed" ? (
                      <p className="text-[11px] text-slate-400 mt-2 ml-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Waiting for the support team to reply…
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Compose */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h2 className="text-sm font-extrabold text-slate-900 mb-3">Send a message</h2>

          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Topic</label>
          <div className="relative mb-3">
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full appearance-none px-3.5 py-2.5 pr-9 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
            >
              {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>

          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Describe your issue or question in detail…"
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all resize-none"
          />

          <button
            onClick={handleSend}
            disabled={sending || message.trim().length < 5}
            className="mt-3 w-full py-3 bg-indigo-600 text-white text-sm font-extrabold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform shadow-md shadow-indigo-200"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? "Sending…" : "Send to Support"}
          </button>
        </div>

        <div className="h-2" />
      </div>
    </div>
  );
}
