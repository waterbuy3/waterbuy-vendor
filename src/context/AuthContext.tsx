import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
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

    const unsubAuth = subscribeToAuth((u) => {
      userRef.current = u;
      unsubVendorRef.current?.();
      unsubVendorRef.current = null;
      setUser(u);
      if (u) {
        unsubVendorRef.current = subscribeVendorProfile(u.id, (v) => {
          setVendor(v);
          setLoading(false);
        });
      } else {
        setVendor(null);
        setLoading(false);
      }
    });

    return () => {
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

  return (
    <AuthContext.Provider value={{ user, vendor, loading, refreshVendor }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
