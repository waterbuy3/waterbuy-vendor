import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { subscribeToAuth, subscribeVendorProfile, isConfigured, type Vendor } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  vendor: Vendor | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, vendor: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [vendor, setVendor]   = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(isConfigured);
  const unsubVendorRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isConfigured) { setLoading(false); return; }

    const unsubAuth = subscribeToAuth((u) => {
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

  return <AuthContext.Provider value={{ user, vendor, loading }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
