import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  fetchCatalogCategories,
  fetchCatalogProducts,
  type CatalogCategory,
} from "@/lib/catalog-api";
import { mapCatalogProducts, type Product } from "@/data/products";

type CatalogContextValue = {
  products: Product[];
  categories: CatalogCategory[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [productRecords, categoryRecords] = await Promise.all([
        fetchCatalogProducts(),
        fetchCatalogCategories(),
      ]);
      setProducts(mapCatalogProducts(productRecords));
      setCategories(categoryRecords);
      setLastUpdated(new Date());
      setError(null);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "The live catalog could not be loaded.";
      console.error("Storefront catalog refresh failed:", cause);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const intervalId = window.setInterval(() => void refresh(), 45_000);
    return () => window.clearInterval(intervalId);
  }, [refresh]);

  return (
    <CatalogContext.Provider value={{ products, categories, loading, error, lastUpdated, refresh }}>
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const value = useContext(CatalogContext);
  if (!value) {
    throw new Error("useCatalog must be used inside CatalogProvider");
  }
  return value;
}
