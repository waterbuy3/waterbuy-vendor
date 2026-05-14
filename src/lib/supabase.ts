import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const isConfigured =
  typeof window !== "undefined" && !!supabaseUrl && supabaseUrl !== "REPLACE_ME";

// Strip non-ISO-8859-1 characters from header values before the browser Fetch
// API rejects them. Some versions of @supabase/supabase-js include Unicode in
// X-Client-Info or similar headers which Chrome refuses.
function safeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (init?.headers) {
    const normalized = new Headers(init.headers as HeadersInit);
    const clean: Record<string, string> = {};
    normalized.forEach((v, k) => {
      // eslint-disable-next-line no-control-regex
      clean[k] = v.replace(/[^\x00-\xFF]/g, "");
    });
    return fetch(input, { ...init, headers: clean });
  }
  return fetch(input, init);
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
  const { data } = supabase.auth.onAuthStateChange((_e, session) => {
    callback(session?.user ?? null);
  });
  supabase.auth.getSession().then(({ data: { session } }) => {
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

  const fetch = async () => {
    const { data } = await supabase!.from("vendors").select("*").eq("id", id).single();
    callback(data ? rowToVendor(data as Record<string, unknown>) : null);
  };

  fetch();

  const channel = supabase
    .channel(`vendor-${id}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "vendors", filter: `id=eq.${id}` }, fetch)
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

export function subscribeVendorOrders(
  vendorId: string,
  callback: (orders: VendorOrder[]) => void
): () => void {
  if (!supabase) { callback([]); return () => {}; }

  const fetch = async () => {
    // Show orders assigned to this vendor OR unassigned orders (claimable)
    const { data } = await supabase!
      .from("orders")
      .select("*")
      .or(`vendor_id.eq.${vendorId},vendor_id.is.null`)
      .order("placed_at", { ascending: false });
    callback((data ?? []).map((r) => rowToOrder(r as Record<string, unknown>)));
  };

  fetch();

  const channel = supabase
    .channel(`vendor-orders-${vendorId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `vendor_id=eq.${vendorId}` }, fetch)
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

  const fetch = async () => {
    const { data } = await supabase!
      .from("products")
      .select("*")
      .eq("vendor_id", vendorId);
    callback((data ?? []).map((r) => rowToProduct(r as Record<string, unknown>)));
  };

  fetch();

  const channel = supabase
    .channel(`vendor-products-${vendorId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "products", filter: `vendor_id=eq.${vendorId}` }, fetch)
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

export function subscribeVendorPayouts(
  vendorId: string,
  callback: (payouts: Payout[]) => void
): () => void {
  if (!supabase) { callback([]); return () => {}; }

  const fetch = async () => {
    const { data } = await supabase!
      .from("payouts")
      .select("*")
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false });
    callback((data ?? []).map((r) => ({
      id:        r.id as string,
      vendorId:  r.vendor_id as string,
      amount:    r.amount as number,
      period:    r.period as string,
      status:    r.status as "pending" | "paid",
      paidAt:    r.paid_at as string | undefined,
      createdAt: r.created_at as string,
    })));
  };

  fetch();

  const channel = supabase
    .channel(`vendor-payouts-${vendorId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "payouts", filter: `vendor_id=eq.${vendorId}` }, fetch)
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
