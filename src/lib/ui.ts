import { useEffect, useRef, useState } from "react";

/**
 * Light haptic tap — uses the Vibration API where available (Android PWA /
 * Capacitor WebView). Silently no-ops on unsupported platforms (iOS Safari).
 */
export function haptic(pattern: number | number[] = 8): void {
  try { navigator.vibrate?.(pattern); } catch { /* unsupported */ }
}

/** Haptic presets for common interactions. */
export const tap     = () => haptic(8);
export const success = () => haptic([12, 40, 18]);
export const warn    = () => haptic(24);

/**
 * Animate a number from its previous value to `value` with an ease-out curve.
 * Returns the in-flight display value — render with your own formatting.
 */
export function useCountUp(value: number, duration = 650): number {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) { setDisplay(to); return; }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = to;
    };
  }, [value, duration]);

  return display;
}

/** Format a rupee amount with thousands separators, no decimals. */
export function inr(amount: number): string {
  return "₹" + Math.round(amount).toLocaleString("en-IN");
}
