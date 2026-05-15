import { useEffect, useState, useMemo } from "react";
import {
  Plus, Package, Pencil, X, Save, Loader2, Search,
  Droplets, Minus, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  subscribeVendorProducts, upsertProduct, toggleProductActive,
  type VendorProduct,
} from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const EMPTY: Omit<VendorProduct, "id" | "vendorId"> = {
  name: "", size: "", unit: "Bottle", price: 0, mrp: undefined,
  category: "individual", description: "", badge: undefined, active: true, stock: 0, imageUrl: "",
};

const UNITS = ["Bottle", "Can", "Pack", "Jar", "Sachet", "Litre"] as const;
const CATEGORIES = ["individual", "corporate", "bulk", "subscription"] as const;

function ProductSheet({ product, vendorId, onClose }: {
  product: Partial<VendorProduct>;
  vendorId: string;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<VendorProduct>>(product);
  const [saving, setSaving] = useState(false);

  const upd = (patch: Partial<VendorProduct>) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    if (!form.name?.trim()) { toast.error("Product name is required"); return; }
    setSaving(true);
    try {
      await upsertProduct(vendorId, form);
      toast.success(form.id ? "Product updated" : "Product added!");
      onClose();
    } catch { toast.error("Failed to save product"); }
    finally { setSaving(false); }
  };

  const inp = "w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all";

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-backdrop" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl shadow-2xl max-h-[95vh] flex flex-col animate-slide-up">
        <div className="flex justify-center pt-3 shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0">
          <h3 className="text-base font-extrabold text-slate-900">{form.id ? "Edit Product" : "Add New Product"}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Product Name *</label>
            <input
              value={form.name ?? ""}
              onChange={(e) => upd({ name: e.target.value })}
              placeholder="e.g. 20L Water Can"
              className={inp}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Size</label>
              <input value={form.size ?? ""} onChange={(e) => upd({ size: e.target.value })} placeholder="20L" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Unit</label>
              <select value={form.unit ?? "Bottle"} onChange={(e) => upd({ unit: e.target.value })} className={inp}>
                {UNITS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Price (₹) *</label>
              <input
                type="number" min={0}
                value={form.price ?? 0}
                onChange={(e) => upd({ price: +e.target.value })}
                className={inp}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">MRP (₹)</label>
              <input
                type="number" min={0}
                value={form.mrp ?? ""}
                onChange={(e) => upd({ mrp: e.target.value ? +e.target.value : undefined })}
                placeholder="Optional"
                className={inp}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Stock</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => upd({ stock: Math.max(0, (form.stock ?? 0) - 1) })}
                  className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0"
                >
                  <Minus className="h-3.5 w-3.5 text-slate-600" />
                </button>
                <input
                  type="number" min={0}
                  value={form.stock ?? 0}
                  onChange={(e) => upd({ stock: +e.target.value })}
                  className="flex-1 px-2 py-2 text-sm text-center bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => upd({ stock: (form.stock ?? 0) + 1 })}
                  className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0"
                >
                  <Plus className="h-3.5 w-3.5 text-slate-600" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Category</label>
              <select value={form.category ?? "individual"} onChange={(e) => upd({ category: e.target.value })} className={inp}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Description</label>
            <textarea
              rows={2}
              value={form.description ?? ""}
              onChange={(e) => upd({ description: e.target.value })}
              placeholder="Short description of the product"
              className={inp}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Badge (optional)</label>
              <input
                value={form.badge ?? ""}
                onChange={(e) => upd({ badge: e.target.value || undefined })}
                placeholder="e.g. Bestseller"
                className={inp}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Image URL</label>
              <input
                value={form.imageUrl ?? ""}
                onChange={(e) => upd({ imageUrl: e.target.value })}
                placeholder="https://..."
                className={inp}
              />
            </div>
          </div>

          {/* Active toggle */}
          <button
            type="button"
            onClick={() => upd({ active: !form.active })}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all ${
              form.active ? "bg-indigo-50 border-indigo-200" : "bg-slate-50 border-slate-200"
            }`}
          >
            <div>
              <p className={`text-sm font-extrabold ${form.active ? "text-indigo-700" : "text-slate-500"}`}>
                {form.active ? "Active — visible to customers" : "Inactive — hidden from customers"}
              </p>
            </div>
            <div className={`w-12 h-6 rounded-full relative transition-all ${form.active ? "bg-indigo-600" : "bg-slate-300"}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.active ? "left-6" : "left-0.5"}`} />
            </div>
          </button>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-slate-100 shrink-0 pb-safe">
          <button onClick={onClose} className="flex-1 py-3 border border-slate-200 text-slate-700 text-sm font-extrabold rounded-2xl">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !form.name?.trim()}
            className="flex-1 py-3 bg-indigo-600 text-white text-sm font-extrabold rounded-2xl disabled:opacity-60 flex items-center justify-center gap-2 shadow-md shadow-indigo-200"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {form.id ? "Update" : "Add Product"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Products() {
  const { vendor } = useAuth();
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [editing, setEditing]   = useState<Partial<VendorProduct> | null>(null);
  const [query, setQuery]       = useState("");
  const [filter, setFilter]     = useState<"all" | "active" | "inactive">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!vendor) return;
    return subscribeVendorProducts(vendor.id, setProducts);
  }, [vendor?.id]);

  const visible = useMemo(() => {
    let list = products;
    if (filter === "active")   list = list.filter((p) => p.active);
    if (filter === "inactive") list = list.filter((p) => !p.active);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    }
    return list;
  }, [products, filter, query]);

  const toggle = async (id: string, active: boolean) => {
    await toggleProductActive(id, active).catch(() => toast.error("Failed to update"));
  };

  const adjustStock = async (product: VendorProduct, delta: number) => {
    const newStock = Math.max(0, product.stock + delta);
    await upsertProduct(vendor!.id, { ...product, stock: newStock }).catch(() => toast.error("Failed to update stock"));
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-white pt-safe px-4 pt-4 pb-3 border-b border-slate-100 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Products</h1>
            <p className="text-xs text-slate-400 mt-0.5">{products.length} in catalog · {products.filter((p) => p.active).length} active</p>
          </div>
          <button
            onClick={() => setEditing({ ...EMPTY })}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white text-sm font-extrabold rounded-xl shadow-md shadow-indigo-200"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>

        <div className="flex gap-1.5">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                filter === f
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 space-y-2">
        {visible.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center mt-4">
            <Package className="h-10 w-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-400">
              {query ? "No products match your search" : "No products yet"}
            </p>
            {!query && (
              <button
                onClick={() => setEditing({ ...EMPTY })}
                className="mt-4 px-5 py-2.5 bg-indigo-600 text-white text-sm font-extrabold rounded-xl"
              >
                Add your first product
              </button>
            )}
          </div>
        ) : (
          visible.map((p) => {
            const isExpanded = expanded === p.id;
            return (
              <div key={p.id} className={`bg-white rounded-2xl border shadow-sm transition-all ${p.active ? "border-slate-100" : "border-slate-100 opacity-70"}`}>
                <button
                  className="w-full flex items-center gap-3 p-4 text-left"
                  onClick={() => setExpanded(isExpanded ? null : p.id)}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${p.active ? "bg-indigo-50" : "bg-slate-100"}`}>
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                    ) : (
                      <Droplets className={`h-5 w-5 ${p.active ? "text-indigo-400" : "text-slate-300"}`} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-sm font-extrabold text-slate-900 truncate">{p.name}</p>
                      {p.badge && (
                        <span className="text-[9px] font-extrabold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full shrink-0">{p.badge}</span>
                      )}
                      {!p.active && (
                        <span className="text-[9px] font-extrabold bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full shrink-0">OFF</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">{p.size} {p.unit} · Stock: <span className={`font-bold ${p.stock === 0 ? "text-red-500" : "text-slate-600"}`}>{p.stock}</span></p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-extrabold text-slate-900">₹{p.price}</p>
                    {p.mrp && p.mrp > p.price && (
                      <p className="text-[10px] text-slate-400 line-through">₹{p.mrp}</p>
                    )}
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-slate-400 ml-auto mt-0.5" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-auto mt-0.5" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-50 pt-3 space-y-3 animate-fade-in">
                    {/* Stock controls */}
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-500">Adjust Stock</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => adjustStock(p, -1)}
                          className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center"
                        >
                          <Minus className="h-3.5 w-3.5 text-slate-600" />
                        </button>
                        <span className="text-sm font-extrabold text-slate-900 w-8 text-center">{p.stock}</span>
                        <button
                          onClick={() => adjustStock(p, 1)}
                          className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center"
                        >
                          <Plus className="h-3.5 w-3.5 text-slate-600" />
                        </button>
                      </div>
                    </div>

                    {/* Active toggle */}
                    <button
                      onClick={() => toggle(p.id, !p.active)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                        p.active ? "bg-indigo-50 border-indigo-200" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <span className={`text-xs font-extrabold ${p.active ? "text-indigo-700" : "text-slate-500"}`}>
                        {p.active ? "Active" : "Inactive"}
                      </span>
                      <div className={`w-10 h-5 rounded-full relative transition-all ${p.active ? "bg-indigo-600" : "bg-slate-300"}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${p.active ? "left-5" : "left-0.5"}`} />
                      </div>
                    </button>

                    {/* Edit button */}
                    <button
                      onClick={() => setEditing({ ...p })}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-white text-sm font-extrabold rounded-xl"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit Product
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div className="h-2" />
      </div>

      {editing !== null && vendor && (
        <ProductSheet
          product={editing}
          vendorId={vendor.id}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
