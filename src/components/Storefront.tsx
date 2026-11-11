import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUp, Check, ChevronDown, Command, Heart, Instagram, Menu, Moon, Search, ShoppingBag, Sun, X, Home, SlidersHorizontal } from "lucide-react";
import { useCatalog } from "@/context/CatalogContext";
import { formatPrice, formatProductPrice, site, whatsappUrl } from "@/config/site";
import { useStore } from "@/context/StoreContext";
const menus:Record<string,string[]>={"Chandeliers & Pendants":["Chandeliers","Pendants","Mini Pendants","Linear Suspensions"],"Wall Lights":["Wall Brackets","Sconces","Picture Lights","Outdoor Wall Lights"],"Ceiling Lights":["Flush Mounts","Semi-Flush","Recessed","Track Lighting"],Lamps:["Table Lamps","Floor Lamps","Desk Lamps"],"Light Bulbs":["Edison / Vintage","LED","Smart Bulbs","Decorative"]};const linkFor=(n:string)=>`/shop/${encodeURIComponent(n)}`;
const headerNotices = [
  site.announcement,
  "Delivery coverage and fees are confirmed in chat.",
  "Need a hand? Our lighting consultants are here for you.",
];
function SearchBox(){const {products}=useCatalog();const[query,setQuery]=useState("");const[active,setActive]=useState(0);const navigate=useNavigate();const suggestions=products.filter(p=>`${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase())).slice(0,5);const submit=(value=query)=>{if(!value.trim())return;const searches=JSON.parse(localStorage.getItem("pontypool-searches")||"[]") as string[];localStorage.setItem("pontypool-searches",JSON.stringify([value,...searches.filter(x=>x!==value)].slice(0,5)));navigate(`/search?q=${encodeURIComponent(value)}`);setQuery("")};return <div className="relative hidden max-w-[570px] flex-1 md:block"><label className="flex items-center gap-3 border-b border-[#dedbd4] py-2 text-[#77746d]"><Search size={18}/><input aria-label="Search products" className="w-full bg-transparent text-sm outline-none" placeholder="Search lighting, styles and more" value={query} onFocus={()=>setActive(0)} onChange={e=>{setQuery(e.target.value);setActive(0)}} onKeyDown={e=>{if(e.key==="ArrowDown"){e.preventDefault();setActive(v=>Math.min(v+1,suggestions.length-1))}if(e.key==="ArrowUp"){e.preventDefault();setActive(v=>Math.max(v-1,0))}if(e.key==="Enter"){e.preventDefault();if(suggestions[active])navigate(`/product/${suggestions[active].slug}`);else submit()}}}/></label>{query&&<div className="absolute left-0 right-0 top-full z-[70] overflow-hidden rounded-b-xl border border-[var(--line)] bg-[var(--surface)] shadow-xl"><p className="px-4 pt-4 text-[9px] uppercase tracking-[.17em] text-[var(--muted)]">Suggestions</p>{suggestions.length?suggestions.map((p,i)=><Link key={p.id} onClick={()=>setQuery("")} to={`/product/${p.slug}`} className={`flex items-center gap-3 px-4 py-3 text-sm ${active===i?"bg-[var(--wash)]":""}`}><span className="grid h-11 w-10 place-items-center rounded bg-[#f0eee8] text-[#b18b00]">✳</span><span className="flex-1">{p.name}<small className="block text-xs text-[var(--muted)]">{p.category}</small></span><span>{formatProductPrice(p.price)}</span></Link>):<p className="px-4 py-4 text-sm text-[var(--muted)]">No matching lights yet.</p>}<div className="flex gap-2 border-t p-3">{["Pendants","Chandeliers","LED bulbs"].map(x=><button key={x} onClick={()=>submit(x)} className="rounded-full bg-[var(--wash)] px-3 py-1 text-[10px]">{x}</button>)}</div></div>}</div>}
function CommandPalette({close}:{close:()=>void}){const[n,setN]=useState("");const navigate=useNavigate();const items=[["Home","/"],["Shop all lighting","/shop"],["Chandeliers","/shop/Chandeliers"],["Pendants","/shop/Pendants"],["Wall lights","/shop/Wall%20Brackets"],["Outdoor","/shop/Outdoor"],["Inspiration","/inspiration"],["Sale","/sale"],["Contact","/contact"],["Wishlist","/wishlist"]].filter(x=>x[0].toLowerCase().includes(n.toLowerCase()));return <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/45 p-4 pt-[15vh]" onClick={close}><div className="w-full max-w-xl rounded-2xl bg-[var(--surface)] p-3 shadow-2xl" onClick={e=>e.stopPropagation()}><div className="flex items-center gap-3 border-b px-3"><Command size={17}/><input autoFocus value={n} onChange={e=>setN(e.target.value)} placeholder="Where would you like to go?" className="h-12 flex-1 bg-transparent text-sm outline-none"/><button onClick={close}><X size={17}/></button></div>{items.map(([label,path])=><button key={path} onClick={()=>{navigate(path);close()}} className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm hover:bg-[var(--wash)]">{label}<ArrowRight size={15}/></button>)}<p className="px-4 py-2 text-[10px] text-[var(--muted)]">Navigate anywhere · Esc to close</p></div></div>}
export function Header() {
  const { count, dark, toggleDark } = useStore();
  const [mobile, setMobile] = useState(false);
  const [open, setOpen] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [palette, setPalette] = useState(false);
  const [notice, setNotice] = useState(0);

  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 25);
    const hotkey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPalette(true);
      }
      if (event.key === "Escape") setPalette(false);
    };
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("keydown", hotkey);
    const interval = window.setInterval(() => setNotice((current) => (current + 1) % headerNotices.length), 4500);
    return () => {
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("keydown", hotkey);
      window.clearInterval(interval);
    };
  }, []);

  const navigation = ["All lighting", ...Object.keys(menus), "Outdoor", "Inspiration", "Sale"];
  const destination = (name: string) => (
    name === "All lighting" ? "/shop"
      : name === "Inspiration" ? "/inspiration"
        : name === "Sale" ? "/sale"
          : linkFor(name)
  );

  return (
    <>
      <header className={`sticky top-0 z-50 bg-[var(--surface)] transition-shadow ${scrolled ? "shadow-[0_8px_24px_rgba(33,29,20,.07)]" : ""}`}>
        <div className="notice-bar">{headerNotices[notice]}</div>
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-5 py-3 md:px-10">
          <button className="md:hidden" aria-label="Toggle menu" onClick={() => setMobile(!mobile)}>
            {mobile ? <X /> : <Menu />}
          </button>
          <Link to="/" aria-label="Pontypool home" className="w-[145px] shrink-0 md:w-[190px]">
            <img className="w-full rounded" src={dark ? "/images/pontypool-logo-dark.png" : "/images/pontypool-logo.jpeg"} alt="Pontypool Electricals & Lighting" />
          </Link>
          <SearchBox />
          <div className="flex items-center gap-3 md:gap-5">
            <button onClick={() => setPalette(true)} aria-label="Open command menu" className="hidden rounded-full p-2 text-[var(--muted)] hover:bg-[var(--wash)] md:block">
              <Command size={17} />
            </button>
            <button onClick={toggleDark} aria-label={dark ? "Use light showroom" : "Use dark showroom"} className="rounded-full p-2 hover:bg-[var(--wash)]">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link className="hidden text-xs tracking-wide lg:block" to="/account">Log in</Link>
            <Link aria-label="Wishlist" to="/wishlist" className="relative"><Heart size={19} /></Link>
            <button aria-label={`Cart, ${count} items`} onClick={() => window.dispatchEvent(new Event("ponty:open-cart"))} className="relative">
              <ShoppingBag size={20} />
              <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-[#f2c300] px-1 text-[10px]">{count}</span>
            </button>
          </div>
        </div>
        <nav aria-label="Main navigation" className="hidden border-t border-[var(--line)] md:block" onMouseLeave={() => setOpen("")}>
          <div className="mx-auto flex max-w-[1400px] justify-center gap-8 px-8">
            {navigation.map((name) => (
              <div key={name} onMouseEnter={() => setOpen(menus[name] ? name : "")}>
                <Link to={destination(name)} aria-expanded={open === name} className={`flex items-center gap-1 py-3.5 text-[10px] uppercase tracking-[.14em] ${name === "Sale" ? "text-[#a17a00]" : ""}`}>
                  {name}{menus[name] && <ChevronDown size={12} />}
                </Link>
              </div>
            ))}
          </div>
          {open && (
            <div className="absolute left-0 right-0 top-full border-t border-[var(--line)] bg-[var(--surface)] shadow-xl">
              <div className="mx-auto grid max-w-[1200px] grid-cols-4 gap-10 px-10 py-9">
                <div>
                  <p className="eyebrow mb-4">Explore {open}</p>
                  <Link className="font-serif text-2xl" to={linkFor(open)}>Shop all {open}<ArrowRight className="ml-2 inline" size={17} /></Link>
                </div>
                {[0, 1].map((column) => (
                  <div key={column} className="space-y-3">
                    {(menus[open] ?? []).slice(column * 2, column * 2 + 2).map((item) => (
                      <Link key={item} className="block text-sm text-[var(--muted)] hover:text-[#a17a00]" to={linkFor(item)}>{item}</Link>
                    ))}
                  </div>
                ))}
                <div className="overflow-hidden rounded-xl bg-[#f7f4ec]">
                  <img className="h-32 w-full object-cover" src="https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=550&q=80" alt="A warmly lit pendant" />
                </div>
              </div>
            </div>
          )}
        </nav>
        {mobile && (
          <nav className="max-h-[68vh] overflow-auto border-t bg-[var(--surface)] p-5 md:hidden">
            <Link onClick={() => setMobile(false)} className="block border-b py-4 text-sm" to="/shop">All lighting</Link>
            {[...Object.keys(menus), "Outdoor", "Inspiration", "Sale"].map((name) => (
              <div key={name} className="border-b border-[var(--line)]">
                {menus[name] ? (
                  <button onClick={() => setOpen(open === name ? "" : name)} className="flex w-full items-center justify-between py-4 text-left text-sm" aria-expanded={open === name}>
                    {name}<ChevronDown size={16} />
                  </button>
                ) : (
                  <Link onClick={() => setMobile(false)} className="block py-4 text-sm" to={destination(name)}>{name}</Link>
                )}
                {open === name && (
                  <div className="pb-4 pl-4">
                    {(menus[name] ?? []).map((item) => (
                      <Link onClick={() => setMobile(false)} className="block py-2 text-sm text-[var(--muted)]" to={linkFor(item)} key={item}>{item}</Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        )}
      </header>
      {palette && <CommandPalette close={() => setPalette(false)} />}
    </>
  );
}
export function Footer(){const {dark}=useStore();const[email,setEmail]=useState("");return <footer className="mt-20 bg-[var(--wash)] text-[var(--ink)]"><div className="mx-auto max-w-[1300px] px-6 py-14 md:px-10"><div className="grid gap-10 border-b border-[var(--line)] pb-12 md:grid-cols-2"><div><span className="eyebrow">A little light in your inbox</span><h2 className="mt-3 font-serif text-3xl">Thoughtful lighting, thoughtfully delivered.</h2></div><form onSubmit={e=>{e.preventDefault();setEmail("")}} className="flex self-center border-b border-[#bdb8ad]"><input required type="email" aria-label="Email for newsletter" placeholder="Your email address" value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-transparent py-3 text-sm outline-none"/><button aria-label="Subscribe"><ArrowRight/></button></form></div><div className="grid grid-cols-2 gap-9 py-12 md:grid-cols-5"><div className="col-span-2 md:col-span-1"><img src={dark ? "/images/pontypool-logo-dark.png" : "/images/pontypool-logo.jpeg"} alt="Pontypool" className="mb-4 w-40 rounded"/><p className="text-sm leading-6 text-[var(--muted)]">Lighting that brings a little more feeling to every room.</p></div>{[["Shop",["Chandeliers","Pendants","Wall Brackets","Lamps","Outdoor"]],["Help",["Contact us","Delivery & returns","FAQs","Lighting advice"]],["Company",["Our story","Inspiration","Trade"]]].map(([title,links])=><div key={title as string}><h3 className="mb-4 text-xs uppercase tracking-[.16em]">{title}</h3>{(links as string[]).map(item=><Link key={item} className="mb-3 block text-sm text-[var(--muted)] hover:text-[var(--ink)]" to={item==="Our story"?"/about":item==="Inspiration"?"/inspiration":item==="Contact us"?"/contact":item==="FAQs"?"/faq":item==="Delivery & returns"?"/delivery":linkFor(item)}>{item}</Link>)}</div>)}<div><h3 className="mb-4 text-xs uppercase tracking-[.16em]">Come say hello</h3><p className="text-sm leading-7 text-[var(--muted)]">Ask our team about stock, pricing and delivery details.</p>{site.whatsappNumber&&<a className="mt-3 block text-sm underline" href={whatsappUrl("Hello Pontypool, I have a question about your lighting.")} target="_blank" rel="noreferrer">Message us on WhatsApp</a>}{site.instagramUrl&&<a className="mt-3 inline-flex" href={site.instagramUrl} target="_blank" rel="noreferrer" aria-label="Pontypool on Instagram"><Instagram size={18}/></a>}</div></div><div className="flex flex-col justify-between gap-3 border-t border-[var(--line)] pt-6 text-xs text-[var(--muted)] md:flex-row"><span>© {new Date().getFullYear()} Pontypool Electricals & Lighting</span><span>Prices, availability and delivery fees are confirmed by our team before payment.</span></div></div></footer>}
export function CartDrawer(){const {products}=useCatalog();const{cart,changeQuantity,drawerOpen,setDrawerOpen}=useStore();const[open,setOpen]=useState(drawerOpen);const items=cart.map(line=>({line,p:products.find(p=>p.id===line.id)})).filter(x=>x.p);const subtotal=items.reduce((s,x)=>s+(x.p!.salePrice??x.p!.price)*x.line.quantity,0);useEffect(()=>setOpen(drawerOpen),[drawerOpen]);useEffect(()=>{const fn=()=>setDrawerOpen(true);window.addEventListener("ponty:open-cart",fn);return()=>window.removeEventListener("ponty:open-cart",fn)},[setDrawerOpen]);return open?<div className="fixed inset-0 z-[80] bg-black/35" onClick={()=>setDrawerOpen(false)}><aside className="ml-auto flex h-full w-full max-w-md flex-col bg-[var(--surface)] p-6 shadow-2xl animate-drawer" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between border-b border-[var(--line)] pb-5"><h2 className="font-serif text-3xl">Your bag <span className="text-base">({items.length})</span></h2><button aria-label="Close cart" onClick={()=>setDrawerOpen(false)}><X/></button></div><p className="mt-5 text-xs text-[var(--muted)]">Delivery coverage, fee and timing will be confirmed in your chat with us.</p><div className="flex-1 overflow-auto">{items.length?items.map(({line,p})=><div key={line.id} className="flex gap-4 border-b border-[var(--line)] py-5"><div className="grid h-24 w-20 place-items-center bg-[var(--wash)] text-2xl text-[#b18b00]">✳</div><div className="flex-1"><h3 className="font-serif text-lg">{p!.name}</h3><p className="mt-1 text-xs text-[var(--muted)]">{formatProductPrice(p!.salePrice??p!.price)}</p><div className="mt-3 flex items-center gap-4"><button onClick={()=>changeQuantity(p!.id,line.quantity-1)} aria-label="Decrease quantity">−</button>{line.quantity}<button disabled={line.quantity>=p!.quantity} onClick={()=>changeQuantity(p!.id,line.quantity+1)} aria-label="Increase quantity">+</button></div></div></div>):<p className="py-12 text-center font-serif text-xl">Your bag is waiting for a little light.</p>}</div><div className="border-t border-[var(--line)] pt-5"><p className="flex justify-between text-sm"><span>Items subtotal</span><strong>{formatPrice(subtotal)}</strong></p><Link onClick={()=>setDrawerOpen(false)} to="/cart" className="button-dark mt-5 w-full">Review bag & request an order <ArrowRight size={16}/></Link><button onClick={()=>setDrawerOpen(false)} className="mt-4 w-full text-xs underline">Continue shopping</button></div></aside></div>:null}
export function BottomNav(){const{pathname}=useLocation();if(pathname==="/checkout")return null;return <nav className="bottom-nav md:hidden" aria-label="Quick navigation">{[[Home,"Home","/"],[SlidersHorizontal,"Shop","/shop"],[Search,"Search","/search"],[Heart,"Saved","/wishlist"],[ShoppingBag,"Bag","/cart"]].map(([Icon,label,to])=>{const I=Icon as typeof Home;return <Link key={label as string} to={to as string}><I size={18}/><span>{label as string}</span></Link>})}</nav>}
export function SupportFloat(){const{pathname}=useLocation();const href=whatsappUrl("Hello Pontypool, I’d like some lighting advice.");if(pathname==="/checkout"||!href)return null;return <a className="support-float" href={href} target="_blank" rel="noreferrer" aria-label="Chat with a lighting consultant on WhatsApp">✆ <span>Need lighting advice?</span></a>}
export function BackToTop(){const[visible,setVisible]=useState(false);useEffect(()=>{const f=()=>setVisible(window.scrollY>500);window.addEventListener("scroll",f,{passive:true});return()=>window.removeEventListener("scroll",f)},[]);return visible?<button onClick={()=>window.scrollTo({top:0,behavior:"smooth"})} aria-label="Back to top" className="fixed bottom-20 right-5 z-40 rounded-full bg-[#f2c300] p-3 shadow-lg md:bottom-6"><ArrowUp size={18}/></button>:null}
export function Preloader(){const {dark}=useStore();const[show,setShow]=useState(()=>!sessionStorage.getItem("pontypool-intro"));useEffect(()=>{if(!show)return;const timer=window.setTimeout(()=>{setShow(false);sessionStorage.setItem("pontypool-intro","1")},900);return()=>window.clearTimeout(timer)},[show]);return show?<div className="preloader" aria-label="Loading Pontypool"><img src={dark ? "/images/pontypool-logo-dark.png" : "/images/pontypool-logo.jpeg"} alt="Pontypool"/><span className="preloader-bulb">✳</span></div>:null}
export const CloseButton=X;export const CheckIcon=Check;
