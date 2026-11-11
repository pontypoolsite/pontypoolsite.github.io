import { useState } from "react";
import { Instagram, MessageCircle } from "lucide-react";
import { site, whatsappUrl } from "@/config/site";

export function ContactActions({
  message,
  whatsappLabel = "Continue in WhatsApp",
  onBeforeOpen,
  disabled = false,
}: {
  message: string;
  whatsappLabel?: string;
  onBeforeOpen?: () => boolean;
  disabled?: boolean;
}) {
  const [notice, setNotice] = useState("");
  const whatsapp = whatsappUrl(message);
  const hasContact = Boolean(whatsapp || site.instagramUrl);

  const openInstagram = () => {
    if (!site.instagramUrl) return;
    window.open(site.instagramUrl, "_blank", "noopener,noreferrer");
    if (!navigator.clipboard) {
      setNotice("Instagram opened. Copy the order details from this page and paste them into your message.");
      return;
    }
    void navigator.clipboard.writeText(message)
      .then(() => setNotice("Order details copied. Paste them into your Instagram message."))
      .catch(() => setNotice("Instagram opened. Copy the order details from this page and paste them into your message."));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {whatsapp ? (
          <a
            className="button-dark"
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
            aria-disabled={disabled}
            onClick={(event) => {
              if (disabled || (onBeforeOpen && !onBeforeOpen())) event.preventDefault();
            }}
          >
            <MessageCircle size={16} /> {whatsappLabel}
          </a>
        ) : (
          <button type="button" className="button-dark" disabled>
            <MessageCircle size={16} /> WhatsApp number not set
          </button>
        )}
        {site.instagramUrl ? (
          <button type="button" className="button-light" disabled={disabled} onClick={() => {
            if (!onBeforeOpen || onBeforeOpen()) openInstagram();
          }}>
            <Instagram size={16} /> Continue in Instagram
          </button>
        ) : (
          <button type="button" className="button-light" disabled>
            <Instagram size={16} /> Instagram not set
          </button>
        )}
      </div>
      <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
        {notice || (hasContact
          ? "Your message opens with the details ready. Review it and press Send in the app."
          : "Messaging is not configured yet. Add the business WhatsApp number or Instagram account in the GitHub Actions variables to enable orders.")}
      </p>
    </div>
  );
}
