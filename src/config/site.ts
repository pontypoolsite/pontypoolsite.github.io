export const site = { name: "Pontypool", currencySymbol: "KSh", currencyLocale: "en-KE", currencyCode: "KES", announcement: "Price match guarantee  •  Free delivery on qualifying orders  •  Easy returns  •  Free help from lighting consultants" };
export const formatPrice = (amount: number) => new Intl.NumberFormat(site.currencyLocale, { style: "currency", currency: site.currencyCode, maximumFractionDigits: 0 }).format(amount);
export const formatProductPrice = (amount: number) => amount > 0 ? formatPrice(amount) : "Price on request";
