# Pontypool Lighting

## Run locally

Install the dependencies with `pnpm install`, then start the app with `pnpm run dev`.
Open the URL Vite prints in the terminal (by default, `http://localhost:8080/`).

In VS Code, select **Launch app in Google Chrome** from **Run and Debug** and
press **F5**. This starts the Vite development server and opens the app in Chrome.
The **Go Live** button from the Live Server extension is not suitable for this
Vite/React app because it serves source files without compiling them.

## Shared Neon catalog and admin

The public storefront reads live products, images, prices, categories, variants,
and stock from the same Neon database used by the inventory system. Catalog
changes made in either system become visible in the storefront on its next
refresh (within about 45 seconds). The inventory-system project is not changed.
The inventory tables are not altered. The storefront uses separate order-request
tables created by `database/001-storefront-orders.sql`.

The `storefront` Neon Function's public catalog endpoints are read-only. Its
public checkout endpoint can only save delivery requests in the separate
storefront order tables; private catalog and request-management endpoints
require sign-in. Configure `DATABASE_URL` with a dedicated database role that has:

- `SELECT` on `products`, `categories`, `sales`, and `reseller_purchases`;
- `INSERT`, `UPDATE`, and `DELETE` on `products` and `categories`;
- `INSERT` on `reseller_purchases` and `stock_adjustments`;
- `SELECT`, `INSERT`, and `UPDATE` on `storefront_orders`;
- `SELECT` and `INSERT` on `storefront_order_items`; and
- `USAGE` on the `products_id_seq`, `categories_id_seq`, and
  `reseller_purchases_id_seq`, `stock_adjustments_id_seq`,
  `storefront_orders_id_seq`, and `storefront_order_items_id_seq` sequences.

Do not grant write access to `sales` or use a frontend `VITE_` variable for
database credentials. Public catalog responses never expose reseller costs or
sales records. Reseller availability is calculated from purchases minus sales.

1. Copy `.env.example` to `.env.local`. Set `DATABASE_URL`, `ADMIN_PASSWORD`
   (at least 12 characters), and a random `ADMIN_TOKEN_SECRET` (at least 32
   characters). Keep these server secrets private; `.env.local` is ignored by
   Git. Set `ADMIN_USERNAME` if you want to change the default `admin`.
2. Deploy the `storefront` function to the existing production branch using the
   authenticated Neon CLI. The function source is `api/storefront.ts`; the
   server-only variables must be configured for its deployment and never
   included in the website bundle.
3. Set `VITE_STOREFRONT_API_URL` to the function's public URL. Build the site
   with `pnpm run build` and upload the `dist` contents to the web host.
4. Visit `/admin` to sign in and manage catalog records. The website admin
   holds a short-lived token in memory only. For `not_stocked` products, record
   actual reseller purchases (including cost and shop) so stock stays aligned
   with the inventory ledger.

The product table has no description column, so product descriptions remain
blank. Checkout saves a delivery request and an item/price snapshot. New
requests appear in `/admin` as pending; staff can confirm or decline them.
Selecting a preferred date/time does not reserve a slot or inventory, confirming
a request does not deduct stock, and no payment or automated email is collected
or sent. Staff must contact the customer to confirm the delivery details.
Apply `database/001-storefront-orders.sql` before deploying the order API. For
existing installations, apply `database/002-free-delivery-time.sql` before
deploying updates that accept a customer-selected delivery time.

### Checkout location suggestions

The checkout Location field provides debounced place suggestions from the
Photon geocoding service using OpenStreetMap data; suggestions are restricted to
Kenya. The checkout includes an interactive map where customers can select a
suggestion, tap to place a pin, or drag the pin to adjust it. Photon verifies
search suggestions; map pins and submitted coordinates are checked against a
local Kenya boundary polygon, so map selection and checkout do not depend on a
server-side geocoding request. Search text is sent to Photon; the Esri street
basemap uses OpenStreetMap and other credited map data. The boundary
is derived from Natural Earth 10m Admin-0 country data (public domain); small
coastal areas around Mombasa and Lamu are included because small urban islands
are omitted from the generalized country polygon. The selected delivery day
and exact customer-selected time are saved as preferences on the request, not
reserved as a confirmed delivery slot.

## Quick preview on GitHub Pages

The site can be hosted at `https://pontypoolsite.github.io` from the
`pontypoolsite/pontypoolsite.github.io` repository. The GitHub Actions workflow builds
the Vite app and deploys `dist`; it also provides the app's client-side routes
with a `404.html` fallback.

In the repository's **Settings → Secrets and variables → Actions → Variables**,
add `VITE_STOREFRONT_API_URL` with the public URL of the deployed Neon
`storefront` function. This URL is public, but `DATABASE_URL`,
`ADMIN_PASSWORD`, and `ADMIN_TOKEN_SECRET` must only be configured in the
Neon Function's server-side environment and must never be added as `VITE_`
variables. The storefront function allows the GitHub Pages origin for
cross-origin catalog and checkout requests.

The production workflow uses the minimum GitHub Actions permissions needed to
build and publish the static site. Enable GitHub Pages with **Build and
deployment → Source: GitHub Actions**. Keep the repository public to make the
preview searchable without signing in.

## Storefront discovery features

The storefront includes room and style entry points, mobile filter sheets, grid
and list product views, recently viewed items, and shareable product and
wishlist links. Product specifications can be entered per variant in the admin
Variants JSON using `dimensions`, `wattage`, `bulbBase`, `voltage`, and
`material`; only add details verified from the product information. The home
page's interactive 3D room is loaded only when a visitor opens it, to keep
initial page loading lighter.

## Deploy to Truehost cPanel

This is a static Vite app. Run `pnpm install` and `pnpm run build`, then upload
the **contents** of the generated `dist` folder to the domain's document root
(usually `public_html`) in Truehost cPanel. The `public/.htaccess` file is copied
into `dist` during the build so direct links to app routes work on Apache.

Before changing DNS, confirm that the Truehost account has an active web-hosting
plan for this domain. Use the hosting plan's displayed server IP/address in the
domain's DNS settings; do not guess the A record. Keep any existing email (MX
and related TXT) records. After DNS points to the hosting plan, enable HTTPS in
cPanel/Truehost and wait for its SSL certificate to become active.
