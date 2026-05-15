import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";

// `beforeinstallprompt` is non-standard and not in lib.dom — declare the shape.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "aqp-vendor-install-dismissed";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS 13+ reports a Mac UA — fall back to touch detection.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Explicit install affordance. Browsers' automatic install banners are
 * unreliable (Chrome shows only a subtle omnibox icon; iOS Safari never
 * prompts at all), so we surface our own button:
 *  - Chromium: capture `beforeinstallprompt` and trigger it on tap.
 *  - iOS Safari: show manual "Add to Home Screen" instructions.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return; // already installed

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < SNOOZE_MS) return;

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault(); // stop Chrome's mini-infobar; we drive the prompt
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // iOS Safari never fires `beforeinstallprompt` — show a manual hint.
    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    if (isIos()) {
      iosTimer = setTimeout(() => {
        setIosHint(true);
        setVisible(true);
      }, 2500);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* private mode — ignore */
    }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "accepted") setVisible(false);
  };

  return (
    <div
      className="fixed inset-x-0 z-[60] px-3 animate-fade-in"
      style={{ bottom: "calc(64px + env(safe-area-inset-bottom, 0px) + 8px)" }}
    >
      <div className="mx-auto max-w-md bg-white rounded-2xl shadow-2xl ring-1 ring-slate-900/5 p-3 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-teal-500 flex items-center justify-center shrink-0">
          <Download className="h-5 w-5 text-white" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold text-slate-900 leading-tight">
            Install AquaPure Vendor
          </p>
          {iosHint ? (
            <p className="text-[11px] text-slate-500 leading-snug mt-0.5 flex items-center gap-1 flex-wrap">
              Tap <Share className="h-3 w-3 inline-block" strokeWidth={2.5} /> then
              &ldquo;Add to Home Screen&rdquo;
            </p>
          ) : (
            <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
              Add it to your home screen for quick access
            </p>
          )}
        </div>
        {!iosHint && (
          <button
            onClick={install}
            className="shrink-0 px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-extrabold active:scale-95 transition-transform"
          >
            Install
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
