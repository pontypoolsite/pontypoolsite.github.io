import { useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { formatProductPrice } from "@/config/site";
import { useStore } from "@/context/StoreContext";
import type { Product } from "@/data/products";

function ProductImage({ product, className = "" }: { product: Product; className?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed || !product.images[0]) {
    return (
      <div className={`product-placeholder ${className}`}>
        <span className="bulb-mark">✳</span>
        <span>{product.name}</span>
      </div>
    );
  }

  return (
    <img
      className={`catalog-product-image ${className}`}
      src={product.images[0]}
      onError={() => setFailed(true)}
      alt={product.name}
      loading="lazy"
    />
  );
}

export function ProductCard({ product, list = false }: { product: Product; list?: boolean }) {
  const { wishlist, toggleWishlist, addToCart } = useStore();
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const saved = wishlist.includes(product.id);

  const shareProduct = async () => {
    const url = `${window.location.origin}/product/${product.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Product link copied");
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      toast.error("Could not share this product link.");
    }
  };

  return (
    <article className={`product-card group ${list ? "product-card-list" : ""}`}>
      <div className="product-visual">
        <Link to={`/product/${product.slug}`} aria-label={`View ${product.name}`}>
          <ProductImage product={product} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        </Link>
        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          aria-label={saved ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={saved}
          className="product-save-button absolute right-3 top-3 rounded-full bg-white p-2"
        >
          <Heart size={17} fill={saved ? "#f2c300" : "none"} />
        </button>
        <div className="quick-button flex gap-2">
          <button type="button" className="flex-1" onClick={() => setQuickViewOpen(true)}>
            Quick view
          </button>
          <button
            type="button"
            className="flex-1 border-l"
            disabled={product.quantity <= 0 || product.price <= 0}
            onClick={() => addToCart(product.id)}
          >
            {product.price <= 0 ? "Ask for price" : product.quantity > 0 ? "Add to bag" : "Out of stock"}
          </button>
        </div>
      </div>

      <div className="product-card-copy">
        <Link to={`/product/${product.slug}`} className="min-w-0">
          <h3 className="mt-4 text-sm">{product.name}</h3>
          <p className="mt-1 text-xs text-[#817d74]">
            {product.finishes.length ? `${product.finishes[0]} · ${product.category}` : product.category}
          </p>
          <p className="mt-2 text-sm">{formatProductPrice(product.salePrice ?? product.price)}</p>
          <p className="mt-1 text-[10px] text-[var(--muted)]">
            {product.quantity > 0 ? `${product.quantity} available` : "Out of stock"}
          </p>
        </Link>
        <button
          type="button"
          onClick={() => void shareProduct()}
          className="product-share-link mt-5 text-[10px] text-[var(--muted)]"
          aria-label={`Share ${product.name}`}
        >
          Share
        </button>
      </div>

      {quickViewOpen && createPortal(
        <div
          className="fixed inset-0 z-[75] grid place-items-center overflow-y-auto bg-black/45 p-3 sm:p-6"
          onClick={() => setQuickViewOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${product.name} quick view`}
            className="grid max-h-[90vh] w-full max-w-3xl grid-cols-1 gap-5 overflow-y-auto rounded-2xl bg-[var(--surface)] p-4 shadow-xl sm:grid-cols-2 sm:gap-8 sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <ProductImage product={product} className="aspect-[4/3] w-full rounded-xl object-cover" />
            <div className="min-w-0 sm:py-1">
              <button
                type="button"
                className="float-right ml-3 text-2xl leading-none"
                aria-label="Close quick view"
                onClick={() => setQuickViewOpen(false)}
              >
                ×
              </button>
              <p className="eyebrow">{product.category}</p>
              <h2 className="mt-3 break-words font-serif text-2xl sm:text-3xl">{product.name}</h2>
              <p className="mt-3">{formatProductPrice(product.salePrice ?? product.price)}</p>
              <p className="my-5 break-words text-sm leading-6 text-[var(--muted)]">
                {product.description || "Contact us for more product details."}
              </p>
              <p className="break-words text-xs">
                {product.finishes.length ? `Finish: ${product.finishes.join(" · ")}` : "Finish details available on request."}
              </p>
              <button
                type="button"
                className="button-dark mt-5 w-full"
                disabled={product.quantity <= 0 || product.price <= 0}
                onClick={() => {
                  addToCart(product.id);
                  setQuickViewOpen(false);
                }}
              >
                {product.price <= 0 ? "Ask for a price" : product.quantity > 0 ? "Add to bag" : "Out of stock"}
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </article>
  );
}

export function ProductGrid({ items, list = false }: { items: Product[]; list?: boolean }) {
  return (
    <div className={list ? "product-grid-list" : "product-grid"}>
      {items.map((product) => <ProductCard key={product.id} product={product} list={list} />)}
    </div>
  );
}
