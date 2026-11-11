import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useCatalog } from "@/context/CatalogContext";

type CartLine = { id: string; quantity: number };
type StoreContextValue = {
  cart: CartLine[];
  wishlist: string[];
  compare: string[];
  recent: string[];
  drawerOpen: boolean;
  count: number;
  dark: boolean;
  addToCart: (id: string) => void;
  clearCart: () => void;
  changeQuantity: (id: string, quantity: number) => void;
  toggleWishlist: (id: string) => void;
  toggleCompare: (id: string) => void;
  remember: (id: string) => void;
  setDrawerOpen: (open: boolean) => void;
  toggleDark: () => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);

const read = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const { products } = useCatalog();
  const [cart, setCart] = useState<CartLine[]>(() => read("pontypool-cart", []));
  const [wishlist, setWishlist] = useState<string[]>(() => read("pontypool-wishlist", []));
  const [compare, setCompare] = useState<string[]>(() => read("pontypool-compare", []));
  const [recent, setRecent] = useState<string[]>(() => read("pontypool-recent", []));
  const [dark, setDark] = useState(() => read("pontypool-dark", false));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const remember = useCallback((id: string) => {
    setRecent((current) => [id, ...current.filter((item) => item !== id)].slice(0, 8));
  }, []);

  useEffect(() => { localStorage.setItem("pontypool-cart", JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem("pontypool-wishlist", JSON.stringify(wishlist)); }, [wishlist]);
  useEffect(() => { localStorage.setItem("pontypool-compare", JSON.stringify(compare)); }, [compare]);
  useEffect(() => { localStorage.setItem("pontypool-recent", JSON.stringify(recent)); }, [recent]);
  useEffect(() => {
    localStorage.setItem("pontypool-dark", JSON.stringify(dark));
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const value = useMemo<StoreContextValue>(() => ({
    cart,
    wishlist,
    compare,
    recent,
    drawerOpen,
    count: cart.reduce((sum, item) => sum + item.quantity, 0),
    dark,
    clearCart: () => setCart([]),
    addToCart: (id) => {
      const product = products.find((item) => item.id === id);
      if (!product || product.quantity <= 0) {
        toast.error("This item is currently out of stock.");
        return;
      }
      if (product.price <= 0) {
        toast.error("This item has no price yet. Please contact us for a quote.");
        return;
      }
      const existing = cart.find((item) => item.id === id);
      if (existing && existing.quantity >= product.quantity) {
        toast.error(`Only ${product.quantity} available.`);
        return;
      }
      setCart((current) => {
        const existing = current.find((item) => item.id === id);
        return existing
          ? current.map((item) => item.id === id ? { ...item, quantity: item.quantity + 1 } : item)
          : [...current, { id, quantity: 1 }];
      });
      setDrawerOpen(true);
      toast.success("Added to your bag");
    },
    changeQuantity: (id, quantity) => {
      const product = products.find((item) => item.id === id);
      if (quantity > 0 && !product) {
        toast.error("This item is no longer in the live catalog.");
        return;
      }
      if (quantity > 0 && product && quantity > product.quantity) {
        toast.error(`Only ${product.quantity} available.`);
        return;
      }
      setCart((current) => quantity < 1
        ? current.filter((item) => item.id !== id)
        : current.map((item) => item.id === id ? { ...item, quantity } : item));
    },
    toggleWishlist: (id) => setWishlist((current) => {
      const exists = current.includes(id);
      toast.success(exists ? "Removed from your wishlist" : "Saved to your wishlist");
      return exists ? current.filter((item) => item !== id) : [...current, id];
    }),
    toggleCompare: (id) => setCompare((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 3) {
        toast.error("Compare up to three products");
        return current;
      }
      return [...current, id];
    }),
    remember,
    setDrawerOpen,
    toggleDark: () => setDark((current) => !current),
  }), [cart, wishlist, compare, recent, drawerOpen, dark, products, remember]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used inside StoreProvider");
  return value;
}

export const useWishlist = () => {
  const { wishlist, toggleWishlist } = useStore();
  return { wishlist, toggleWishlist };
};
export const useCart = () => {
  const { cart, addToCart, changeQuantity, count } = useStore();
  return { cart, addToCart, changeQuantity, count };
};
export const useCompare = () => {
  const { compare, toggleCompare } = useStore();
  return { compare, toggleCompare };
};
export const useRecentlyViewed = () => {
  const { recent, remember } = useStore();
  return { recent, remember };
};
