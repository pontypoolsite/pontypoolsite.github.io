import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

type CartLine = { id: string; quantity: number };
type StoreContextValue = { cart: CartLine[]; wishlist: string[]; addToCart: (id: string) => void; changeQuantity: (id: string, quantity: number) => void; toggleWishlist: (id: string) => void; count: number };
const StoreContext = createContext<StoreContextValue | null>(null);
const read = <T,>(key: string, fallback: T): T => { try { const saved = localStorage.getItem(key); return saved ? JSON.parse(saved) as T : fallback; } catch { return fallback; } };
export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>(() => read("pontypool-cart", []));
  const [wishlist, setWishlist] = useState<string[]>(() => read("pontypool-wishlist", []));
  useEffect(() => { localStorage.setItem("pontypool-cart", JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem("pontypool-wishlist", JSON.stringify(wishlist)); }, [wishlist]);
  const value = useMemo(() => ({ cart, wishlist, count: cart.reduce((sum, line) => sum + line.quantity, 0), addToCart: (id: string) => { setCart((current) => { const found = current.find((line) => line.id === id); return found ? current.map((line) => line.id === id ? { ...line, quantity: line.quantity + 1 } : line) : [...current, { id, quantity: 1 }]; }); toast.success("Added to your bag"); }, changeQuantity: (id: string, quantity: number) => setCart((current) => quantity <= 0 ? current.filter((line) => line.id !== id) : current.map((line) => line.id === id ? { ...line, quantity } : line)), toggleWishlist: (id: string) => setWishlist((current) => { const exists = current.includes(id); toast.success(exists ? "Removed from your wishlist" : "Saved to your wishlist"); return exists ? current.filter((item) => item !== id) : [...current, id]; }) }), [cart, wishlist]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
export function useStore() { const value = useContext(StoreContext); if (!value) throw new Error("useStore must be used inside StoreProvider"); return value; }
