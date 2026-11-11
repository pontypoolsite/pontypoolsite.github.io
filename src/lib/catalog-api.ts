export type CatalogProduct = {
  id: number;
  name: string;
  sku: string | null;
  price: string | number;
  quantity: number;
  reorderLevel: number;
  unit: string;
  imageUrl: string | null;
  variants: unknown[] | null;
  notStocked: boolean;
  categoryId: number | null;
  category: string | null;
  description: string | null;
  updatedAt: string;
  resellerQuantity: number;
  resellerVariants: { variantIndex: number; quantity: number }[];
};

export type CatalogCategory = {
  id: number;
  name: string;
  description: string;
  parentId: number | null;
  imageUrl: string | null;
};

export type StorefrontOrderItem = {
  productId: number;
  variantIndex: number | null;
  productName: string;
  quantity: number;
  unitPrice: string | number;
  lineTotal: string | number;
};

export type StorefrontOrder = {
  id: number;
  orderReference: string;
  customerName: string;
  email: string | null;
  phone: string | null;
  location: string;
  locationLatitude: number;
  locationLongitude: number;
  deliveryMethod: "standard" | "express";
  deliveryDate: string;
  deliveryTime: string;
  status: "pending" | "confirmed" | "declined";
  total: string | number;
  createdAt: string;
  items: StorefrontOrderItem[];
};

async function fetchCatalog<T>(resource: "products" | "categories"): Promise<T[]> {
  const baseUrl = import.meta.env.VITE_STOREFRONT_API_URL?.trim().replace(/\/+$/, "");
  if (!baseUrl) {
    throw new Error("VITE_STOREFRONT_API_URL is not configured for the storefront.");
  }

  const response = await fetch(`${baseUrl}/${resource}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Could not load ${resource} (${response.status}).`);
  }

  return response.json() as Promise<T[]>;
}

export const fetchCatalogProducts = () => fetchCatalog<CatalogProduct>("products");
export const fetchCatalogCategories = () => fetchCatalog<CatalogCategory>("categories");

export async function signInAdmin(username: string, password: string): Promise<string> {
  const baseUrl = import.meta.env.VITE_STOREFRONT_API_URL?.trim().replace(/\/+$/, "");
  if (!baseUrl) throw new Error("VITE_STOREFRONT_API_URL is not configured for the storefront.");

  const response = await fetch(`${baseUrl}/admin/login`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });
  const payload = await response.json() as { token?: string; error?: string };
  if (!response.ok || !payload.token) {
    throw new Error(payload.error || `Admin sign-in failed (${response.status}).`);
  }
  return payload.token;
}

export async function adminRequest<T>(
  token: string,
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  body?: unknown,
): Promise<T> {
  const baseUrl = import.meta.env.VITE_STOREFRONT_API_URL?.trim().replace(/\/+$/, "");
  if (!baseUrl) throw new Error("VITE_STOREFRONT_API_URL is not configured for the storefront.");

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store",
  });
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || `Admin request failed (${response.status}).`);
  }
  return payload;
}
