import { Share2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ProductGrid } from "@/components/ProductCard";
import { useCatalog } from "@/context/CatalogContext";
import { useStore } from "@/context/StoreContext";

export default function WishlistPage() {
  const { products } = useCatalog();
  const { wishlist } = useStore();
  const [searchParams] = useSearchParams();
  const sharedItems = searchParams.get("items");
  const sharedIds = sharedItems ? new Set(sharedItems.split(",").filter(Boolean)) : null;
  const visibleIds = sharedIds ?? new Set(wishlist);
  const items = products.filter((product) => visibleIds.has(product.id));
  const isSharedList = sharedIds !== null;

  const shareWishlist = async () => {
    if (items.length === 0) return;
    const url = new URL("/wishlist", window.location.origin);
    url.searchParams.set("items", items.map((product) => product.id).join(","));

    try {
      if (navigator.share) {
        await navigator.share({ title: "My Pontypool lighting wishlist", url: url.toString() });
        return;
      }
      if (!navigator.clipboard) throw new Error("Clipboard access is unavailable.");
      await navigator.clipboard.writeText(url.toString());
      toast.success("Shareable wishlist link copied");
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      toast.error("Could not share your wishlist. Please try again.");
    }
  };

  return (
    <main className="narrow-page">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">{isSharedList ? "A little inspiration" : "Your saved pieces"}</p>
          <h1 className="mt-3 font-serif text-5xl">
            {isSharedList ? "A shared wishlist" : "Your wishlist"}
          </h1>
          <p className="mt-3 text-sm text-[var(--muted)]">
            {items.length} {items.length === 1 ? "piece" : "pieces"} saved for later.
          </p>
        </div>
        {!isSharedList && items.length > 0 && (
          <button type="button" className="button-light" onClick={() => void shareWishlist()}>
            <Share2 size={16} /> Share wishlist
          </button>
        )}
      </div>
      {items.length > 0 ? (
        <div className="mt-10">
          <ProductGrid items={items} />
        </div>
      ) : (
        <div className="empty-catalog-state mt-10">
          <p className="font-serif text-2xl">
            {isSharedList ? "Those saved pieces aren’t available right now." : "Your wishlist is waiting for a little light."}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Save a few favourites and they’ll be waiting here.
          </p>
          <a className="button-dark mt-5" href="/shop">Explore lighting</a>
        </div>
      )}
    </main>
  );
}
