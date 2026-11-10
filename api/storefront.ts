import { attachDatabasePool } from "@neon/functions";
import { createHash } from "node:crypto";
import { Pool } from "pg";
import { createAdminToken, isAdminAuthConfigured, isAdminToken } from "./admin-auth.js";
import { isPointInKenya } from "../src/lib/kenya-boundary.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be configured for the storefront function.");
}

const pool = new Pool({ connectionString: databaseUrl, max: 5 });
attachDatabasePool(pool);

const allowedOrigins = new Set([
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "https://pontypoolsite.github.io",
  "https://pontypool.co.ke",
  "https://www.pontypool.co.ke",
]);
const productFields = new Set([
  "name",
  "sku",
  "categoryId",
  "price",
  "quantity",
  "reorderLevel",
  "unit",
  "imageUrl",
  "variants",
  "notStocked",
]);
const categoryFields = new Set(["name", "description", "parentId", "imageUrl"]);
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const orderAttempts = new Map<string, { count: number; resetAt: number }>();
const maxBodyBytes = 8 * 1024 * 1024;
const deliveryTimePattern = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

class RequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function json(data: unknown, status: number, origin: string | null) {
  const headers = new Headers({
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
  });

  if (origin && allowedOrigins.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  return new Response(status === 204 ? null : JSON.stringify(data), { status, headers });
}

function positiveId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validNonNegativeNumber(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function validNonNegativeInteger(value: unknown): boolean {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function validNullableId(value: unknown): boolean {
  return value === null || (typeof value === "number" && Number.isSafeInteger(value) && value > 0);
}

function validateImage(value: unknown): boolean {
  return value === null
    || (typeof value === "string"
      && value.length <= maxBodyBytes
      && (value.startsWith("data:image/") || /^https?:\/\//i.test(value)));
}

function validateVariants(value: unknown): boolean {
  if (value === null) return true;
  if (!Array.isArray(value)) return false;
  return value.every((variant) => {
    if (!isRecord(variant)) return false;
    return (variant.price === undefined || validNonNegativeNumber(variant.price))
      && (variant.quantity === undefined || validNonNegativeInteger(variant.quantity))
      && (variant.reorderLevel === undefined || validNonNegativeInteger(variant.reorderLevel));
  });
}

function validateProduct(input: unknown, partial = false): input is Record<string, unknown> {
  if (!isRecord(input)) return false;
  if (Object.keys(input).some((key) => !productFields.has(key))) return false;
  if (!partial && (typeof input.name !== "string" || !input.name.trim()
    || typeof input.unit !== "string" || !input.unit.trim()
    || !validNonNegativeNumber(input.price) || !validNonNegativeInteger(input.quantity))) {
    return false;
  }
  return (input.name === undefined || (typeof input.name === "string" && input.name.length <= 500))
    && (input.sku === undefined || input.sku === null || (typeof input.sku === "string" && input.sku.length <= 200))
    && (input.categoryId === undefined || validNullableId(input.categoryId))
    && (input.price === undefined || validNonNegativeNumber(input.price))
    && (input.quantity === undefined || validNonNegativeInteger(input.quantity))
    && (input.reorderLevel === undefined || validNonNegativeInteger(input.reorderLevel))
    && (input.unit === undefined || (typeof input.unit === "string" && input.unit.length <= 100))
    && (input.imageUrl === undefined || validateImage(input.imageUrl))
    && (input.variants === undefined || validateVariants(input.variants))
    && (input.notStocked === undefined || typeof input.notStocked === "boolean");
}

function validateCategory(input: unknown, partial = false): input is Record<string, unknown> {
  if (!isRecord(input)) return false;
  if (Object.keys(input).some((key) => !categoryFields.has(key))) return false;
  if (!partial && typeof input.name !== "string") return false;
  return (input.name === undefined || (typeof input.name === "string" && input.name.trim().length > 0 && input.name.length <= 300))
    && (input.description === undefined || (typeof input.description === "string" && input.description.length <= 10_000))
    && (input.parentId === undefined || validNullableId(input.parentId))
    && (input.imageUrl === undefined || validateImage(input.imageUrl));
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString().slice(0, 10) === value;
}

function validKenyaCoordinates(
  input: Record<string, unknown>,
): input is Record<string, unknown> & { locationLatitude: number; locationLongitude: number } {
  const { locationLatitude, locationLongitude } = input;
  return typeof locationLatitude === "number"
    && Number.isFinite(locationLatitude)
    && typeof locationLongitude === "number"
    && Number.isFinite(locationLongitude)
    && isPointInKenya(locationLatitude, locationLongitude);
}

function nairobiDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function addBusinessDays(value: string, count: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  let added = 0;
  while (added < count) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) added += 1;
  }
  return date.toISOString().slice(0, 10);
}

function orderIsRateLimited(request: Request): boolean {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
  const now = Date.now();
  const current = orderAttempts.get(key);
  if (!current || current.resetAt <= now) {
    if (orderAttempts.size > 2_000) {
      for (const [address, attempt] of orderAttempts) {
        if (attempt.resetAt <= now) orderAttempts.delete(address);
      }
    }
    orderAttempts.set(key, { count: 1, resetAt: now + 10 * 60_000 });
    return false;
  }
  current.count += 1;
  return current.count > 6;
}

async function readJson(request: Request): Promise<unknown> {
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
    throw new RequestError("Content-Type must be application/json.", 415);
  }
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > maxBodyBytes) throw new RequestError("Request body is too large.", 413);
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > maxBodyBytes) {
    throw new RequestError("Request body is too large.", 413);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new RequestError("Request body must be valid JSON.", 400);
  }
}

function getToken(request: Request): string | null {
  const authorization = request.headers.get("Authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
}

function loginIsLimited(request: Request): boolean {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const current = loginAttempts.get(key);
  if (!current || current.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  current.count += 1;
  return current.count > 8;
}

async function publicProducts(request: Request, origin: string | null) {
  const { rows } = await pool.query(`
    WITH reseller_purchases_by_variant AS (
      SELECT product_id, variant_index, SUM(quantity)::integer AS quantity
      FROM reseller_purchases
      WHERE product_id IS NOT NULL
      GROUP BY product_id, variant_index
    ),
    reseller_sales_by_variant AS (
      SELECT product_id, variant_index, SUM(quantity)::integer AS quantity
      FROM sales
      WHERE product_id IS NOT NULL
      GROUP BY product_id, variant_index
    ),
    reseller_balances AS (
      SELECT
        COALESCE(p.product_id, s.product_id) AS product_id,
        COALESCE(p.variant_index, s.variant_index) AS variant_index,
        COALESCE(p.quantity, 0) - COALESCE(s.quantity, 0) AS quantity
      FROM reseller_purchases_by_variant p
      FULL OUTER JOIN reseller_sales_by_variant s
        ON p.product_id = s.product_id
        AND p.variant_index IS NOT DISTINCT FROM s.variant_index
    ),
    reseller_products AS (
      SELECT
        product_id,
        SUM(quantity)::integer AS quantity,
        COALESCE(
          jsonb_agg(
            jsonb_build_object('variantIndex', variant_index, 'quantity', quantity)
            ORDER BY variant_index
          ) FILTER (WHERE variant_index IS NOT NULL),
          '[]'::jsonb
        ) AS variants
      FROM reseller_balances
      GROUP BY product_id
    )
    SELECT
      p.id,
      p.name,
      p.sku,
      p.price,
      CASE WHEN p.not_stocked THEN COALESCE(r.quantity, 0) ELSE p.quantity END AS quantity,
      CASE WHEN p.not_stocked THEN COALESCE(r.quantity, 0) ELSE 0 END AS "resellerQuantity",
      CASE WHEN p.not_stocked THEN COALESCE(r.variants, '[]'::jsonb) ELSE '[]'::jsonb END AS "resellerVariants",
      p.reorder_level AS "reorderLevel",
      p.unit,
      CASE
        WHEN p.image_url LIKE 'data:image/%' THEN '/images/products/' || p.id::text
        ELSE p.image_url
      END AS "imageUrl",
      p.variants,
      p.not_stocked AS "notStocked",
      p.category_id AS "categoryId",
      c.name AS "category",
      NULL::text AS "description",
      p.updated_at AS "updatedAt"
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN reseller_products r ON r.product_id = p.id
    ORDER BY p.updated_at DESC, p.id DESC
  `);
  const imageBaseUrl = new URL(request.url).origin;
  return json(rows.map((row) => ({
    ...row,
    imageUrl: typeof row.imageUrl === "string" && row.imageUrl.startsWith("/")
      ? `${imageBaseUrl}${row.imageUrl}`
      : row.imageUrl,
  })), 200, origin);
}

async function publicCategories(request: Request, origin: string | null) {
  const { rows } = await pool.query(`
    SELECT
      id,
      name,
      description,
      parent_id AS "parentId",
      CASE
        WHEN image_url LIKE 'data:image/%' THEN '/images/categories/' || id::text
        ELSE image_url
      END AS "imageUrl"
    FROM categories
    ORDER BY name ASC, id ASC
  `);
  const imageBaseUrl = new URL(request.url).origin;
  return json(rows.map((row) => ({
    ...row,
    imageUrl: typeof row.imageUrl === "string" && row.imageUrl.startsWith("/")
      ? `${imageBaseUrl}${row.imageUrl}`
      : row.imageUrl,
  })), 200, origin);
}

async function publicImage(path: string, request: Request, origin: string | null) {
  const match = path.match(/^\/images\/(products|categories)\/(\d+)$/);
  if (!match) return json({ error: "Not found." }, 404, origin);
  const id = positiveId(match[2]);
  if (!id) return json({ error: "Not found." }, 404, origin);

  const table = match[1] === "products" ? "products" : "categories";
  const { rows } = await pool.query(`SELECT image_url FROM ${table} WHERE id = $1`, [id]);
  const dataUrl = rows[0]?.image_url;
  if (typeof dataUrl !== "string") return json({ error: "Image not found." }, 404, origin);

  const image = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=\r\n]+)$/i);
  if (!image) return json({ error: "Image not found." }, 404, origin);
  const bytes = Buffer.from(image[2].replace(/\s/g, ""), "base64");
  if (bytes.length > 6 * 1024 * 1024) return json({ error: "Image is too large." }, 413, origin);

  const etag = `"${createHash("sha256").update(bytes).digest("hex")}"`;
  const headers = new Headers({
    "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
    "Content-Type": image[1].toLowerCase().replace("jpg", "jpeg"),
    ETag: etag,
    "Vary": "Origin",
  });
  if (origin && allowedOrigins.has(origin)) headers.set("Access-Control-Allow-Origin", origin);
  if (request.headers.get("If-None-Match") === etag) return new Response(null, { status: 304, headers });
  return new Response(bytes, { status: 200, headers });
}

async function submitOrder(request: Request, origin: string | null) {
  if (orderIsRateLimited(request)) {
    return json({ error: "Too many order requests. Please try again later." }, 429, origin);
  }

  const body = await readJson(request);
  if (!isRecord(body)
    || typeof body.submissionId !== "string"
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.submissionId)
    || typeof body.customerName !== "string"
    || typeof body.email !== "string"
    || typeof body.phone !== "string"
    || typeof body.location !== "string"
    || !["standard", "express"].includes(String(body.deliveryMethod))
    || !validDate(body.deliveryDate)
    || typeof body.deliveryTime !== "string"
    || !deliveryTimePattern.test(body.deliveryTime)
    || !Array.isArray(body.items)
    || body.items.length < 1
    || body.items.length > 30) {
    return json({ error: "Order or delivery details are invalid." }, 400, origin);
  }

  if (!validKenyaCoordinates(body)) {
    return json({ error: "The delivery pin must be inside Kenya. Please choose another point on the map." }, 400, origin);
  }

  const customerName = body.customerName.trim();
  const location = body.location.trim();
  const email = body.email.trim();
  const phone = body.phone.trim();
  const digitsInPhone = phone.replace(/\D/g, "").length;
  if (!customerName || customerName.length > 200
    || !location || location.length > 1_000
    || (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
    || (phone && (phone.length > 40 || !/^[+()\d\s.-]+$/.test(phone) || digitsInPhone < 7 || digitsInPhone > 15))
    || (!email && !phone)) {
    return json({ error: "Enter a valid name, location, and email address or phone number." }, 400, origin);
  }

  const deliveryMethod = body.deliveryMethod as "standard" | "express";
  const earliestDate = addBusinessDays(nairobiDate(), deliveryMethod === "standard" ? 3 : 1);
  if (body.deliveryDate < earliestDate) {
    return json({ error: "The selected delivery date is too soon for this delivery method." }, 400, origin);
  }
  const requestedLines: { productId: number; variantIndex: number | null; quantity: number }[] = [];
  const lineKeys = new Set<string>();
  for (const item of body.items) {
    if (!isRecord(item)
      || !Number.isSafeInteger(item.productId)
      || Number(item.productId) < 1
      || (item.variantIndex !== null && item.variantIndex !== undefined
        && (!Number.isSafeInteger(item.variantIndex) || Number(item.variantIndex) < 0))
      || !Number.isSafeInteger(item.quantity)
      || Number(item.quantity) < 1
      || Number(item.quantity) > 100) {
      return json({ error: "One or more order items are invalid." }, 400, origin);
    }
    const productId = Number(item.productId);
    const variantIndex = item.variantIndex === null || item.variantIndex === undefined
      ? null
      : Number(item.variantIndex);
    const key = `${productId}:${variantIndex ?? "base"}`;
    if (lineKeys.has(key)) return json({ error: "Order items must not contain duplicates." }, 400, origin);
    lineKeys.add(key);
    requestedLines.push({ productId, variantIndex, quantity: Number(item.quantity) });
  }

  const existingOrder = await pool.query(
    "SELECT id, status FROM storefront_orders WHERE submission_id = $1",
    [body.submissionId],
  );
  if (existingOrder.rows[0]) {
    return json({
      orderReference: `PP-${String(existingOrder.rows[0].id).padStart(6, "0")}`,
      status: existingOrder.rows[0].status,
    }, 200, origin);
  }

  const productIds = [...new Set(requestedLines.map((line) => line.productId))];
  const { rows: products } = await pool.query(`
    WITH purchases AS (
      SELECT product_id, variant_index, SUM(quantity)::integer AS quantity
      FROM reseller_purchases
      WHERE product_id = ANY($1::bigint[])
      GROUP BY product_id, variant_index
    ),
    sold AS (
      SELECT product_id, variant_index, SUM(quantity)::integer AS quantity
      FROM sales
      WHERE product_id = ANY($1::bigint[])
      GROUP BY product_id, variant_index
    ),
    balances AS (
      SELECT
        COALESCE(p.product_id, s.product_id) AS product_id,
        COALESCE(p.variant_index, s.variant_index) AS variant_index,
        COALESCE(p.quantity, 0) - COALESCE(s.quantity, 0) AS quantity
      FROM purchases p
      FULL OUTER JOIN sold s
        ON p.product_id = s.product_id
        AND p.variant_index IS NOT DISTINCT FROM s.variant_index
    ),
    reseller_products AS (
      SELECT
        product_id,
        SUM(quantity)::integer AS quantity,
        COALESCE(
          jsonb_agg(jsonb_build_object('variantIndex', variant_index, 'quantity', quantity)
            ORDER BY variant_index) FILTER (WHERE variant_index IS NOT NULL),
          '[]'::jsonb
        ) AS variants
      FROM balances
      GROUP BY product_id
    )
    SELECT p.id, p.name, p.price, p.quantity, p.variants, p.not_stocked AS "notStocked",
      c.name AS category, COALESCE(r.quantity, 0) AS "resellerQuantity",
      COALESCE(r.variants, '[]'::jsonb) AS "resellerVariants"
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN reseller_products r ON r.product_id = p.id
    WHERE p.id = ANY($1::bigint[])
  `, [productIds]);
  const productById = new Map<number, Record<string, unknown>>(
    products.map((product) => [Number(product.id), product]),
  );
  const orderItems: {
    productId: number;
    variantIndex: number | null;
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[] = [];
  let total = 0;

  for (const line of requestedLines) {
    const product = productById.get(line.productId);
    if (!product) return json({ error: "A product in your bag is no longer available." }, 409, origin);

    const variants = Array.isArray(product.variants) ? product.variants : [];
    if (variants.length > 0 && line.variantIndex === null) {
      return json({ error: "Choose an option for each product before placing the request." }, 409, origin);
    }
    const variant = line.variantIndex === null ? null : variants[line.variantIndex];
    if (line.variantIndex !== null && !isRecord(variant)) {
      return json({ error: "A selected product option is no longer available." }, 409, origin);
    }

    const rawUnitPrice = Number(variant && isRecord(variant) ? variant.price ?? product.price : product.price);
    const unitPrice = Math.round(rawUnitPrice * 100) / 100;
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      return json({ error: "A product in your bag is not currently available to order." }, 409, origin);
    }

    let available = Number(product.quantity);
    if (product.notStocked === true) {
      if (line.variantIndex === null) {
        available = Number(product.resellerQuantity);
      } else {
        const resellerVariants = Array.isArray(product.resellerVariants) ? product.resellerVariants : [];
        const resellerVariant = resellerVariants.find((entry) =>
          isRecord(entry) && Number(entry.variantIndex) === line.variantIndex);
        available = isRecord(resellerVariant) ? Number(resellerVariant.quantity) : 0;
      }
    } else if (line.variantIndex !== null && isRecord(variant)) {
      available = Number(variant.quantity ?? product.quantity);
    }
    if (!Number.isSafeInteger(available) || line.quantity > available) {
      return json({ error: "A product in your bag no longer has the requested quantity in stock." }, 409, origin);
    }

    const baseName = typeof product.name === "string" && product.name.trim()
      ? product.name.trim()
      : `${typeof product.category === "string" && product.category.trim() ? product.category.trim() : "Uncategorized"} #${line.productId}`;
    const variantSuffix = variant && isRecord(variant)
      ? [variant.label ?? variant.amps, variant.glass, variant.colour]
        .filter((part) => typeof part === "string" || typeof part === "number")
        .map(String)
        .map((part) => part.trim())
        .filter(Boolean)
        .join(" · ")
      : "";
    const productName = variantSuffix ? `${baseName} ${variantSuffix}` : baseName;
    const lineTotal = Math.round(unitPrice * line.quantity * 100) / 100;
    total += lineTotal;
    orderItems.push({
      productId: line.productId,
      variantIndex: line.variantIndex,
      productName,
      quantity: line.quantity,
      unitPrice,
      lineTotal,
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query(
      `INSERT INTO storefront_orders
        (submission_id, customer_name, email, phone, location, location_latitude,
         location_longitude, delivery_method, preferred_delivery_date,
         preferred_delivery_time, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (submission_id) DO NOTHING
       RETURNING id`,
      [
        body.submissionId,
        customerName,
        email || null,
        phone || null,
        location,
        body.locationLatitude,
        body.locationLongitude,
        deliveryMethod,
        body.deliveryDate,
        body.deliveryTime,
        Math.round(total * 100) / 100,
      ],
    );
    if (inserted.rowCount === 0) {
      const { rows } = await client.query(
        "SELECT id, status FROM storefront_orders WHERE submission_id = $1",
        [body.submissionId],
      );
      await client.query("COMMIT");
      return json({
        orderReference: `PP-${String(rows[0].id).padStart(6, "0")}`,
        status: rows[0].status,
      }, 200, origin);
    }

    const orderId = inserted.rows[0].id;
    for (const item of orderItems) {
      await client.query(
        `INSERT INTO storefront_order_items
          (order_id, product_id, variant_index, product_name, quantity, unit_price, line_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [orderId, item.productId, item.variantIndex, item.productName, item.quantity, item.unitPrice, item.lineTotal],
      );
    }
    await client.query("COMMIT");
    return json({
      orderReference: `PP-${String(orderId).padStart(6, "0")}`,
      status: "pending",
    }, 201, origin);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function adminRequest(request: Request, path: string, origin: string | null) {
  if (path === "/admin/login" && request.method === "POST") {
    if (!isAdminAuthConfigured()) {
      return json({ error: "Admin sign-in is not configured on the server." }, 503, origin);
    }
    if (loginIsLimited(request)) return json({ error: "Too many sign-in attempts. Try again shortly." }, 429, origin);
    const body = await readJson(request);
    if (!isRecord(body) || typeof body.username !== "string" || typeof body.password !== "string") {
      return json({ error: "Enter a username and password." }, 400, origin);
    }
    const token = createAdminToken(body.username, body.password);
    if (!token) return json({ error: "Sign-in failed." }, 401, origin);
    return json({ token, expiresIn: 1800 }, 200, origin);
  }

  if (!isAdminToken(getToken(request))) {
    return json({ error: "Admin sign-in is required." }, 401, origin);
  }

  if (path === "/admin/orders" && request.method === "GET") {
    const { rows } = await pool.query(`
      SELECT o.id, o.customer_name AS "customerName", o.email, o.phone, o.location,
        o.location_latitude AS "locationLatitude",
        o.location_longitude AS "locationLongitude",
        o.delivery_method AS "deliveryMethod",
        to_char(o.preferred_delivery_date, 'YYYY-MM-DD') AS "deliveryDate",
        o.preferred_delivery_time AS "deliveryTime", o.status, o.total,
        o.created_at AS "createdAt",
        COALESCE(
          jsonb_agg(jsonb_build_object(
            'productId', i.product_id,
            'variantIndex', i.variant_index,
            'productName', i.product_name,
            'quantity', i.quantity,
            'unitPrice', i.unit_price,
            'lineTotal', i.line_total
          ) ORDER BY i.id) FILTER (WHERE i.id IS NOT NULL),
          '[]'::jsonb
        ) AS items
      FROM storefront_orders o
      LEFT JOIN storefront_order_items i ON i.order_id = o.id
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT 100
    `);
    return json(rows.map((order) => ({
      ...order,
      orderReference: `PP-${String(order.id).padStart(6, "0")}`,
    })), 200, origin);
  }

  const orderMatch = path.match(/^\/admin\/orders\/(\d+)$/);
  if (orderMatch && request.method === "PUT") {
    const id = positiveId(orderMatch[1]);
    if (!id) return json({ error: "Invalid order id." }, 400, origin);
    const body = await readJson(request);
    if (!isRecord(body) || !["confirmed", "declined"].includes(String(body.status))) {
      return json({ error: "Choose a valid order status." }, 400, origin);
    }
    const { rows } = await pool.query(
      `UPDATE storefront_orders
       SET status = $2, updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING id, status`,
      [id, body.status],
    );
    if (rows[0]) return json({ ok: true, status: rows[0].status }, 200, origin);

    const current = await pool.query("SELECT status FROM storefront_orders WHERE id = $1", [id]);
    if (!current.rows[0]) return json({ error: "Delivery request not found." }, 404, origin);
    return json({ error: "This delivery request has already been processed." }, 409, origin);
  }

  if (path === "/admin/products" && request.method === "POST") {
    const body = await readJson(request);
    if (!validateProduct(body) || typeof body.name !== "string" || typeof body.unit !== "string") {
      return json({ error: "Product fields are invalid." }, 400, origin);
    }
    const { rows } = await pool.query(
      `INSERT INTO products
        (name, sku, category_id, price, quantity, reorder_level, unit, image_url, variants, not_stocked)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        body.name,
        body.sku ?? null,
        body.categoryId ?? null,
        body.price,
        body.quantity,
        body.reorderLevel ?? 0,
        body.unit,
        body.imageUrl ?? null,
        body.variants === undefined || body.variants === null ? null : JSON.stringify(body.variants),
        body.notStocked ?? false,
      ],
    );
    return json({ id: rows[0].id }, 201, origin);
  }

  if (path === "/admin/categories" && request.method === "POST") {
    const body = await readJson(request);
    if (!validateCategory(body) || typeof body.name !== "string") {
      return json({ error: "Category fields are invalid." }, 400, origin);
    }
    const { rows } = await pool.query(
      `INSERT INTO categories (name, description, parent_id, image_url)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [body.name.trim(), body.description ?? "", body.parentId ?? null, body.imageUrl ?? null],
    );
    return json({ id: rows[0].id }, 201, origin);
  }

  if (path === "/admin/reseller-purchases" && request.method === "POST") {
    const body = await readJson(request);
    if (!isRecord(body)
      || !validNullableId(body.productId)
      || body.productId === null
      || !validNonNegativeInteger(body.quantity)
      || typeof body.quantity !== "number"
      || body.quantity < 1
      || !validNonNegativeNumber(body.unitCost)
      || typeof body.shopName !== "string"
      || typeof body.employeeName !== "string"
      || (body.variantIndex !== null && body.variantIndex !== undefined
        && (!Number.isSafeInteger(body.variantIndex) || Number(body.variantIndex) < 0))) {
      return json({ error: "Reseller stock purchase fields are invalid." }, 400, origin);
    }
    const result = await pool.query(
      `INSERT INTO reseller_purchases
        (product_id, product_name, variant_index, quantity, unit_cost, total_cost, shop_name, employee_name)
       SELECT p.id, p.name, $2, $3, $4, $3 * $4, $5, $6
       FROM products p
       WHERE p.id = $1 AND p.not_stocked = TRUE
       RETURNING id`,
      [
        body.productId,
        body.variantIndex ?? null,
        body.quantity,
        body.unitCost,
        body.shopName,
        body.employeeName,
      ],
    );
    if (result.rowCount === 0) {
      return json({ error: "Not-stocked product not found." }, 404, origin);
    }
    return json({ ok: true }, 201, origin);
  }

  const productMatch = path.match(/^\/admin\/products\/(\d+)$/);
  if (productMatch) {
    const id = positiveId(productMatch[1]);
    if (!id) return json({ error: "Invalid product id." }, 400, origin);

    if (request.method === "GET") {
      const { rows } = await pool.query(`
        SELECT p.id, p.name, p.sku, p.price, p.quantity,
          p.reorder_level AS "reorderLevel", p.unit, p.image_url AS "imageUrl",
          p.variants, p.not_stocked AS "notStocked",
          p.category_id AS "categoryId", c.name AS "category",
          NULL::text AS "description", p.updated_at AS "updatedAt",
          0 AS "resellerQuantity", '[]'::jsonb AS "resellerVariants"
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.id = $1
      `, [id]);
      return rows.length
        ? json(rows[0], 200, origin)
        : json({ error: "Product not found." }, 404, origin);
    }

    if (request.method === "PUT") {
      const body = await readJson(request);
      if (!validateProduct(body, true) || Object.keys(body).length === 0) {
        return json({ error: "Product fields are invalid." }, 400, origin);
      }
      const fields: Record<string, string> = {
        name: "name",
        sku: "sku",
        categoryId: "category_id",
        price: "price",
        quantity: "quantity",
        reorderLevel: "reorder_level",
        unit: "unit",
        imageUrl: "image_url",
        variants: "variants",
        notStocked: "not_stocked",
      };
      const entries = Object.entries(body);
      const setters = entries.map(([key], index) => `${fields[key]} = $${index + 1}`);
      const values = entries.map(([key, value]) => key === "variants" && value !== null
        ? JSON.stringify(value)
        : key === "name" && typeof value === "string"
          ? value.trim()
          : value);
      setters.push("updated_at = NOW()");
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const currentResult = await client.query(
          "SELECT name, quantity, variants, not_stocked AS \"notStocked\" FROM products WHERE id = $1 FOR UPDATE",
          [id],
        );
        const current = currentResult.rows[0];
        if (!current) {
          await client.query("ROLLBACK");
          return json({ error: "Product not found." }, 404, origin);
        }
        const oldVariantQuantity = Array.isArray(current.variants)
          ? current.variants.reduce((sum: number, item: { quantity?: unknown }) => sum + Number(item?.quantity || 0), 0)
          : 0;
        const oldQuantity = oldVariantQuantity || Number(current.quantity) || 0;
        const updatedVariants = Object.hasOwn(body, "variants") ? body.variants : current.variants;
        const updatedBaseQuantity = Object.hasOwn(body, "quantity") ? body.quantity : Number(current.quantity) || 0;
        const newVariantQuantity = Array.isArray(updatedVariants)
          ? updatedVariants.reduce((sum, item) => sum + (isRecord(item) ? Number(item.quantity || 0) : 0), 0)
          : 0;
        const newQuantity = newVariantQuantity || Number(updatedBaseQuantity) || 0;
        const isNotStocked = Object.hasOwn(body, "notStocked") ? body.notStocked : current.notStocked;

        const result = await client.query(
          `UPDATE products SET ${setters.join(", ")} WHERE id = $${values.length + 1}`,
          [...values, id],
        );
        if (result.rowCount === 0) {
          await client.query("ROLLBACK");
          return json({ error: "Product not found." }, 404, origin);
        }
        if (!isNotStocked && newQuantity !== oldQuantity) {
          const type = newQuantity > oldQuantity ? "increase" : "decrease";
          await client.query(
            `INSERT INTO stock_adjustments
              (product_id, product_name, type, quantity, reason, old_quantity, new_quantity)
             VALUES ($1, $2, $3, $4, 'Storefront admin stock update', $5, $6)`,
            [id, current.name, type, Math.abs(newQuantity - oldQuantity), oldQuantity, newQuantity],
          );
        }
        await client.query("COMMIT");
        return json({ ok: true }, 200, origin);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }

    if (request.method === "DELETE") {
      const result = await pool.query("DELETE FROM products WHERE id = $1", [id]);
      if (result.rowCount === 0) return json({ error: "Product not found." }, 404, origin);
      return json({ ok: true }, 200, origin);
    }
  }

  const categoryMatch = path.match(/^\/admin\/categories\/(\d+)$/);
  if (categoryMatch) {
    const id = positiveId(categoryMatch[1]);
    if (!id) return json({ error: "Invalid category id." }, 400, origin);

    if (request.method === "PUT") {
      const body = await readJson(request);
      if (!validateCategory(body, true) || Object.keys(body).length === 0) {
        return json({ error: "Category fields are invalid." }, 400, origin);
      }
      const fields: Record<string, string> = {
        name: "name",
        description: "description",
        parentId: "parent_id",
        imageUrl: "image_url",
      };
      const entries = Object.entries(body);
      const setters = entries.map(([key], index) => `${fields[key]} = $${index + 1}`);
      const values = entries.map(([key, value]) => key === "name" && typeof value === "string" ? value.trim() : value);
      setters.push("updated_at = NOW()");
      const result = await pool.query(
        `UPDATE categories SET ${setters.join(", ")} WHERE id = $${values.length + 1}`,
        [...values, id],
      );
      if (result.rowCount === 0) return json({ error: "Category not found." }, 404, origin);
      return json({ ok: true }, 200, origin);
    }

    if (request.method === "DELETE") {
      const result = await pool.query("DELETE FROM categories WHERE id = $1", [id]);
      if (result.rowCount === 0) return json({ error: "Category not found." }, 404, origin);
      return json({ ok: true }, 200, origin);
    }
  }

  return json({ error: "Not found." }, 404, origin);
}

async function api(request: Request) {
  const origin = request.headers.get("Origin");
  if (origin && !allowedOrigins.has(origin)) {
    return json({ error: "Origin is not allowed." }, 403, null);
  }

  if (request.method === "OPTIONS") {
    return json(null, 204, origin);
  }

  const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
  try {
    if (path.startsWith("/admin/")) {
      if (!["GET", "POST", "PUT", "DELETE"].includes(request.method)) {
        return json({ error: "Method not allowed." }, 405, origin);
      }
      return await adminRequest(request, path, origin);
    }

    if (request.method === "GET" && path.startsWith("/images/")) {
      return await publicImage(path, request, origin);
    }
    if (path === "/orders" && request.method === "POST") {
      return await submitOrder(request, origin);
    }
    if (request.method !== "GET") {
      return json({ error: "Method not allowed." }, 405, origin);
    }
    if (path === "/products") return await publicProducts(request, origin);
    if (path === "/categories") return await publicCategories(request, origin);
    return json({ error: "Not found." }, 404, origin);
  } catch (error) {
    console.error("Storefront request failed:", error);
    if (error instanceof RequestError) return json({ error: error.message }, error.status, origin);
    return json({ error: "The request could not be completed." }, 500, origin);
  }
}

export default { fetch: api };
