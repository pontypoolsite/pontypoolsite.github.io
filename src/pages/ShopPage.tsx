import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, LayoutGrid, List, SlidersHorizontal, X } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ProductGrid } from "@/components/ProductCard";
import { useCatalog } from "@/context/CatalogContext";
import { formatPrice } from "@/config/site";
import type { Product } from "@/data/products";

const roomOptions = ["Living room", "Bedroom", "Kitchen", "Dining", "Outdoor", "Office"];
const styleOptions = ["Modern", "Traditional", "Industrial", "Vintage", "Minimalist"];
const finishOptions = ["Brass", "Black", "Chrome", "Gold", "White"];
const purposeOptions = [
  { id: "main", label: "Main light", terms: ["ceiling", "pendant", "chandelier", "flush", "panel", "downlight"] },
  { id: "task", label: "Task lighting", terms: ["desk", "reading", "table lamp", "under cabinet", "spot", "track"] },
  { id: "accent", label: "Ambient & accent", terms: ["wall bracket", "sconce", "wall light", "floor lamp", "table lamp", "picture"] },
];

const roomTerms: Record<string, string[]> = {
  "Living room": ["pendant", "chandelier", "wall bracket", "ceiling light", "floor lamp", "table lamp"],
  Bedroom: ["bedside", "table lamp", "wall bracket", "wall light", "pendant"],
  Kitchen: ["pendant", "ceiling light", "downlighter", "panel", "under cabinet"],
  Dining: ["pendant", "chandelier", "dining", "linear suspension"],
  Outdoor: ["outdoor", "garden", "flood", "gate light", "solar"],
  Office: ["desk lamp", "panel", "downlighter", "ceiling light", "linear"],
};

const styleTerms: Record<string, string[]> = {
  Modern: ["modern", "contemporary", "minimal", "sleek"],
  Traditional: ["traditional", "classic", "heritage", "ornate"],
  Industrial: ["industrial", "factory", "metal", "cage"],
  Vintage: ["vintage", "retro", "edison", "antique"],
  Minimalist: ["minimal", "simple", "clean", "scandinavian"],
};

function productSearchText(product: Product) {
  return `${product.name} ${product.category} ${product.description} ${product.finishes.join(" ")}`.toLowerCase();
}

function matchesRoom(product: Product, room: string) {
  if (!room) return true;
  const text = productSearchText(product);
  return (roomTerms[room] ?? [room.toLowerCase()]).some((term) => text.includes(term));
}

function matchesStyle(product: Product, style: string) {
  if (!style) return true;
  const text = productSearchText(product);
  return (styleTerms[style] ?? [style.toLowerCase()]).some((term) => text.includes(term));
}

function matchesPurpose(product: Product, purpose: string) {
  if (!purpose) return true;
  const option = purposeOptions.find((item) => item.id === purpose);
  if (!option) return true;
  const text = productSearchText(product);
  return option.terms.some((term) => text.includes(term));
}

type FiltersProps = {
  categories: { id: number; name: string }[];
  hasUncategorized: boolean;
  max: number | null;
  priceCeiling: number;
  finish: string;
  inStock: boolean;
  room: string;
  style: string;
  purpose: string;
  onMaxChange: (value: number | null) => void;
  onFinishChange: (value: string) => void;
  onStockChange: (value: boolean) => void;
  onRoomChange: (value: string) => void;
  onStyleChange: (value: string) => void;
  onPurposeChange: (value: string) => void;
  onClear: () => void;
};

function FilterOptions({
  categories,
  hasUncategorized,
  max,
  priceCeiling,
  finish,
  inStock,
  room,
  style,
  purpose,
  onMaxChange,
  onFinishChange,
  onStockChange,
  onRoomChange,
  onStyleChange,
  onPurposeChange,
  onClear,
}: FiltersProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-widest">Refine by</h2>
        <button type="button" className="text-xs underline" onClick={onClear}>Clear all</button>
      </div>

      <label className="filter-title mt-7">Category</label>
      <Link to="/shop" className="filter-link">All lighting</Link>
      {categories.map((category) => (
        <Link key={category.id} to={`/shop/${encodeURIComponent(category.name)}`} className="filter-link">
          {category.name}
        </Link>
      ))}
      {hasUncategorized && <Link to="/shop/Uncategorized" className="filter-link">Uncategorized</Link>}

      <div className="mt-7 flex items-center justify-between gap-2">
        <label className="filter-title">
          Maximum price · {formatPrice(max ?? priceCeiling)}
        </label>
        {max !== null && (
          <button type="button" className="text-xs underline" onClick={() => onMaxChange(null)}>Reset</button>
        )}
      </div>
      <input
        aria-label="Maximum price"
        className="mt-3 w-full accent-[#d7a900]"
        type="range"
        min="0"
        max={priceCeiling}
        step={Math.max(1, Math.ceil(priceCeiling / 100))}
        value={max ?? priceCeiling}
        onChange={(event) => onMaxChange(Number(event.target.value))}
      />

      <label className="filter-title mt-7">Room</label>
      {roomOptions.map((option) => (
        <label key={option} className="filter-check">
          <input type="checkbox" checked={room === option} onChange={() => onRoomChange(room === option ? "" : option)} />
          {option}
        </label>
      ))}

      <label className="filter-title mt-7">Style</label>
      {styleOptions.map((option) => (
        <label key={option} className="filter-check">
          <input type="checkbox" checked={style === option} onChange={() => onStyleChange(style === option ? "" : option)} />
          {option}
        </label>
      ))}

      <label className="filter-title mt-7">Lighting purpose</label>
      {purposeOptions.map((option) => (
        <label key={option.id} className="filter-check">
          <input
            type="checkbox"
            checked={purpose === option.id}
            onChange={() => onPurposeChange(purpose === option.id ? "" : option.id)}
          />
          {option.label}
        </label>
      ))}

      <label className="filter-title mt-7">Finish</label>
      {finishOptions.map((option) => (
        <label key={option} className="filter-check">
          <input type="checkbox" checked={finish === option} onChange={() => onFinishChange(finish === option ? "" : option)} />
          {option}
        </label>
      ))}

      <label className="filter-check mt-6">
        <input type="checkbox" checked={inStock} onChange={(event) => onStockChange(event.target.checked)} />
        In stock
      </label>
    </>
  );
}

export default function ShopPage() {
  const { products, categories } = useCatalog();
  const { category = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState("Featured");
  const [max, setMax] = useState<number | null>(null);
  const [finish, setFinish] = useState("");
  const [room, setRoom] = useState(searchParams.get("room") ?? "");
  const [style, setStyle] = useState(searchParams.get("style") ?? "");
  const [purpose, setPurpose] = useState(searchParams.get("purpose") ?? "");
  const [list, setList] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setRoom(searchParams.get("room") ?? "");
    setStyle(searchParams.get("style") ?? "");
    setPurpose(searchParams.get("purpose") ?? "");
  }, [searchParams]);

  useEffect(() => {
    if (!filtersOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFiltersOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [filtersOpen]);

  const priceCeiling = Math.max(
    100,
    Math.ceil(Math.max(0, ...products.map((product) => product.salePrice ?? product.price)) / 1000) * 1000,
  );
  const filtered = useMemo(() => {
    const items = products.filter((product) => (
      (!category || product.category.toLowerCase() === category.toLowerCase())
      && (max === null || (product.salePrice ?? product.price) <= max)
      && (!finish || productSearchText(product).includes(finish.toLowerCase()))
      && (!inStock || product.quantity > 0)
      && matchesRoom(product, room)
      && matchesStyle(product, style)
      && matchesPurpose(product, purpose)
    ));

    if (sort === "Price low-high") items.sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price));
    if (sort === "Price high-low") items.sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price));
    if (sort === "Newest") items.sort((a, b) => Number(b.isNew) - Number(a.isNew));
    return items;
  }, [products, category, max, finish, inStock, room, style, purpose, sort]);

  const activeFilters = Number(inStock)
    + Number(max !== null)
    + Number(Boolean(finish))
    + Number(Boolean(room))
    + Number(Boolean(style))
    + Number(Boolean(purpose));
  const title = category || room || style || purposeOptions.find((option) => option.id === purpose)?.label || "All lighting";

  const updateQueryFilter = (key: "room" | "style" | "purpose", value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };
  const clearFilters = () => {
    setInStock(false);
    setMax(null);
    setFinish("");
    const next = new URLSearchParams(searchParams);
    next.delete("room");
    next.delete("style");
    next.delete("purpose");
    setSearchParams(next, { replace: true });
  };

  const filtersProps: FiltersProps = {
    categories,
    hasUncategorized: products.some((product) => product.category === "Uncategorized"),
    max,
    priceCeiling,
    finish,
    inStock,
    room,
    style,
    purpose,
    onMaxChange: setMax,
    onFinishChange: setFinish,
    onStockChange: setInStock,
    onRoomChange: (value) => updateQueryFilter("room", value),
    onStyleChange: (value) => updateQueryFilter("style", value),
    onPurposeChange: (value) => updateQueryFilter("purpose", value),
    onClear: clearFilters,
  };

  return (
    <main className="catalog-page">
      <div className="breadcrumbs">
        <Link to="/">Home</Link><ChevronRight size={13} /><span>{title}</span>
      </div>
      <div className="catalog-heading">
        <p className="eyebrow">The Pontypool collection</p>
        <h1 className="font-serif text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-[#77746d]">
          Considered pieces for the way you live · {filtered.length} styles
        </p>
      </div>

      <div className="catalog-layout">
        <aside className="filter-panel">
          <FilterOptions {...filtersProps} />
        </aside>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-5">
            <span className="text-xs text-[#77746d]">Showing {filtered.length} beautiful things</span>
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="mobile-filter-trigger"
                onClick={() => setFiltersOpen(true)}
                aria-haspopup="dialog"
              >
                <SlidersHorizontal size={15} /> Filter{activeFilters ? ` · ${activeFilters}` : ""}
              </button>
              <label className="sr-only" htmlFor="product-sort">Sort products</label>
              <select id="product-sort" className="bg-transparent text-xs" value={sort} onChange={(event) => setSort(event.target.value)}>
                {["Featured", "Price low-high", "Price high-low", "Newest"].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <button type="button" onClick={() => setList(false)} aria-label="Grid view" aria-pressed={!list}>
                <LayoutGrid size={17} />
              </button>
              <button type="button" onClick={() => setList(true)} aria-label="List view" aria-pressed={list}>
                <List size={17} />
              </button>
            </div>
          </div>
          {filtered.length ? (
            <div className="mt-7">
              <ProductGrid items={filtered} list={list} />
            </div>
          ) : (
            <div className="empty-catalog-state mt-8">
              <p className="font-serif text-2xl">No lights found just yet.</p>
              <p className="mt-2 text-sm text-[var(--muted)]">Try a different room or clear a filter.</p>
              <button type="button" className="button-dark mt-5" onClick={clearFilters}>Clear filters</button>
            </div>
          )}
        </div>
      </div>

      {filtersOpen && createPortal(
        <div className="mobile-filter-backdrop" onClick={() => setFiltersOpen(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-filter-title"
            className="mobile-filter-sheet"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mobile-filter-heading">
              <h2 id="mobile-filter-title" className="font-serif text-2xl">Refine your search</h2>
              <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters"><X /></button>
            </div>
            <div className="mobile-filter-content">
              <FilterOptions {...filtersProps} />
            </div>
            <button type="button" className="button-dark mobile-filter-apply" onClick={() => setFiltersOpen(false)}>
              Show {filtered.length} results
            </button>
          </section>
        </div>,
        document.body,
      )}
    </main>
  );
}
