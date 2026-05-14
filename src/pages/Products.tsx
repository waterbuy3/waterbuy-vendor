import { useEffect, useState } from "react";
import { Plus, Package, Pencil, X, Save, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import { subscribeVendorProducts, upsertProduct, toggleProductActive, type VendorProduct } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const EMPTY: Omit<VendorProduct, "id" | "vendorId"> = {
  name: "", size: "", unit: "Bottle", price: 0, mrp: undefined,
  category: "individual", description: "", badge: undefined, active: true, stock: 0, imageUrl: "",
};

export function Products() {
  const { vendor }  = useAuth();
  const [products,  setProducts]  = useState<VendorProduct[]>([]);
  const [editing,   setEditing]   = useState<Partial<VendorProduct> | null>(null);
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    if (!vendor) return;
    return subscribeVendorProducts(vendor.id, setProducts);
  }, [vendor?.id]);

  const openNew  = () => setEditing({ ...EMPTY });
  const openEdit = (p: VendorProduct) => setEditing({ ...p });
  const close    = () => setEditing(null);

  const save = async () => {
    if (!vendor || !editing?.name?.trim()) return;
    setSaving(true);
    try {
      await upsertProduct(vendor.id, editing);
      toast.success(editing.id ? "Product updated" : "Product added");
      close();
    } catch { toast.error("Failed to save product"); }
    finally { setSaving(false); }
  };

  const toggle = async (id: string, active: boolean) => {
    await toggleProductActive(id, active).catch(() => toast.error("Failed"));
  };

  const fieldCls = "w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all";

  return (
    <div className="max-w-4xl animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">My Products</h2>
          <p className="text-xs text-slate-400 mt-0.5">{products.length} products in your catalog</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-extrabold rounded-xl transition-colors">
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      {/* Product grid */}
      {products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-20 text-center">
          <Package className="h-10 w-10 text-slate-200 mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-400">No products yet</p>
          <p className="text-xs text-slate-300 mt-1 mb-5">Add products that you supply to the platform</p>
          <button onClick={openNew} className="px-5 py-2 bg-teal-600 text-white text-sm font-extrabold rounded-xl hover:bg-teal-700 transition-colors">
            Add your first product
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {products.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 px-5 py-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${p.active ? "bg-teal-50" : "bg-slate-100"}`}>
                <Package className={`h-5 w-5 ${p.active ? "text-teal-500" : "text-slate-300"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-extrabold text-slate-900 truncate">{p.name}</p>
                  {p.badge && <span className="text-[9px] font-extrabold bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">{p.badge}</span>}
                  {!p.active && <span className="text-[9px] font-extrabold bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full">Inactive</span>}
                </div>
                <p className="text-xs text-slate-400">{p.size} · {p.unit} · Stock: {p.stock}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-extrabold text-slate-900">₹{p.price}</p>
                {p.mrp && p.mrp > p.price && (
                  <p className="text-[10px] text-slate-400 line-through">₹{p.mrp}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggle(p.id, !p.active)} className="text-slate-400 hover:text-teal-600 transition-colors">
                  {p.active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                </button>
                <button onClick={() => openEdit(p)} className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Add modal */}
      {editing !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900">{editing.id ? "Edit Product" : "Add Product"}</h3>
              <button onClick={close} className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Product name *</label>
                  <input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. 5L Water Can" className={fieldCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Size</label>
                  <input value={editing.size ?? ""} onChange={(e) => setEditing({ ...editing, size: e.target.value })} placeholder="5L" className={fieldCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Unit</label>
                  <select value={editing.unit ?? "Bottle"} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} className={fieldCls}>
                    {["Bottle", "Can", "Pack", "Jar", "Sachet"].map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Price (₹) *</label>
                  <input type="number" min={0} value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: +e.target.value })} className={fieldCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">MRP (₹)</label>
                  <input type="number" min={0} value={editing.mrp ?? ""} onChange={(e) => setEditing({ ...editing, mrp: e.target.value ? +e.target.value : undefined })} className={fieldCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Stock</label>
                  <input type="number" min={0} value={editing.stock ?? 0} onChange={(e) => setEditing({ ...editing, stock: +e.target.value })} className={fieldCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Category</label>
                  <select value={editing.category ?? "individual"} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className={fieldCls}>
                    {["individual", "corporate", "bulk", "subscription"].map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Description</label>
                  <textarea rows={2} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className={fieldCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Badge (optional)</label>
                  <input value={editing.badge ?? ""} onChange={(e) => setEditing({ ...editing, badge: e.target.value || undefined })} placeholder="e.g. Bestseller" className={fieldCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Image URL</label>
                  <input value={editing.imageUrl ?? ""} onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })} placeholder="https://..." className={fieldCls} />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editing.active ?? true} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} className="rounded" />
                <span className="text-sm font-semibold text-slate-700">Active (visible to customers)</span>
              </label>
            </div>
            <div className="flex gap-3 px-6 pb-5">
              <button onClick={close} className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-extrabold rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={save} disabled={saving || !editing.name?.trim()}
                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-extrabold rounded-xl transition-colors flex items-center justify-center gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editing.id ? "Update" : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
