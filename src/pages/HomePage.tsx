import { lazy, Suspense, useState } from "react";
import { ArrowRight, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { ProductGrid } from "@/components/ProductCard";
import { useCatalog } from "@/context/CatalogContext";
import { useStore } from "@/context/StoreContext";
import "@/components/Showroom.css";

const RoomScene = lazy(() => import("@/components/RoomScene3D"));

const photo = (id: string, width = 900) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`;

const rooms = [
  { name: "Living room", image: "photo-1600210492486-724fe5c67fb0" },
  { name: "Bedroom", image: "photo-1616486338812-3dadae4b4ace" },
  { name: "Kitchen", image: "photo-1600607687939-ce8a6c25118c" },
  { name: "Dining", image: "photo-1600210492486-724fe5c67fb0" },
  { name: "Outdoor", image: "photo-1600566753086-00f18fb6b3ea" },
  { name: "Office", image: "photo-1497366754035-f200968a6e72" },
];

const styles = ["Modern", "Traditional", "Industrial", "Vintage", "Minimalist"];

function RoomLightingStudio() {
  const [temperature, setTemperature] = useState(2700);
  const [brightness, setBrightness] = useState(65);
  const [fixture, setFixture] = useState("Pendant");
  const [sceneEnabled, setSceneEnabled] = useState(false);

  return (
    <section className="room-studio">
      <div className="room-studio-copy">
        <p className="eyebrow">A little 3D inspiration</p>
        <h2 className="mt-2 font-serif text-4xl">Find your room’s glow.</h2>
        <p className="mt-3 max-w-md text-sm leading-7 text-[var(--muted)]">
          Explore a softly lit room. Drag to look around, then adjust the fixture,
          colour temperature and brightness to set the mood.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {["Pendant", "Chandelier", "Wall light"].map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setFixture(item)}
              aria-pressed={fixture === item}
              className={`rounded-full border px-4 py-2 text-xs transition ${
                fixture === item
                  ? "border-[#c99f00] bg-[#f2c30022]"
                  : "border-[var(--line)] hover:border-[var(--ink)]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        <label className="mt-6 block text-xs">
          Colour temperature · {temperature}K
          <input
            className="mt-2 block w-full accent-[#d7a900]"
            type="range"
            min="2700"
            max="6500"
            step="100"
            value={temperature}
            onChange={(event) => setTemperature(Number(event.target.value))}
          />
        </label>
        <label className="mt-5 block text-xs">
          Brightness · {brightness}%
          <input
            className="mt-2 block w-full accent-[#d7a900]"
            type="range"
            min="10"
            max="100"
            value={brightness}
            onChange={(event) => setBrightness(Number(event.target.value))}
          />
        </label>
        <Link
          to={`/shop?room=${encodeURIComponent("Living room")}`}
          className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-widest"
        >
          Shop lights for your room <ArrowRight size={15} />
        </Link>
      </div>
      <div className="room-studio-canvas">
        {sceneEnabled ? (
          <Suspense fallback={<div className="room-scene-loading" role="status">Preparing the room…</div>}>
            <RoomScene temperature={temperature} brightness={brightness} fixture={fixture} />
          </Suspense>
        ) : (
          <div className="room-scene-poster">
            <div className="room-scene-poster-window" />
            <div className="room-scene-poster-lamp" />
            <div className="room-scene-poster-sofa" />
            <button type="button" className="button-dark" onClick={() => setSceneEnabled(true)}>
              Open interactive 3D room
            </button>
          </div>
        )}
        <span className="room-studio-hint">Drag to explore</span>
      </div>
    </section>
  );
}

export default function HomePage() {
  const { products, categories } = useCatalog();
  const { recent } = useStore();

  const recentlyViewed = recent
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is (typeof products)[number] => Boolean(product))
    .slice(0, 4);
  const featuredProducts = products.slice(0, 8);

  return (
    <>
      <section className="hero-wrap">
        <div className="hero-copy">
          <p className="eyebrow">A brighter kind of home</p>
          <h1>Light that<br />makes a <em>home.</em></h1>
          <p className="mt-6 max-w-md text-[15px] leading-7 text-[#716d64]">
            Considered lighting, chosen for the way you live. Discover pieces
            that make every day feel a little warmer.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/shop" className="button-dark">Shop lighting <ArrowRight size={16} /></Link>
            <a href="#room-studio" className="button-light">Explore the showroom</a>
          </div>
          <div className="mt-12 flex items-center gap-3 text-xs text-[#77746d]">
            <span className="flex text-[#b58b14]" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((index) => <Star key={index} size={13} fill="currentColor" />)}
            </span>
            Thoughtfully chosen. Made to last.
          </div>
        </div>
        <div className="hero-art">
          <img
            src={photo("photo-1600210492486-724fe5c67fb0", 1100)}
            alt="Warmly illuminated living room"
            className="hero-interior"
          />
          <div className="static-bulb" aria-hidden="true"><span /></div>
          <span className="hero-art-label">A softer glow, made possible.</span>
        </div>
        <div className="hero-note">01 — THE LIGHT EDIT</div>
      </section>

      <section className="page-section">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="eyebrow">Find your feeling</p>
            <h2 className="mt-2 font-serif text-3xl md:text-4xl">Shop by category</h2>
          </div>
          <Link to="/shop" className="hidden items-center gap-2 text-xs uppercase tracking-widest md:flex">
            View all lighting <ArrowRight size={15} />
          </Link>
        </div>
        <div className="category-grid grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-4">
          {categories.map((category, index) => (
            <Link
              key={category.id}
              to={`/shop/${encodeURIComponent(category.name)}`}
              className="category-tile"
            >
              <img
                src={category.imageUrl || photo(rooms[index % rooms.length].image, 650)}
                alt={`${category.name} collection`}
                loading="lazy"
              />
              <span>{category.name}<ArrowRight size={16} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="page-section room-browse-section">
        <div className="mb-8">
          <p className="eyebrow">Designed around the way you live</p>
          <h2 className="mt-2 font-serif text-3xl md:text-4xl">Shop by room</h2>
        </div>
        <div className="room-collection-grid">
          {rooms.map((room) => (
            <Link
              key={room.name}
              to={`/shop?room=${encodeURIComponent(room.name)}`}
              className="room-collection-tile"
            >
              <img src={photo(room.image, 700)} alt="" loading="lazy" />
              <span>{room.name}<ArrowRight size={16} /></span>
            </Link>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <span className="eyebrow mr-2">Shop by style</span>
          {styles.map((style) => (
            <Link
              key={style}
              to={`/shop?style=${encodeURIComponent(style)}`}
              className="style-chip"
            >
              {style}
            </Link>
          ))}
        </div>
      </section>

      <div id="room-studio">
        <RoomLightingStudio />
      </div>

      {recentlyViewed.length > 0 && (
        <section className="page-section">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="eyebrow">Pick up where you left off</p>
              <h2 className="mt-2 font-serif text-3xl md:text-4xl">Recently viewed</h2>
            </div>
          </div>
          <ProductGrid items={recentlyViewed} />
        </section>
      )}

      <section className="page-section bg-[#f7f5f0]">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="eyebrow">The Pontypool edit</p>
            <h2 className="mt-2 font-serif text-3xl md:text-4xl">Light for the everyday</h2>
          </div>
          <Link to="/shop" className="hidden items-center gap-2 text-xs uppercase tracking-widest md:flex">
            Discover all <ArrowRight size={15} />
          </Link>
        </div>
        <ProductGrid items={featuredProducts} />
      </section>

      <section className="page-section">
        <div className="collection-banner">
          <img
            src={photo("photo-1513506003901-1e6a229e2d15", 1300)}
            alt="Warm pendant lighting over a dining table"
            loading="lazy"
          />
          <div>
            <p className="eyebrow">Made for slow evenings</p>
            <h2 className="mt-3 font-serif text-4xl md:text-5xl">The art of<br />coming home.</h2>
            <p className="mt-5 max-w-sm text-sm leading-7 text-[#77746d]">
              Pieces that bring a room together. Explore warm metals,
              sculptural forms and light that lingers.
            </p>
            <Link to="/shop/Pendants" className="button-dark mt-7">
              Explore the collection <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
