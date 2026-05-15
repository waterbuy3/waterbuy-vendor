import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from "react";
import { subscribeToAuth, subscribeVendorProfile, fetchVendorById, isConfigured, type Vendor } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  vendor: Vendor | null;
  loading: boolean;
  refreshVendor: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null, vendor: null, loading: true,
  refreshVendor: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [vendor, setVendor]   = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(isConfigured);
  const unsubVendorRef = useRef<(() => void) | null>(null);
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    if (!isConfigured) { setLoading(false); return; }

    // Safety: force loading off after 8 s in case Supabase never responds
    const timeout = setTimeout(() => setLoading(false), 8000);

    const unsubAuth = subscribeToAuth((u) => {
      // Skip when the auth event re-fires for the same user — avoids tearing
      // down and re-establishing the vendor subscription on every token
      // refresh, which otherwise cascades through VendorDataContext.
      const prevId = userRef.current?.id ?? null;
      const nextId = u?.id ?? null;
      if (prevId === nextId) {
        userRef.current = u;
        return;
      }
      userRef.current = u;
      unsubVendorRef.current?.();
      unsubVendorRef.current = null;
      setUser(u);
      if (u) {
        unsubVendorRef.current = subscribeVendorProfile(u.id, (v) => {
          setVendor(v);
          setLoading(false);
          clearTimeout(timeout);
        });
      } else {
        setVendor(null);
        setLoading(false);
        clearTimeout(timeout);
      }
    });

    return () => {
      clearTimeout(timeout);
      unsubAuth();
      unsubVendorRef.current?.();
    };
  }, []);

  const refreshVendor = useCallback(async () => {
    const uid = userRef.current?.id;
    if (!uid) return;
    const v = await fetchVendorById(uid);
    if (v) setVendor(v);
  }, []);

  const value = useMemo(
    () => ({ user, vendor, loading, refreshVendor }),
    [user, vendor, loading, refreshVendor]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
