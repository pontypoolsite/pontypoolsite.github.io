import { useCatalog } from "@/context/CatalogContext";

export function CatalogStatus() {
  const { products, loading, error } = useCatalog();
  if (!error && (!loading || products.length > 0)) return null;

  return (
    <div
      role={error ? "alert" : "status"}
      aria-live="polite"
      className="border-b border-[var(--line)] bg-[var(--wash)] px-5 py-3 text-center text-xs text-[var(--muted)]"
    >
      {error ? `Live catalog unavailable: ${error}` : "Loading the live product catalog…"}
    </div>
  );
}
