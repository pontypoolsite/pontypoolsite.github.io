import type { CatalogProduct } from "@/lib/catalog-api";

export type Product = {
  id: string;
  catalogId: number;
  variantIndex?: number;
  name: string;
  slug: string;
  category: string;
  categoryId: number | null;
  subcategory: string;
  price: number;
  salePrice?: number;
  finishes: string[];
  description: string;
  specs: {
    dimensions: string;
    wattage: string;
    bulbBase: string;
    voltage: string;
    material: string;
  };
  images: string[];
  isNew: boolean;
  isBestSeller: boolean;
  quantity: number;
  reorderLevel: number;
  notStocked: boolean;
};

type CatalogVariant = {
  label?: unknown;
  amps?: unknown;
  glass?: unknown;
  colour?: unknown;
  price?: unknown;
  quantity?: unknown;
  reorderLevel?: unknown;
  dimensions?: unknown;
  wattage?: unknown;
  bulbBase?: unknown;
  voltage?: unknown;
  material?: unknown;
};

function isVariant(value: unknown): value is CatalogVariant {
  return typeof value === "object" && value !== null;
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function textValue(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function variantSuffix(variant: CatalogVariant): string {
  const label = textValue(variant.label) || textValue(variant.amps);
  return [label, textValue(variant.glass), textValue(variant.colour)]
    .filter(Boolean)
    .join(" · ");
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function mapCatalogProducts(records: CatalogProduct[]): Product[] {
  return records.flatMap((record) => {
    const variants = Array.isArray(record.variants) ? record.variants.filter(isVariant) : [];
    const imageList = record.imageUrl ? [record.imageUrl] : [];
    const category = record.category?.trim() || "Uncategorized";
    const baseName = record.name.trim() || `${category} #${record.id}`;

    const makeProduct = (variant?: CatalogVariant, variantIndex?: number): Product => {
      const suffix = variant ? variantSuffix(variant) : "";
      const name = suffix ? `${baseName} ${suffix}` : baseName;
      const id = variantIndex === undefined ? String(record.id) : `${record.id}:${variantIndex}`;
      const resellerVariant = variantIndex === undefined
        ? undefined
        : record.resellerVariants.find((item) => item.variantIndex === variantIndex);

      return {
        id,
        catalogId: record.id,
        ...(variantIndex === undefined ? {} : { variantIndex }),
        name,
        slug: `${slugify(name) || "product"}-${id.replace(":", "-")}`,
        category,
        categoryId: record.categoryId,
        subcategory: category,
        price: numberValue(variant?.price, numberValue(record.price)),
        finishes: suffix ? [suffix] : [],
        description: record.description?.trim() || "",
        specs: {
          dimensions: textValue(variant?.dimensions),
          wattage: textValue(variant?.wattage),
          bulbBase: textValue(variant?.bulbBase),
          voltage: textValue(variant?.voltage),
          material: textValue(variant?.material),
        },
        images: imageList,
        isNew: false,
        isBestSeller: false,
        quantity: Math.max(0, record.notStocked
          ? variantIndex === undefined
            ? record.resellerQuantity
            : resellerVariant?.quantity ?? 0
          : numberValue(variant?.quantity, numberValue(record.quantity))),
        reorderLevel: numberValue(variant?.reorderLevel, record.reorderLevel),
        notStocked: record.notStocked,
      };
    };

    if (variants.length) {
      return variants.map((variant, index) => makeProduct(variant, index));
    }

    return [makeProduct()];
  });
}
