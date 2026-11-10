import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { adminRequest, fetchCatalogCategories, fetchCatalogProducts, signInAdmin, type CatalogCategory, type CatalogProduct, type StorefrontOrder } from "@/lib/catalog-api";
import { useCatalog } from "@/context/CatalogContext";
import { formatPrice } from "@/config/site";

type ProductFormState = {
  name: string;
  sku: string;
  categoryId: string;
  price: string;
  quantity: string;
  reorderLevel: string;
  unit: string;
  imageUrl: string;
  variants: string;
  notStocked: boolean;
};

function formatDeliveryTime(value: string): string {
  if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value)) return value;
  const [hours, minutes] = value.split(":").map(Number);
  return new Intl.DateTimeFormat("en-KE", { hour: "numeric", minute: "2-digit" })
    .format(new Date(2000, 0, 1, hours, minutes));
}

const emptyProduct: ProductFormState = {
  name: "",
  sku: "",
  categoryId: "",
  price: "0",
  quantity: "0",
  reorderLevel: "0",
  unit: "piece",
  imageUrl: "",
  variants: "",
  notStocked: false,
};

function productForm(product: CatalogProduct): ProductFormState {
  return {
    name: product.name,
    sku: product.sku ?? "",
    categoryId: product.categoryId === null ? "" : String(product.categoryId),
    price: String(product.price),
    quantity: String(product.quantity),
    reorderLevel: String(product.reorderLevel),
    unit: product.unit,
    imageUrl: product.imageUrl ?? "",
    variants: product.variants ? JSON.stringify(product.variants, null, 2) : "",
    notStocked: product.notStocked,
  };
}

function payloadForProduct(form: ProductFormState) {
  let variants: unknown[] | null = null;
  if (form.variants.trim()) {
    const parsed: unknown = JSON.parse(form.variants);
    if (!Array.isArray(parsed)) throw new Error("Variants must be a JSON array.");
    variants = parsed;
  }

  const payload = {
    name: form.name.trim(),
    sku: form.sku.trim() || null,
    categoryId: form.categoryId ? Number(form.categoryId) : null,
    price: Number(form.price),
    quantity: Number(form.quantity),
    reorderLevel: Number(form.reorderLevel),
    unit: form.unit.trim(),
    imageUrl: form.imageUrl.trim() || null,
    variants,
    notStocked: form.notStocked,
  };
  if (!payload.name || !payload.unit
    || !Number.isFinite(payload.price) || payload.price < 0
    || !Number.isSafeInteger(payload.quantity) || payload.quantity < 0
    || !Number.isSafeInteger(payload.reorderLevel) || payload.reorderLevel < 0) {
    throw new Error("Enter a product name, unit, valid price, and whole-number quantities.");
  }
  if (payload.categoryId !== null && (!Number.isSafeInteger(payload.categoryId) || payload.categoryId < 1)) {
    throw new Error("Choose a valid category.");
  }
  return payload;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs">
      {label}
      {children}
    </label>
  );
}

export default function Admin() {
  const { refresh } = useCatalog();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [orders, setOrders] = useState<StorefrontOrder[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyProduct);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  const [purchase, setPurchase] = useState({ productId: "", variantIndex: "", quantity: "1", unitCost: "0", shopName: "", employeeName: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadAdminCatalog = useCallback(async () => {
    const [nextProducts, nextCategories] = await Promise.all([
      fetchCatalogProducts(),
      fetchCatalogCategories(),
    ]);
    setProducts(nextProducts);
    setCategories(nextCategories);
    await refresh();
  }, [refresh]);

  const loadAdminOrders = useCallback(async () => {
    const nextOrders = await adminRequest<StorefrontOrder[]>(token, "/admin/orders", "GET");
    setOrders(nextOrders);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void Promise.all([loadAdminCatalog(), loadAdminOrders()]).catch((cause) => {
      setError(cause instanceof Error ? cause.message : "Could not load the catalog.");
      setToken("");
    });
  }, [token, loadAdminCatalog, loadAdminOrders]);

  const run = async (action: () => Promise<void>, successMessage: string) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(successMessage);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The change could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const signedInToken = await signInAdmin(username, password);
      setPassword("");
      setToken(signedInToken);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  const saveProduct = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const payload = payloadForProduct(form);
      const selected = products.find((product) => product.id === selectedId);
      if (selected) {
        const { quantity, ...editableFields } = payload;
        await adminRequest(token, `/admin/products/${selected.id}`, "PUT", {
          ...editableFields,
          ...(!selected.notStocked ? { quantity } : {}),
        });
      } else {
        await adminRequest(token, "/admin/products", "POST", payload);
      }
      await loadAdminCatalog();
      setSelectedId(null);
      setForm(emptyProduct);
    }, "Product saved to shared inventory.");
  };

  const saveCategory = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const selected = categories.find((category) => category.id === editingCategory);
      const path = selected ? `/admin/categories/${selected.id}` : "/admin/categories";
      await adminRequest(token, path, selected ? "PUT" : "POST", {
        name: categoryName.trim(),
        description: categoryDescription.trim(),
      });
      await loadAdminCatalog();
      setEditingCategory(null);
      setCategoryName("");
      setCategoryDescription("");
    }, "Category saved to shared inventory.");
  };

  const addResellerPurchase = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const productId = Number(purchase.productId);
      const quantity = Number(purchase.quantity);
      const unitCost = Number(purchase.unitCost);
      if (!Number.isSafeInteger(productId) || productId < 1
        || !Number.isSafeInteger(quantity) || quantity < 1
        || !Number.isFinite(unitCost) || unitCost < 0
        || !purchase.shopName.trim() || !purchase.employeeName.trim()) {
        throw new Error("Enter the product, quantity, unit cost, shop, and employee.");
      }
      await adminRequest(token, "/admin/reseller-purchases", "POST", {
        productId,
        variantIndex: purchase.variantIndex === "" ? null : Number(purchase.variantIndex),
        quantity,
        unitCost,
        shopName: purchase.shopName.trim(),
        employeeName: purchase.employeeName.trim(),
      });
      await loadAdminCatalog();
      setPurchase({ productId: "", variantIndex: "", quantity: "1", unitCost: "0", shopName: "", employeeName: "" });
    }, "Reseller stock purchase recorded.");
  };

  const updateOrderStatus = (order: StorefrontOrder, status: "confirmed" | "declined") => {
    const action = status === "confirmed" ? "confirm" : "decline";
    if (!window.confirm(`${action === "confirm" ? "Confirm" : "Decline"} delivery request ${order.orderReference}?`)) return;
    void run(async () => {
      await adminRequest(token, `/admin/orders/${order.id}`, "PUT", { status });
      await loadAdminOrders();
    }, status === "confirmed" ? "Delivery request confirmed." : "Delivery request declined.");
  };

  if (!token) {
    return (
      <main className="narrow-page max-w-lg">
        <p className="eyebrow">Private access</p>
        <h1 className="mt-3 font-serif text-5xl">Store admin</h1>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Sign in to manage products and categories in the same inventory database.
        </p>
        {error && <p role="alert" className="mt-5 text-sm text-red-700">{error}</p>}
        <form className="mt-8 space-y-4" onSubmit={submitLogin}>
          <Field label="Username">
            <input className="form-input mt-2" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} />
          </Field>
          <Field label="Password">
            <input className="form-input mt-2" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
          <button className="button-dark w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        </form>
        <Link className="mt-6 inline-block text-xs underline" to="/">Return to the store</Link>
      </main>
    );
  }

  const selectedPurchaseProduct = products.find((product) => product.id === Number(purchase.productId));
  const purchaseVariants = Array.isArray(selectedPurchaseProduct?.variants) ? selectedPurchaseProduct.variants : [];

  return (
    <main className="narrow-page max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Shared Neon inventory</p>
          <h1 className="mt-3 font-serif text-5xl">Store admin</h1>
          <p className="mt-3 text-sm text-[var(--muted)]">Changes here are written to the same products and categories used by the inventory system.</p>
        </div>
        <button className="button-light" onClick={() => { setToken(""); setProducts([]); }}>Sign out</button>
      </div>

      {error && <p role="alert" className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="mt-6 rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800">{notice}</p>}

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-3xl">Delivery requests</h2>
            <p className="mt-2 text-xs text-[var(--muted)]">Requests are pending until you confirm them. Confirming does not reserve stock or record payment.</p>
          </div>
          <button className="button-light" disabled={busy} onClick={() => { void run(loadAdminOrders, "Delivery requests refreshed."); }}>Refresh requests</button>
        </div>
        {orders.length === 0 ? (
          <p className="mt-4 rounded-lg border border-[var(--line)] p-5 text-sm text-[var(--muted)]">No delivery requests have been saved yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {orders.map((order) => (
              <article key={order.id} className="rounded-lg border border-[var(--line)] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-xl">{order.orderReference} · {order.customerName}</h3>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {order.status} · received {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <strong>{formatPrice(Number(order.total))}</strong>
                </div>
                <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
                  <p>Email: {order.email || "—"}</p>
                  <p>Phone: {order.phone || "—"}</p>
                  <p className="sm:col-span-2">Location: {order.location}</p>
                  <p className="sm:col-span-2">
                    Map pin: {Number(order.locationLatitude).toFixed(5)}, {Number(order.locationLongitude).toFixed(5)}
                  </p>
                  <p>Preferred date: {order.deliveryDate}</p>
                  <p>Preferred time: {formatDeliveryTime(order.deliveryTime)}</p>
                </div>
                <ul className="mt-4 space-y-1 border-t border-[var(--line)] pt-3 text-xs">
                  {order.items.map((item, index) => (
                    <li key={`${item.productId}-${item.variantIndex ?? "base"}-${index}`} className="flex justify-between gap-4">
                      <span>{item.productName} × {item.quantity}</span>
                      <span>{formatPrice(Number(item.lineTotal))}</span>
                    </li>
                  ))}
                </ul>
                {order.status === "pending" && (
                  <div className="mt-4 flex gap-3">
                    <button className="button-dark" disabled={busy} onClick={() => updateOrderStatus(order, "confirmed")}>Confirm request</button>
                    <button className="button-light" disabled={busy} onClick={() => updateOrderStatus(order, "declined")}>Decline</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-3xl">Products</h2>
        <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--line)]">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="bg-[var(--wash)]"><tr>{["Product", "SKU", "Category", "Price", "Available", "Actions"].map((heading) => <th key={heading} className="p-3">{heading}</th>)}</tr></thead>
            <tbody>{products.map((product) => (
              <tr key={product.id} className="border-t border-[var(--line)]">
                <td className="p-3">{product.name}</td>
                <td className="p-3">{product.sku || "—"}</td>
                <td className="p-3">{product.category || "—"}</td>
                <td className="p-3">{product.price}</td>
                <td className="p-3">{product.notStocked ? product.resellerQuantity : product.quantity}</td>
                <td className="p-3"><button className="underline" disabled={busy} onClick={() => { void run(async () => { const record = await adminRequest<CatalogProduct>(token, `/admin/products/${product.id}`, "GET"); setSelectedId(product.id); setForm(productForm(record)); }, "Product loaded for editing."); }}>Edit</button><button className="ml-4 text-red-700 underline" disabled={busy} onClick={() => { if (window.confirm(`Delete ${product.name} from the shared catalog?`)) void run(async () => { await adminRequest(token, `/admin/products/${product.id}`, "DELETE"); await loadAdminCatalog(); }, "Product removed from shared inventory."); }}>Delete</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>

        <form className="mt-7 grid gap-4 rounded-lg border border-[var(--line)] p-5 md:grid-cols-2" onSubmit={saveProduct}>
          <h3 className="font-serif text-2xl md:col-span-2">{selectedId ? `Edit product #${selectedId}` : "Add product"}</h3>
          <Field label="Product name"><input className="form-input mt-2" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label="SKU"><input className="form-input mt-2" value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} /></Field>
          <Field label="Category"><select className="form-input mt-2" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}><option value="">Uncategorized</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
          <Field label="Base price (KSh)"><input className="form-input mt-2" type="number" min="0" step="0.01" required value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></Field>
          <Field label={form.notStocked ? "Inventory quantity (reseller stock is recorded below)" : "Available quantity"}><input className="form-input mt-2" type="number" min="0" step="1" disabled={form.notStocked} value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></Field>
          <Field label="Reorder level"><input className="form-input mt-2" type="number" min="0" step="1" value={form.reorderLevel} onChange={(event) => setForm({ ...form, reorderLevel: event.target.value })} /></Field>
          <Field label="Unit"><input className="form-input mt-2" required value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} /></Field>
          <Field label="Image URL or data:image URL"><textarea className="form-input mt-2 min-h-24" value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} /></Field>
          <Field label="Variants JSON (prices, quantities, finishes)"><textarea className="form-input mt-2 min-h-40 font-mono text-[10px]" value={form.variants} onChange={(event) => setForm({ ...form, variants: event.target.value })} placeholder='[{"label":"Warm white","price":1500,"quantity":4}]' /></Field>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.notStocked} onChange={(event) => setForm({ ...form, notStocked: event.target.checked })} />Reseller / not-stocked product</label>
          <div className="flex gap-3 md:col-span-2"><button className="button-dark" disabled={busy}>{busy ? "Saving…" : "Save product"}</button>{selectedId && <button type="button" className="button-light" onClick={() => { setSelectedId(null); setForm(emptyProduct); }}>Cancel edit</button>}</div>
        </form>
      </section>

      <section className="mt-12 grid gap-10 md:grid-cols-2">
        <div>
          <h2 className="font-serif text-3xl">Categories</h2>
          <ul className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {categories.map((category) => <li key={category.id} className="flex items-center justify-between gap-3 py-3 text-sm"><span>{category.name}</span><span className="flex gap-4"><button className="text-xs underline" onClick={() => { setEditingCategory(category.id); setCategoryName(category.name); setCategoryDescription(category.description); }}>Edit</button><button className="text-xs text-red-700 underline" disabled={busy} onClick={() => { if (window.confirm(`Delete category ${category.name}? Products still assigned to it prevent deletion.`)) void run(async () => { await adminRequest(token, `/admin/categories/${category.id}`, "DELETE"); await loadAdminCatalog(); }, "Category removed from shared inventory."); }}>Delete</button></span></li>)}
          </ul>
          <form className="mt-5 space-y-3" onSubmit={saveCategory}>
            <h3 className="font-serif text-xl">{editingCategory ? "Edit category" : "Add category"}</h3>
            <Field label="Name"><input className="form-input mt-2" required value={categoryName} onChange={(event) => setCategoryName(event.target.value)} /></Field>
            <Field label="Description"><textarea className="form-input mt-2 min-h-20" value={categoryDescription} onChange={(event) => setCategoryDescription(event.target.value)} /></Field>
            <div className="flex gap-3"><button className="button-dark" disabled={busy}>{editingCategory ? "Save category" : "Add category"}</button>{editingCategory && <button type="button" className="button-light" onClick={() => { setEditingCategory(null); setCategoryName(""); setCategoryDescription(""); }}>Cancel</button>}</div>
          </form>
        </div>

        <div>
          <h2 className="font-serif text-3xl">Reseller stock</h2>
          <p className="mt-2 text-xs text-[var(--muted)]">Record the actual purchase; availability is calculated from reseller purchases minus sales.</p>
          <form className="mt-5 space-y-3" onSubmit={addResellerPurchase}>
            <Field label="Not-stocked product"><select className="form-input mt-2" required value={purchase.productId} onChange={(event) => setPurchase({ ...purchase, productId: event.target.value, variantIndex: "" })}><option value="">Choose product</option>{products.filter((product) => product.notStocked).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></Field>
            {purchaseVariants.length > 0 && <Field label="Variant"><select className="form-input mt-2" required value={purchase.variantIndex} onChange={(event) => setPurchase({ ...purchase, variantIndex: event.target.value })}><option value="">Choose variant</option>{purchaseVariants.map((variant, index) => <option key={index} value={index}>{typeof variant === "object" && variant !== null && "label" in variant ? String(variant.label) : `Variant ${index + 1}`}</option>)}</select></Field>}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Quantity"><input className="form-input mt-2" type="number" min="1" step="1" required value={purchase.quantity} onChange={(event) => setPurchase({ ...purchase, quantity: event.target.value })} /></Field>
              <Field label="Unit cost (KSh)"><input className="form-input mt-2" type="number" min="0" step="0.01" required value={purchase.unitCost} onChange={(event) => setPurchase({ ...purchase, unitCost: event.target.value })} /></Field>
              <Field label="Shop purchased from"><input className="form-input mt-2" required value={purchase.shopName} onChange={(event) => setPurchase({ ...purchase, shopName: event.target.value })} /></Field>
              <Field label="Employee"><input className="form-input mt-2" required value={purchase.employeeName} onChange={(event) => setPurchase({ ...purchase, employeeName: event.target.value })} /></Field>
            </div>
            <button className="button-dark" disabled={busy}>Record reseller purchase</button>
          </form>
        </div>
      </section>

      <p className="mt-12 border-t border-[var(--line)] pt-5 text-xs text-[var(--muted)]">
        Website edits and inventory-system edits use the same Neon rows. Storefront visitors see inventory updates on the next refresh (within about 45 seconds). Order/payment processing is not enabled.
      </p>
    </main>
  );
}
