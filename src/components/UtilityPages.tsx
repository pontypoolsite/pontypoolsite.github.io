import { useMemo, useState } from "react";
import { ArrowRight, Instagram, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { ContactActions } from "@/components/ContactActions";
import { useCatalog } from "@/context/CatalogContext";
import { useStore } from "@/context/StoreContext";
import { formatPrice, formatProductPrice } from "@/config/site";

export function HelpPage({ delivery = false }: { delivery?: boolean }) {
  const questions = delivery
    ? [
      ["When will my order arrive?", "Delivery timing is confirmed by our team when we review your area and items."],
      ["What does delivery cost?", "Delivery coverage and fees are confirmed with you on WhatsApp or Instagram before you place an order."],
      ["Can I return an item?", "Please contact our team to discuss returns and the next steps."],
      ["What if my light arrives damaged?", "Let us know as soon as possible and our team will guide you through the next steps."],
    ]
    : [
      ["Can I get help choosing a light?", "Our lighting team can help with room measurements, finishes and bulb choices."],
      ["Are bulbs included?", "Bulb inclusion varies by fitting. Check the verified product details or ask us before ordering."],
      ["Can I use a dimmer?", "Compatibility depends on the fitting and bulb. Ask our team to check the specific product."],
      ["Do you work with trade customers?", "Contact our team to discuss trade support and project requirements."],
    ];

  return (
    <main className="narrow-page max-w-4xl">
      <p className="eyebrow">The practical details</p>
      <h1 className="mt-3 font-serif text-5xl">{delivery ? "Delivery & returns" : "A few good questions."}</h1>
      <p className="mt-4 text-sm text-[var(--muted)]">
        {delivery ? "We’ll confirm delivery coverage, fees and timing with you before an order is agreed." : "A little more light on the details."}
      </p>
      <div className="mt-9 space-y-3">
        {questions.map(([question, answer]) => (
          <details key={question} className="rounded-lg border border-[var(--line)] p-5">
            <summary className="cursor-pointer font-serif text-xl">{question}</summary>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{answer}</p>
          </details>
        ))}
      </div>
      <Link className="button-dark mt-8" to="/contact">Still have a question? <ArrowRight size={16} /></Link>
    </main>
  );
}

export function ContactPage() {
  const [message, setMessage] = useState("");
  const contactMessage = `Hello Pontypool, ${message.trim() || "I have a question about your lighting."}`;

  return (
    <main className="narrow-page max-w-3xl">
      <p className="eyebrow">We’re here to help</p>
      <h1 className="mt-3 font-serif text-5xl">Let’s talk light.</h1>
      <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
        Ask about a product, pricing or delivery. Your message opens in WhatsApp or Instagram for you to review and send.
      </p>
      <label className="mt-8 block text-xs">
        What can we help with?
        <textarea
          className="form-input mt-2 min-h-32"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Tell us what you’d like to know"
        />
      </label>
      <div className="mt-5">
        <ContactActions message={contactMessage} />
      </div>
    </main>
  );
}

export function CheckoutFlow() {
  const { cart } = useStore();
  const { products } = useCatalog();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryArea, setDeliveryArea] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const items = useMemo(() => cart.flatMap((line) => {
    const product = products.find((item) => item.id === line.id);
    return product ? [{ product, quantity: line.quantity }] : [];
  }), [cart, products]);
  const subtotal = items.reduce((sum, item) => (
    sum + (item.product.salePrice ?? item.product.price) * item.quantity
  ), 0);
  const hasUnpricedItems = items.some(({ product }) => (product.salePrice ?? product.price) <= 0);
  const unavailable = items.some(({ product, quantity }) => quantity > product.quantity);
  const message = [
    "Hello Pontypool, I’d like to request these items:",
    "",
    ...items.map(({ product, quantity }) => {
      const price = product.salePrice ?? product.price;
      const itemNumber = product.variantIndex === undefined
        ? `Item #${product.catalogId}`
        : `Item #${product.catalogId}, option ${product.variantIndex + 1}`;
      const lineTotal = price > 0 ? ` · ${formatPrice(price * quantity)}` : " · price to confirm";
      return `• ${quantity} × ${product.name} (${itemNumber}) — ${formatProductPrice(price)} each${lineTotal}`;
    }),
    "",
    hasUnpricedItems
      ? "Some prices are not listed; please confirm the total."
      : `Items subtotal: ${formatPrice(subtotal)} (delivery not included)`,
    `Name: ${name.trim()}`,
    `Customer phone: ${phone.trim()}`,
    `Delivery area: ${deliveryArea.trim() || "Please ask me"}`,
    `Note: ${note.trim() || "None"}`,
    "",
    "Please confirm availability, delivery coverage and delivery fee before I place the order.",
  ].join("\n");

  const validateAndSend = () => {
    if (!name.trim() || !phone.trim()) {
      setError("Enter your name and phone number so the team can identify your request.");
      return false;
    }
    const digits = phone.replace(/\D/g, "").length;
    if (digits < 7 || digits > 15) {
      setError("Enter a valid phone number, including your country code.");
      return false;
    }
    if (unavailable) {
      setError("A requested quantity is no longer available. Update your bag before continuing.");
      return false;
    }
    setError("");
    return true;
  };

  if (items.length === 0) {
    return (
      <main className="narrow-page">
        <p className="eyebrow">Your order request</p>
        <h1 className="mt-3 font-serif text-5xl">Your bag is empty.</h1>
        <p className="mt-4 text-sm text-[var(--muted)]">Add a light to your bag before contacting us about an order.</p>
        <Link className="button-dark mt-7" to="/shop">Browse lighting <ArrowRight size={16} /></Link>
      </main>
    );
  }

  return (
    <main className="narrow-page">
      <p className="eyebrow">A personal order, made simple</p>
      <h1 className="mt-3 font-serif text-5xl">Review your request</h1>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--muted)]">
        Check the quantities and add your details. We’ll open a message with the item numbers,
        quantities and prices so our team can confirm stock and delivery with you.
      </p>

      <div className="mt-9 grid gap-10 md:grid-cols-[1fr_360px]">
        <section>
          <h2 className="font-serif text-2xl">Items in your bag</h2>
          <div className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {items.map(({ product, quantity }) => (
              <div key={product.id} className="flex justify-between gap-5 py-5 text-sm">
                <div>
                  <Link to={`/product/${product.slug}`} className="font-medium hover:underline">{product.name}</Link>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Item #{product.catalogId} · Quantity {quantity}
                  </p>
                </div>
                <span className="shrink-0">{formatProductPrice(product.salePrice ?? product.price)}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 flex justify-between text-sm">
            <span>{hasUnpricedItems ? "Subtotal (some prices to confirm)" : "Items subtotal"}</span>
            <strong>{hasUnpricedItems ? "To be confirmed" : formatPrice(subtotal)}</strong>
          </p>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            Delivery fee and availability are confirmed in the chat. No online payment is taken.
          </p>
        </section>

        <section className="h-fit rounded-xl border border-[var(--line)] bg-[var(--wash)] p-6">
          <h2 className="font-serif text-2xl">Your details</h2>
          <div className="mt-5 space-y-4">
            <label className="block text-xs">
              Name
              <input className="form-input mt-2" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="block text-xs">
              Phone number
              <input className="form-input mt-2" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Include country code" />
            </label>
            <label className="block text-xs">
              Delivery area <span className="text-[var(--muted)]">(optional)</span>
              <input className="form-input mt-2" autoComplete="address-level2" value={deliveryArea} onChange={(event) => setDeliveryArea(event.target.value)} placeholder="Town, county or neighbourhood" />
            </label>
            <label className="block text-xs">
              Note for the team <span className="text-[var(--muted)]">(optional)</span>
              <textarea className="form-input mt-2 min-h-24" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Finish, timing, or anything else we should know" />
            </label>
          </div>
          {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
          {unavailable && <p role="alert" className="mt-4 text-sm text-red-700">Some items in your bag are no longer available in that quantity.</p>}

          <h3 className="mt-7 font-serif text-xl">Message preview</h3>
          <pre className="mt-3 max-h-52 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 text-xs leading-5">{message}</pre>
          <div className="mt-5">
            <ContactActions
              message={message}
              whatsappLabel="Send order request in WhatsApp"
              onBeforeOpen={validateAndSend}
              disabled={unavailable}
            />
          </div>
          <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-[var(--muted)]">
            <MessageCircle size={15} className="mt-0.5 shrink-0" />
            Your message is prepared, not sent automatically. Review it and press Send in WhatsApp.
          </div>
          <p className="mt-2 flex items-center gap-2 text-xs text-[var(--muted)]">
            <Instagram size={14} /> For Instagram, the message is copied for you to paste into the chat.
          </p>
        </section>
      </div>
    </main>
  );
}
