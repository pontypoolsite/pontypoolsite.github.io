const configuredInstagram = import.meta.env.VITE_INSTAGRAM_URL?.trim() ?? "";
const instagramHandle = configuredInstagram.match(/^@?([a-zA-Z0-9._]{1,30})$/)?.[1];
const instagramProfile = instagramHandle
  ? `https://ig.me/m/${instagramHandle}`
  : (() => {
    try {
      const url = new URL(configuredInstagram);
      return ["instagram.com", "www.instagram.com", "ig.me"].includes(url.hostname)
        ? url.toString()
        : "";
    } catch {
      return "";
    }
  })();

export const site = {
  name: "Pontypool",
  currencySymbol: "KSh",
  currencyLocale: "en-KE",
  currencyCode: "KES",
  announcement: "Thoughtful lighting  •  Easy returns  •  Free help from lighting consultants",
  whatsappNumber: (import.meta.env.VITE_WHATSAPP_NUMBER ?? "").replace(/\D/g, ""),
  instagramUrl: instagramProfile,
};
export const formatPrice = (amount: number) => new Intl.NumberFormat(site.currencyLocale, { style: "currency", currency: site.currencyCode, maximumFractionDigits: 0 }).format(amount);
export const formatProductPrice = (amount: number) => amount > 0 ? formatPrice(amount) : "Price on request";

export function whatsappUrl(message: string): string {
  return site.whatsappNumber
    ? `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(message)}`
    : "";
}
