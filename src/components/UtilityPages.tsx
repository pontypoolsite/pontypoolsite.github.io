import { lazy, Suspense, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { useCatalog } from "@/context/CatalogContext";
import { formatPrice } from "@/config/site";
import type { DeliveryPoint } from "@/components/LocationAutocomplete";
import { submitStorefrontOrder } from "@/lib/catalog-api";
import "./UtilityPages.css";

const LocationAutocomplete = lazy(() => import("@/components/LocationAutocomplete").then((module) => ({
  default: module.LocationAutocomplete,
})));

function addBusinessDays(from: Date, count: number): string {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let added = 0;
  while (added < count) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) added += 1;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function deliveryDateOptions(firstDate: string, offset: number, count: number): string[] {
  const [year, month, day] = firstDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dates: string[] = [];
  let weekdaysSkipped = 0;

  while (weekdaysSkipped < offset) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) weekdaysSkipped += 1;
  }

  while (dates.length < count) {
    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) {
      dates.push(date.toISOString().slice(0, 10));
    }
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return dates;
}

function formatDeliveryDateOption(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return {
    weekday: new Intl.DateTimeFormat("en-KE", { weekday: "short", timeZone: "UTC" }).format(date),
    day: new Intl.DateTimeFormat("en-KE", { day: "numeric", timeZone: "UTC" }).format(date),
    month: new Intl.DateTimeFormat("en-KE", { month: "short", timeZone: "UTC" }).format(date),
  };
}

function formatDeliveryDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-KE", { dateStyle: "full" })
    .format(new Date(year, month - 1, day));
}

function formatDeliveryTime(value: string): string {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return value;
  return new Intl.DateTimeFormat("en-KE", { hour: "numeric", minute: "2-digit" })
    .format(new Date(2000, 0, 1, hours, minutes));
}

export function HelpPage({delivery=false}:{delivery?:boolean}){const questions=delivery?[["When will my order arrive?","Most in-stock pieces arrive within 3–5 working days. We’ll keep you updated as your order makes its way home."],["What does delivery cost?","Delivery is complimentary on qualifying orders. Any applicable delivery charge is shown before checkout."],["Can I return an item?","Of course. Unused items can be returned within 30 days of delivery. Please contact our team to arrange a return."],["What if my light arrives damaged?","Let us know as soon as possible and we’ll make it right. Our team will guide you through the next steps."]]:[["Can I get help choosing a light?","Our lighting consultants are happy to help with room measurements, finishes and bulb choices. Call us on 01495 000 000."],["Are bulbs included?","Bulb inclusion varies by fitting. Check the specifications on the product page for the exact details."],["Can I use a dimmer?","Many of our fittings can be dimmed with a compatible dimmable bulb and switch. Check the product specifications before choosing."],["Do you work with trade customers?","Yes. Please get in touch with our team to discuss trade support and project requirements."]];return <main className="narrow-page max-w-4xl"><p className="eyebrow">The practical details</p><h1 className="mt-3 font-serif text-5xl">{delivery?"Delivery & returns":"A few good questions."}</h1><p className="mt-4 text-sm text-[var(--muted)]">{delivery?"Clear, considered delivery and easy returns.":"A little more light on the details."}</p><div className="mt-9 space-y-3">{questions.map(([q,a])=><details key={q} className="rounded-lg border border-[var(--line)] p-5"><summary className="cursor-pointer font-serif text-xl">{q}</summary><p className="mt-4 text-sm leading-7 text-[var(--muted)]">{a}</p></details>)}</div><Link className="button-dark mt-8" to="/contact">Still have a question? <ArrowRight size={16}/></Link></main>}
export function CheckoutFlow(){
  const { cart, clearCart } = useStore();
  const { products } = useCatalog();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submissionId] = useState(() => crypto.randomUUID());
  const labels = ["Details", "Location", "Delivery", "Review"];
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" });
  const [locationPoint, setLocationPoint] = useState<DeliveryPoint | null>(null);
  const [earliestDeliveryDate] = useState(() => addBusinessDays(new Date(), 3));
  const [deliveryDate, setDeliveryDate] = useState(earliestDeliveryDate);
  const [dateOffset, setDateOffset] = useState(0);
  const [deliveryTime, setDeliveryTime] = useState("");
  const deliveryDates = deliveryDateOptions(earliestDeliveryDate, dateOffset, 5);
  const changeDatePage = (nextOffset: number) => {
    const safeOffset = Math.max(0, nextOffset);
    setDateOffset(safeOffset);
    setDeliveryDate(deliveryDateOptions(earliestDeliveryDate, safeOffset, 5)[0]);
  };
  const total = cart.reduce((sum, line) => {
    const product = products.find((item) => item.id === line.id);
    return sum + (product ? (product.salePrice ?? product.price) * line.quantity : 0);
  }, 0);
  const contact = form.email.trim() || form.phone.trim();

  const placeOrder = async () => {
    if (cart.length === 0) {
      setErrors("Your bag is empty. Add an item before sending a delivery request.");
      return;
    }

    setSubmitting(true);
    setErrors("");
    try {
      const result = await submitStorefrontOrder({
        submissionId,
        customerName: form.name,
        email: form.email,
        phone: form.phone,
        location: form.address,
        locationLatitude: locationPoint?.latitude ?? null,
        locationLongitude: locationPoint?.longitude ?? null,
        deliveryMethod: "standard",
        deliveryDate,
        deliveryTime,
        items: cart.map((line) => {
          const product = products.find((item) => item.id === line.id);
          if (!product) throw new Error("A product in your bag is no longer available.");
          return {
            productId: product.catalogId,
            variantIndex: product.variantIndex ?? null,
            quantity: line.quantity,
          };
        }),
      });
      clearCart();
      navigate(`/order-confirmation?reference=${encodeURIComponent(result.orderReference)}`);
    } catch (cause) {
      setErrors(cause instanceof Error ? cause.message : "The delivery request could not be saved.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="narrow-page">
      <p className="eyebrow">A little closer to home</p>
      <h1 className="mt-3 font-serif text-5xl">Checkout</h1>
      <div className="mt-8 grid grid-cols-4">
        {labels.map((label, index) => (
          <div
            key={label}
            className={`border-b-2 pb-3 text-xs ${index <= step ? "border-[#d6ad22] text-[var(--ink)]" : "border-[var(--line)] text-[var(--muted)]"}`}
          >
            <span className="mr-2">
              {index < step ? <Check size={13} className="inline" /> : `0${index + 1}`}
            </span>
            {label}
          </div>
        ))}
      </div>
      <div className="mt-9 grid gap-12 md:grid-cols-[1fr_340px]">
        <section>
          <h2 className="font-serif text-2xl">{labels[step]}</h2>
          {step === 0 && (
            <div className="mt-5 space-y-4">
              <label className="block text-xs">
                Full name
                <input
                  className="form-input mt-2"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  autoComplete="name"
                />
              </label>
              <label className="block text-xs">
                Email address <span className="text-[var(--muted)]">(optional)</span>
                <input
                  className="form-input mt-2"
                  value={form.email}
                  type="email"
                  autoComplete="email"
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
              </label>
              <label className="block text-xs">
                Phone number <span className="text-[var(--muted)]">(optional)</span>
                <input
                  className="form-input mt-2"
                  value={form.phone}
                  type="tel"
                  autoComplete="tel"
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                />
              </label>
              <p className="text-xs text-[var(--muted)]">Add either an email address or a phone number so we can contact you.</p>
            </div>
          )}
          {step === 1 && (
            <div className="mt-5 space-y-4">
              <div className="block text-xs">
                <label htmlFor="delivery-location">Search for your place or tap the map to pin your location</label>
                <Suspense fallback={<p className="mt-3 text-xs text-[var(--muted)]">Loading Kenya map…</p>}>
                  <LocationAutocomplete
                    value={form.address}
                    point={locationPoint}
                    onChange={(address, point) => {
                      setForm((current) => ({ ...current, address }));
                      setLocationPoint(point);
                    }}
                  />
                </Suspense>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="mt-5 space-y-4">
              <section aria-labelledby="delivery-date-heading">
                <h3 id="delivery-date-heading" className="text-sm font-semibold">Choose a delivery day</h3>
                <p className="mt-1 text-xs text-[var(--muted)]">The earliest available date is {formatDeliveryDate(earliestDeliveryDate)}.</p>
                <div className="delivery-date-options mt-4" role="group" aria-label="Available delivery days">
                  {deliveryDates.map((date) => {
                    const formatted = formatDeliveryDateOption(date);
                    const selected = date === deliveryDate;
                    return (
                      <button
                        key={date}
                        type="button"
                        aria-pressed={selected}
                        aria-label={formatDeliveryDate(date)}
                        className={`delivery-date-option ${selected ? "is-selected" : ""}`}
                        onClick={() => setDeliveryDate(date)}
                      >
                        <span className="delivery-date-weekday">{formatted.weekday}</span>
                        <span className="delivery-date-day">{formatted.day}</span>
                        <span className="delivery-date-month">{formatted.month}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    className="delivery-date-more"
                    disabled={dateOffset === 0}
                    onClick={() => changeDatePage(dateOffset - 5)}
                  >
                    <ArrowLeft size={14} /> Earlier dates
                  </button>
                  <button
                    type="button"
                    className="delivery-date-more"
                    onClick={() => changeDatePage(dateOffset + 5)}
                  >
                    More dates <ArrowRight size={14} />
                  </button>
                </div>
              </section>

              <section aria-labelledby="delivery-time-heading" className="pt-3">
                <h3 id="delivery-time-heading" className="text-sm font-semibold">What time works best?</h3>
                <p className="mt-1 text-xs text-[var(--muted)]">Choose any time that suits you.</p>
                <label htmlFor="delivery-time" className="delivery-time-label mt-4">Preferred delivery time</label>
                <input
                  id="delivery-time"
                  className="form-input delivery-time-input mt-2"
                  type="time"
                  value={deliveryTime}
                  onChange={(event) => setDeliveryTime(event.target.value)}
                />
                <p className="mt-3 text-xs text-[var(--muted)]">We’ll contact you to confirm availability. Your preferred time isn’t reserved yet.</p>
              </section>
            </div>
          )}
          {step === 3 && (
            <div className="mt-5 rounded-lg bg-[var(--wash)] p-5 text-sm leading-7">
              <p>Location: {form.address}</p>
              <p className="mt-2 text-xs text-[var(--muted)]">Your map location is selected.</p>
              <p className="mt-4">We’ll save this delivery request and contact you at {contact} to confirm availability. Your preferred delivery is
              {" "}{deliveryDate ? formatDeliveryDate(deliveryDate) : "not selected"}
              {" "}at {deliveryTime ? formatDeliveryTime(deliveryTime) : "no time selected"}.
              {" "}This does not reserve a slot or take payment.</p>
            </div>
          )}
          {errors && <p role="alert" className="mt-4 text-sm text-red-700">{errors}</p>}
          <div className="mt-6 flex gap-3">
            {step > 0 && <button className="button-light" onClick={() => setStep(step - 1)}>Back</button>}
            <button
              className="button-dark"
              disabled={submitting}
              onClick={() => {
                if (step === 0 && (!form.name.trim() || !contact)) {
                  setErrors("Enter your name and either an email address or phone number.");
                  return;
                }
                if (step === 0 && form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
                  setErrors("Enter a valid email address or clear the email field and use your phone number.");
                  return;
                }
                if (step === 0 && form.phone) {
                  const phone = form.phone.trim();
                  const digits = phone.replace(/\D/g, "").length;
                  if (phone.length > 40 || !/^[+()\d\s.-]+$/.test(phone) || digits < 7 || digits > 15) {
                    setErrors("Enter a valid phone number or clear it and use your email address.");
                    return;
                  }
                }
                if (step === 1 && (!form.address.trim() || !locationPoint)) {
                  setErrors("Search for a place in Kenya or pin your exact location on the map.");
                  return;
                }
                if (step === 2 && (!deliveryDate || !deliveryTime)) {
                  setErrors("Choose a preferred delivery day and time.");
                  return;
                }
                if (step === 2 && deliveryDate < earliestDeliveryDate) {
                  setErrors("Choose a preferred date at least three working days from today.");
                  return;
                }
                setErrors("");
                if (step === 3 && cart.some((line) => {
                  const product = products.find((item) => item.id === line.id);
                  return !product || line.quantity > product.quantity;
                })) {
                  setErrors("A cart item is no longer available in the requested quantity. Please update your bag.");
                  return;
                }
                if (step < 3) setStep(step + 1);
                else void placeOrder();
              }}
            >
              {submitting ? "Saving request…" : step === 3 ? "Send delivery request" : "Continue"}
              {!submitting && <ArrowRight size={15} />}
            </button>
          </div>
        </section>
        <aside className="h-fit rounded-xl bg-[var(--wash)] p-6">
          <h2 className="font-serif text-2xl">Your order</h2>
          {cart.map((line) => {
            const product = products.find((item) => item.id === line.id);
            return product ? (
              <p key={line.id} className="mt-4 flex justify-between gap-3 text-xs">
                <span>{product.name} × {line.quantity}</span>
                <span>{formatPrice((product.salePrice ?? product.price) * line.quantity)}</span>
              </p>
            ) : null;
          })}
          <p className="mt-6 flex justify-between border-t pt-4 text-sm">
            Total <strong>{formatPrice(total)}</strong>
          </p>
          <p className="mt-4 text-[10px] text-[var(--muted)]">Delivery request only · No payment is taken.</p>
        </aside>
      </div>
    </main>
  );
}
export function Confirmation(){const reference=new URLSearchParams(window.location.search).get("reference");return <main className="narrow-page text-center"><div className="confirm-glow mx-auto grid h-24 w-24 place-items-center rounded-full bg-[#f2c30033] text-4xl">✦</div><p className="eyebrow mt-7">Delivery request saved</p><h1 className="mt-3 font-serif text-5xl">Thank you.</h1><p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[var(--muted)]">Your request{reference ? ` ${reference}` : ""} is pending. We’ll contact you to confirm delivery availability. No delivery slot has been reserved and no payment has been taken.</p><Link to="/shop" className="button-dark mt-7">Keep exploring <ArrowRight size={16}/></Link></main>}
