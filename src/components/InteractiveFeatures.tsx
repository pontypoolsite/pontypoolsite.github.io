import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { ContactActions } from "@/components/ContactActions";
import { useCatalog } from "@/context/CatalogContext";
import { useStore } from "@/context/StoreContext";
import { formatProductPrice } from "@/config/site";

function CompareBar() {
  const { products } = useCatalog();
  const { compare, toggleCompare } = useStore();
  const [show, setShow] = useState(false);
  const items = products.filter((product) => compare.includes(product.id));
  if (!items.length) return null;

  const rows = [
    { label: "Product", value: (index: number) => items[index].name },
    { label: "Price", value: (index: number) => formatProductPrice(items[index].salePrice ?? items[index].price) },
    { label: "Category", value: (index: number) => items[index].category },
    { label: "Finishes", value: (index: number) => items[index].finishes.join(", ") || "Not listed" },
    { label: "Material", value: (index: number) => items[index].specs.material || "Not listed" },
    { label: "Wattage", value: (index: number) => items[index].specs.wattage || "Not listed" },
    { label: "Bulb base", value: (index: number) => items[index].specs.bulbBase || "Not listed" },
    { label: "Dimensions", value: (index: number) => items[index].specs.dimensions || "Not listed" },
  ];

  return (
    <>
      <div className="compare-bar">
        <span>{items.length} of 3 selected to compare</span>
        {items.map((product) => (
          <span key={product.id} className="compare-pill">
            {product.name}
            <button type="button" aria-label={`Remove ${product.name}`} onClick={() => toggleCompare(product.id)}>×</button>
          </span>
        ))}
        <button type="button" className="button-dark" onClick={() => setShow(true)}>Compare now</button>
        <button type="button" aria-label="Clear comparison" onClick={() => items.forEach((product) => toggleCompare(product.id))}>
          <X size={16} />
        </button>
      </div>
      {show && (
        <div className="fixed inset-0 z-[85] grid place-items-center bg-black/50 p-4" onClick={() => setShow(false)}>
          <section className="max-h-[85vh] w-full max-w-5xl overflow-auto rounded-xl bg-[var(--surface)] p-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex justify-between">
              <h2 className="font-serif text-3xl">Compare these lights</h2>
              <button type="button" onClick={() => setShow(false)} aria-label="Close comparison"><X /></button>
            </div>
            <div className="mt-5 grid" style={{ gridTemplateColumns: `130px repeat(${items.length}, minmax(150px, 1fr))` }}>
              {rows.map((row) => (
                <div key={row.label} className="contents">
                  <strong className="border-b border-[var(--line)] px-2 py-3 text-xs">{row.label}</strong>
                  {items.map((product, index) => (
                    <div key={product.id} className="border-b border-[var(--line)] px-2 py-3 text-xs">{row.value(index)}</div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function ProductExtras() {
  const { products } = useCatalog();
  const location = useLocation();
  const slug = location.pathname.split("/").pop();
  const { recent, remember } = useStore();
  const [deliveryArea, setDeliveryArea] = useState("");
  const [deliveryMessageReady, setDeliveryMessageReady] = useState(false);
  const product = products.find((item) => item.slug === slug);
  const productId = product?.id;

  useEffect(() => {
    if (productId) remember(productId);
  }, [productId, remember]);

  if (!product) return null;

  const specifications = [
    ["Dimensions", product.specs.dimensions],
    ["Wattage", product.specs.wattage],
    ["Bulb base", product.specs.bulbBase],
    ["Voltage", product.specs.voltage],
    ["Material", product.specs.material],
  ].filter(([, value]) => value.trim());
  const recentlyViewed = recent
    .filter((id) => id !== product.id)
    .map((id) => products.find((item) => item.id === id))
    .filter((item): item is (typeof products)[number] => Boolean(item))
    .slice(0, 4);
  const deliveryMessage = [
    `Hello Pontypool, please confirm delivery coverage, fee and timing for ${deliveryArea.trim() || "my area"}.`,
    `Product: ${product.name} (Item #${product.catalogId})`,
  ].join("\n");

  return (
    <section className="narrow-page pt-6">
      <div className="grid gap-8 border-y border-[var(--line)] py-8 md:grid-cols-2">
        <div>
          <p className="eyebrow">Product information</p>
          <h2 className="mt-2 font-serif text-3xl">The details that matter.</h2>
          {specifications.length ? (
            <dl className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {specifications.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-5 py-3 text-sm">
                  <dt className="text-[var(--muted)]">{label}</dt>
                  <dd className="text-right">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Verified measurements and bulb details are not listed yet. Ask us to confirm before ordering.
            </p>
          )}
        </div>

        <div>
          <p className="eyebrow">Check your delivery</p>
          <h2 className="mt-2 font-serif text-3xl">Is delivery available?</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Enter your town or area and we’ll confirm coverage, delivery fee and timing in chat.
          </p>
          <label className="mt-4 block text-xs">
            Town, county or neighbourhood
            <input
              className="form-input mt-2"
              value={deliveryArea}
              onChange={(event) => {
                setDeliveryArea(event.target.value);
                setDeliveryMessageReady(false);
              }}
              placeholder="For example, your town or neighbourhood"
            />
          </label>
          <button
            type="button"
            className="button-light mt-3"
            disabled={!deliveryArea.trim()}
            onClick={() => setDeliveryMessageReady(true)}
          >
            Prepare a delivery question
          </button>
          {deliveryMessageReady && (
            <div className="mt-4">
              <ContactActions message={deliveryMessage} whatsappLabel="Ask about delivery" />
            </div>
          )}
          {!product.price && (
            <div className="mt-5 border-t border-[var(--line)] pt-4">
              <p className="mb-3 text-sm text-[var(--muted)]">This item is price on request.</p>
              <ContactActions
                message={`Hello Pontypool, please share a quote for ${product.name} (Item #${product.catalogId}).`}
                whatsappLabel="Ask for a price"
              />
            </div>
          )}
        </div>
      </div>

      {recentlyViewed.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-5 font-serif text-2xl">Recently viewed</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {recentlyViewed.map((item) => (
              <Link key={item.id} to={`/product/${item.slug}`} className="rounded-lg bg-[var(--wash)] p-4 text-sm">
                {item.name}
                <span className="mt-2 block text-xs text-[var(--muted)]">{formatProductPrice(item.salePrice ?? item.price)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export function InteractiveFeatures() {
  const location = useLocation();

  useEffect(() => {
    const elements = document.querySelectorAll(".page-section, .product-card, .article-card, .room-finder");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    elements.forEach((element) => {
      element.classList.add("reveal");
      observer.observe(element);
    });
    return () => observer.disconnect();
  }, [location.pathname]);

  return (
    <>
      {location.pathname.startsWith("/product/") && <ProductExtras />}
      <CompareBar />
    </>
  );
}
