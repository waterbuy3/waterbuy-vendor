import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";

// Trim trailing newlines — Vercel sometimes injects \n into env var values,
// which appears as %0A in WebSocket URLs and breaks realtime connections.
const supabaseUrl     = ((import.meta.env.VITE_SUPABASE_URL     as string) ?? "").trim();
const supabaseAnonKey = ((import.meta.env.VITE_SUPABASE_ANON_KEY as string) ?? "").trim();

export const isConfigured =
  typeof window !== "undefined" && !!supabaseUrl && supabaseUrl !== "REPLACE_ME";

// Strip non-ISO-8859-1 characters from header values before the browser Fetch
// API rejects them. Some versions of @supabase/supabase-js include Unicode in
// X-Client-Info or similar headers which Chrome refuses.
// Fast path: most requests have ASCII-only headers; only allocate a cleaned
// copy when we actually detect an offending character.
// eslint-disable-next-line no-control-regex
const NON_LATIN1 = /[^\x00-\xFF]/;
function safeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (!init?.headers) return fetch(input, init);
  // Quick scan of the raw headers before paying for a Headers() construction.
  const raw = init.headers as HeadersInit;
  let needsClean = false;
  if (Array.isArray(raw)) {
    for (const [, v] of raw) { if (NON_LATIN1.test(v)) { needsClean = true; break; } }
  } else if (raw instanceof Headers) {
    raw.forEach((v) => { if (NON_LATIN1.test(v)) needsClean = true; });
  } else {
    for (const v of Object.values(raw as Record<string, string>)) {
      if (NON_LATIN1.test(v)) { needsClean = true; break; }
    }
  }
  if (!needsClean) return fetch(input, init);

  const normalized = new Headers(raw);
  const clean: Record<string, string> = {};
  normalized.forEach((v, k) => { clean[k] = v.replace(/[^\x00-\xFF]/g, ""); });
  return fetch(input, { ...init, headers: clean });
}

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, { global: { fetch: safeFetch } })
  : null;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  area: string;
  commissionPct: number;
  bankName: string;
  bankAccount: string;
  bankIfsc: string;
  isOpen: boolean;
  active: boolean;
  createdAt: string;
}

export interface VendorOrder {
  id: string;
  userId: string;
  vendorId: string;
  customer: string;
  phone: string;
  items: string;
  total: number;
  litres: number;
  payment: string;
  address: string;
  status: string;
  placedAt: string;
  deliveredAt?: string;
}

export interface VendorProduct {
  id: string;
  name: string;
  size: string;
  unit: string;
  price: number;
  mrp?: number;
  category: string;
  description: string;
  badge?: string;
  active: boolean;
  stock: number;
  imageUrl: string;
  vendorId: string;
}

export interface Payout {
  id: string;
  vendorId: string;
  amount: number;
  period: string;
  status: "pending" | "paid";
  paidAt?: string;
  createdAt: string;
}

export async function fetchVendorById(id: string): Promise<Vendor | null> {
  if (!supabase) return null;
  const { data } = await supabase.from("vendors").select("*").eq("id", id).single();
  return data ? rowToVendor(data as Record<string, unknown>) : null;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function vendorSignOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export function subscribeToAuth(
  callback: (user: SupabaseUser | null) => void
): () => void {
  if (!supabase) { callback(null); return () => {}; }
  // onAuthStateChange fires INITIAL_SESSION immediately — no need for getSession()
  // which would cause a double callback and race condition in AuthContext.
  const { data } = supabase.auth.onAuthStateChange((_e, session) => {
    callback(session?.user ?? null);
  });
  return () => data.subscription.unsubscribe();
}

// ─── Vendor profile ───────────────────────────────────────────────────────────

function rowToVendor(row: Record<string, unknown>): Vendor {
  return {
    id:            row.id as string,
    name:          (row.name as string) ?? "",
    email:         (row.email as string) ?? "",
    phone:         (row.phone as string) ?? "",
    area:          (row.area as string) ?? "",
    commissionPct: (row.commission_pct as number) ?? 10,
    bankName:      (row.bank_name as string) ?? "",
    bankAccount:   (row.bank_account as string) ?? "",
    bankIfsc:      (row.bank_ifsc as string) ?? "",
    isOpen:        (row.is_open as boolean) ?? true,
    active:        (row.active as boolean) ?? true,
    createdAt:     (row.created_at as string) ?? "",
  };
}

export function subscribeVendorProfile(
  id: string,
  callback: (vendor: Vendor | null) => void
): () => void {
  if (!supabase) { callback(null); return () => {}; }

  // Initial load only — realtime UPDATE events carry the full new row,
  // so we don't need a re-fetch round trip on every change.
  (async () => {
    const { data } = await supabase!.from("vendors").select("*").eq("id", id).single();
    callback(data ? rowToVendor(data as Record<string, unknown>) : null);
  })();

  const channel = supabase
    .channel(`vendor-${id}`)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "vendors", filter: `id=eq.${id}` },
      ({ new: row }) => callback(rowToVendor(row as Record<string, unknown>)))
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "vendors", filter: `id=eq.${id}` },
      () => callback(null))
    .subscribe();

  return () => { supabase!.removeChannel(channel); };
}

export async function updateVendorProfile(id: string, updates: Partial<{
  name: string; phone: string; area: string;
  bankName: string; bankAccount: string; bankIfsc: string;
  isOpen: boolean;
}>): Promise<void> {
  if (!supabase) return;
  const mapped: Record<string, unknown> = {};
  if (updates.name       !== undefined) mapped.name         = updates.name;
  if (updates.phone      !== undefined) mapped.phone        = updates.phone;
  if (updates.area       !== undefined) mapped.area         = updates.area;
  if (updates.bankName   !== undefined) mapped.bank_name    = updates.bankName;
  if (updates.bankAccount!== undefined) mapped.bank_account = updates.bankAccount;
  if (updates.bankIfsc   !== undefined) mapped.bank_ifsc    = updates.bankIfsc;
  if (updates.isOpen     !== undefined) mapped.is_open      = updates.isOpen;
  await supabase.from("vendors").update(mapped).eq("id", id);
}

// ─── Orders ───────────────────────────────────────────────────────────────────

function rowToOrder(row: Record<string, unknown>): VendorOrder {
  return {
    id:          row.id as string,
    userId:      (row.user_id as string) ?? "",
    vendorId:    (row.vendor_id as string) ?? "",
    customer:    (row.customer as string) ?? "",
    phone:       (row.phone as string) ?? "",
    items:       (row.items as string) ?? "",
    total:       (row.total as number) ?? 0,
    litres:      (row.litres as number) ?? 0,
    payment:     (row.payment as string) ?? "",
    address:     (row.address as string) ?? "",
    status:      (row.status as string) ?? "pending",
    placedAt:    (row.placed_at as string) ?? "",
    deliveredAt: (row.delivered_at as string) ?? undefined,
  };
}

// Columns actually used by the app — avoids SELECT * overhead
const ORDER_COLS = "id,user_id,vendor_id,customer,phone,items,total,litres,payment,address,status,placed_at,delivered_at";

/** Vendor's own orders — realtime, limited to 200 most recent. */
export function subscribeMyOrders(
  vendorId: string,
  callback: (orders: VendorOrder[]) => void
): () => void {
  if (!supabase) { callback([]); return () => {}; }

  let current: VendorOrder[] = [];
  const emit = () => callback(current);

  // Initial fetch — afterwards we mutate the local cache from event payloads.
  (async () => {
    const { data } = await supabase!
      .from("orders")
      .select(ORDER_COLS)
      .eq("vendor_id", vendorId)
      .order("placed_at", { ascending: false })
      .limit(200);
    current = (data ?? []).map((r) => rowToOrder(r as Record<string, unknown>));
    emit();
  })();

  const channel = supabase
    .channel(`my-orders-${vendorId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: `vendor_id=eq.${vendorId}` },
      ({ new: row }) => {
        const o = rowToOrder(row as Record<string, unknown>);
        if (current.some((x) => x.id === o.id)) return;
        current = [o, ...current].slice(0, 200);
        emit();
      })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `vendor_id=eq.${vendorId}` },
      ({ new: row }) => {
        const o = rowToOrder(row as Record<string, unknown>);
        const idx = current.findIndex((x) => x.id === o.id);
        if (idx >= 0) {
          // Replace in place — preserve order so React keys stay stable.
          current = current.map((x, i) => (i === idx ? o : x));
        } else if (o.vendorId === vendorId) {
          // Newly assigned to us — prepend.
          current = [o, ...current].slice(0, 200);
        } else {
          return;
        }
        emit();
      })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "orders", filter: `vendor_id=eq.${vendorId}` },
      ({ old: row }) => {
        const id = (row as { id?: string }).id;
        if (!id) return;
        const next = current.filter((x) => x.id !== id);
        if (next.length === current.length) return;
        current = next;
        emit();
      })
    .subscribe();

  return () => { supabase!.removeChannel(channel); };
}

/** Unassigned pending orders a vendor can claim — limit 30, realtime on status changes. */
export function subscribeNewOrders(
  callback: (orders: VendorOrder[]) => void
): () => void {
  if (!supabase) { callback([]); return () => {}; }

  let current: VendorOrder[] = [];
  const emit = () => callback(current);

  (async () => {
    const { data } = await supabase!
      .from("orders")
      .select(ORDER_COLS)
      .is("vendor_id", null)
      .eq("status", "pending")
      .order("placed_at", { ascending: false })
      .limit(30);
    current = (data ?? []).map((r) => rowToOrder(r as Record<string, unknown>));
    emit();
  })();

  // We can't filter on `vendor_id IS NULL` server-side via the realtime
  // postgres_changes filter, so we listen to all pending-status events and
  // apply the unassigned check client-side.
  const isUnassignedPending = (o: VendorOrder) => !o.vendorId && o.status === "pending";

  const channel = supabase
    .channel("new-orders-pending")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: "status=eq.pending" },
      ({ new: row }) => {
        const o = rowToOrder(row as Record<string, unknown>);
        if (!isUnassignedPending(o) || current.some((x) => x.id === o.id)) return;
        current = [o, ...current].slice(0, 30);
        emit();
      })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" },
      ({ new: row }) => {
        const o = rowToOrder(row as Record<string, unknown>);
        const wasIn = current.some((x) => x.id === o.id);
        const shouldBe = isUnassignedPending(o);
        if (wasIn && !shouldBe) {
          current = current.filter((x) => x.id !== o.id);
          emit();
        } else if (!wasIn && shouldBe) {
          current = [o, ...current].slice(0, 30);
          emit();
        } else if (wasIn && shouldBe) {
          current = current.map((x) => (x.id === o.id ? o : x));
          emit();
        }
      })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "orders" },
      ({ old: row }) => {
        const id = (row as { id?: string }).id;
        if (!id) return;
        const next = current.filter((x) => x.id !== id);
        if (next.length === current.length) return;
        current = next;
        emit();
      })
    .subscribe();

  return () => { supabase!.removeChannel(channel); };
}

export async function updateOrderStatus(orderId: string, status: string): Promise<void> {
  if (!supabase) return;
  const update: Record<string, unknown> = { status };
  if (status === "delivered") update.delivered_at = new Date().toISOString();
  await supabase.from("orders").update(update).eq("id", orderId);
}

export async function acceptOrder(orderId: string, vendorId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("orders").update({ status: "confirmed", vendor_id: vendorId }).eq("id", orderId);
}

export async function rejectOrder(orderId: string): Promise<void> {
  await updateOrderStatus(orderId, "cancelled");
}

// ─── Products ─────────────────────────────────────────────────────────────────

function rowToProduct(row: Record<string, unknown>): VendorProduct {
  return {
    id:          row.id as string,
    name:        (row.name as string) ?? "",
    size:        (row.size as string) ?? "",
    unit:        (row.unit as string) ?? "Bottle",
    price:       (row.price as number) ?? 0,
    mrp:         row.mrp as number | undefined,
    category:    (row.category as string) ?? "",
    description: (row.description as string) ?? "",
    badge:       row.badge as string | undefined,
    active:      (row.active as boolean) ?? true,
    stock:       (row.stock as number) ?? 0,
    imageUrl:    (row.imageUrl as string) ?? (row.image_url as string) ?? "",
    vendorId:    (row.vendor_id as string) ?? "",
  };
}

export function subscribeVendorProducts(
  vendorId: string,
  callback: (products: VendorProduct[]) => void
): () => void {
  if (!supabase) { callback([]); return () => {}; }

  let current: VendorProduct[] = [];
  const emit = () => callback(current);

  (async () => {
    const { data } = await supabase!
      .from("products")
      .select("*")
      .eq("vendor_id", vendorId);
    current = (data ?? []).map((r) => rowToProduct(r as Record<string, unknown>));
    emit();
  })();

  const channel = supabase
    .channel(`vendor-products-${vendorId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "products", filter: `vendor_id=eq.${vendorId}` },
      ({ new: row }) => {
        const p = rowToProduct(row as Record<string, unknown>);
        if (current.some((x) => x.id === p.id)) return;
        current = [...current, p];
        emit();
      })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "products", filter: `vendor_id=eq.${vendorId}` },
      ({ new: row }) => {
        const p = rowToProduct(row as Record<string, unknown>);
        const idx = current.findIndex((x) => x.id === p.id);
        if (idx < 0) { current = [...current, p]; }
        else { current = current.map((x, i) => (i === idx ? p : x)); }
        emit();
      })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "products", filter: `vendor_id=eq.${vendorId}` },
      ({ old: row }) => {
        const id = (row as { id?: string }).id;
        if (!id) return;
        const next = current.filter((x) => x.id !== id);
        if (next.length === current.length) return;
        current = next;
        emit();
      })
    .subscribe();

  return () => { supabase!.removeChannel(channel); };
}

export async function upsertProduct(vendorId: string, product: Partial<VendorProduct> & { id?: string }): Promise<void> {
  if (!supabase) return;
  const row: Record<string, unknown> = {
    vendor_id:   vendorId,
    name:        product.name ?? "",
    size:        product.size ?? "",
    unit:        product.unit ?? "Bottle",
    price:       product.price ?? 0,
    mrp:         product.mrp,
    category:    product.category ?? "",
    description: product.description ?? "",
    badge:       product.badge,
    active:      product.active ?? true,
    stock:       product.stock ?? 0,
    imageUrl:    product.imageUrl ?? "",
  };
  if (product.id) {
    await supabase.from("products").update(row).eq("id", product.id);
  } else {
    await supabase.from("products").insert({ ...row, id: crypto.randomUUID() });
  }
}

export async function toggleProductActive(productId: string, active: boolean): Promise<void> {
  if (!supabase) return;
  await supabase.from("products").update({ active }).eq("id", productId);
}

// ─── Earnings / Payouts ───────────────────────────────────────────────────────

function rowToPayout(r: Record<string, unknown>): Payout {
  return {
    id:        r.id as string,
    vendorId:  r.vendor_id as string,
    amount:    r.amount as number,
    period:    r.period as string,
    status:    r.status as "pending" | "paid",
    paidAt:    r.paid_at as string | undefined,
    createdAt: r.created_at as string,
  };
}

export function subscribeVendorPayouts(
  vendorId: string,
  callback: (payouts: Payout[]) => void
): () => void {
  if (!supabase) { callback([]); return () => {}; }

  let current: Payout[] = [];
  const emit = () => callback(current);

  (async () => {
    const { data } = await supabase!
      .from("payouts")
      .select("*")
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false });
    current = (data ?? []).map((r) => rowToPayout(r as Record<string, unknown>));
    emit();
  })();

  const channel = supabase
    .channel(`vendor-payouts-${vendorId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "payouts", filter: `vendor_id=eq.${vendorId}` },
      ({ new: row }) => {
        const p = rowToPayout(row as Record<string, unknown>);
        if (current.some((x) => x.id === p.id)) return;
        current = [p, ...current];
        emit();
      })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "payouts", filter: `vendor_id=eq.${vendorId}` },
      ({ new: row }) => {
        const p = rowToPayout(row as Record<string, unknown>);
        const idx = current.findIndex((x) => x.id === p.id);
        if (idx < 0) { current = [p, ...current]; }
        else { current = current.map((x, i) => (i === idx ? p : x)); }
        emit();
      })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "payouts", filter: `vendor_id=eq.${vendorId}` },
      ({ old: row }) => {
        const id = (row as { id?: string }).id;
        if (!id) return;
        const next = current.filter((x) => x.id !== id);
        if (next.length === current.length) return;
        current = next;
        emit();
      })
    .subscribe();

  return () => { supabase!.removeChannel(channel); };
}

// ─── Earnings summary from orders ─────────────────────────────────────────────

export async function getEarningSummary(vendorId: string): Promise<{
  totalRevenue: number;
  totalOrders: number;
  totalLitres: number;
  pendingPayout: number;
  commissionPct: number;
}> {
  if (!supabase) return { totalRevenue: 0, totalOrders: 0, totalLitres: 0, pendingPayout: 0, commissionPct: 10 };

  const [ordersRes, vendorRes] = await Promise.all([
    supabase.from("orders").select("total, litres, status").eq("vendor_id", vendorId),
    supabase.from("vendors").select("commission_pct").eq("id", vendorId).single(),
  ]);

  const orders = (ordersRes.data ?? []) as { total: number; litres: number; status: string }[];
  const commissionPct = (vendorRes.data as { commission_pct: number } | null)?.commission_pct ?? 10;
  const delivered = orders.filter((o) => o.status === "delivered");

  const totalRevenue = delivered.reduce((s, o) => s + (o.total ?? 0), 0);
  const totalLitres  = delivered.reduce((s, o) => s + (o.litres ?? 0), 0);
  const vendorShare  = totalRevenue * (1 - commissionPct / 100);

  const { data: payouts } = await supabase.from("payouts").select("amount, status").eq("vendor_id", vendorId);
  const paidOut = ((payouts ?? []) as { amount: number; status: string }[])
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.amount, 0);

  return {
    totalRevenue,
    totalOrders: delivered.length,
    totalLitres: +totalLitres.toFixed(1),
    pendingPayout: +(vendorShare - paidOut).toFixed(2),
    commissionPct,
  };
}
