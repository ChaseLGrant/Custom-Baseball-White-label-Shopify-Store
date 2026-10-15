# Club Custom

Self-service custom team uniform ordering for high schools, colleges, travel and club programs. A coach can upload a logo, import a roster, build a multi-product order, see the exact price, pay online, approve the proof, and track the shipment without talking to a salesperson.

> **Status: working MVP with sample pricing.** Every workflow below runs end to end locally. Before you take real orders, work through [Before going live](#before-going-live). The most important item is replacing the **sample prices** with your real supplier pricing.

---

## How few clicks it takes

| Situation | What the coach does |
|---|---|
| **First order ever** | Open `/order`, drop a logo, drop a roster spreadsheet, type name/email/school/password, press **Pay**. The uniform kit is pre-selected. Shopify collects the shipping address and payment. |
| **Returning coach** | **New order → Pay.** The saved logo and roster are already filled in. |
| **Next season** | **Reorder & pay**: one click from the dashboard to payment, at today's prices with the current roster. |

The full order builder (multiple teams, custom placements, PO/invoice) is still there for athletic directors who need it, but it is never required.

## What teams can customize

| Group | Products |
|---|---|
| Uniforms | Full-button jerseys, piped pants, **custom belts**, **knit team socks**, sublimated jerseys (quote) |
| Helmets & caps | **Custom batting helmets** (logo decals + back numbers), **helmet decal kits**, stretch-fit caps |
| Player gear | **Custom batting gloves**, **sliding mitts**, **compression arm sleeves**, equipment backpacks |
| Game-day extras | **Printed bat grips**, **custom-label pine tar**, **printed wrist tape**, **custom eye black** (logo or player numbers) |
| Practice & travel | BP tees, fleece hoodies |

Sizes for gloves, helmets, belts, mitts and socks are worked out from each player's roster size. Team supplies (pine tar, wrist tape) are ordered by quantity.

### Product images

Every product has a detailed mockup drawn in the team's color with their real logo on it. To use **real product photos** instead, add your supplier's blank product shots to `photos` on a product in `src/lib/catalog/index.ts` (one image per color). The customer's logo is then placed on the photo automatically. See [docs/CATALOG.md](docs/CATALOG.md).

---

## Quick start (local)

You need [Node.js 20+](https://nodejs.org).

```bash
npm install
cp .env.example .env        # point DATABASE_URL / DIRECT_URL at a Postgres database
npm run setup               # creates the local database + demo data
npm run dev                 # open http://localhost:3000
```

Demo accounts (password `clubcustom123`):

| Who | Email | Try this |
|---|---|---|
| Coach / owner | `coach@lincoln.test` | Click **New order → Pay**, try **Reorder & pay**, approve the waiting proof |
| Club Custom staff | `staff@clubcustom.test` | Upload proofs, price quote-only items, verify tax-exempt certificates |

Shopify isn't connected by default, so checkout runs in **test mode**: a clearly labelled fake payment page, and no card is charged. See [docs/SHOPIFY.md](docs/SHOPIFY.md) to connect a real store.

Other commands: `npm test` (unit tests), `npm run lint` (type check), `npm run build`, `npm run db:reset` (wipe and re-seed).

### Deploying to Netlify

`netlify.toml` runs `prisma generate && next build`; Netlify's Next.js runtime is applied automatically. Set these site environment variables: `DATABASE_URL` (pooled, e.g. Supabase transaction pooler on port 6543 with `?pgbouncer=true&connection_limit=1`), `DIRECT_URL`, `APP_URL` (the site URL) and `SHOPIFY_API_VERSION`. Leave the other `SHOPIFY_*` variables blank to keep test checkout mode. Create the tables once with `npx prisma db push` and load demo data with `npm run db:seed` (the seed wipes the database).

---

## How the 10 requirements are met

| # | Requirement | Where it lives |
|---|---|---|
| 1 | **Upload a logo once** | *Logos* page. Logos belong to the organization and appear in every order's logo picker. One-time setup fees (embroidery digitizing) are remembered per logo and waived on later orders. |
| 2 | **Verified catalog** | Public `/catalog`, no login needed. It shows every price tier, minimum, color, size, placement, decoration cost and lead time. |
| 3 | **Customize instantly** | Order builder: color swatches, logo + method for each placement, names and numbers, and a live front/back preview. |
| 4 | **Whole-program orders** | One order can hold any number of products across many teams and sports. Volume tiers count the **whole order's** quantity, so the program gets bulk pricing. |
| 5 | **Transparent pricing** | `src/lib/pricing.ts` calculates garment tiers, size upcharges, decoration, personalization, setup and shipping. The same code runs in the browser (instant) and on the server (authoritative). Items that can't be priced automatically are flagged instead of guessed. |
| 6 | **Roster upload** | Each team keeps a roster imported from Excel/CSV. Messy headers ("Player Name", "Jersey #", "Pant Size") and sizes ("Adult Large", "XXL", "Youth M") are recognized. Orders pull names, numbers and per-product sizes from it. Hat sizes are estimated when there's no hat column. |
| 7 | **Online checkout** | Shopify Draft Orders with exact custom line items. Card payment goes through Shopify's secure checkout. Verified tax-exempt orgs are sent as tax-exempt. Orgs with approved terms can pay by **purchase order on Net 15–60 invoice terms**. Tax exemption and terms both need a staff verification step. |
| 8 | **Online proof approval** | Staff upload a proof. The coach approves it (with a checklist confirmation) or requests changes, all in the portal. Production starts only after approval. |
| 9 | **Order tracking** | 6-step progress tracker, activity log, and carrier tracking links. Shopify webhooks mark orders paid and shipped automatically. |
| 10 | **Reorder in minutes** | "↻ Reorder" copies products, colors and logos into a new draft at today's prices, using each team's current roster. Saved designs add a configured uniform in one click. |

**Large-organization features** (all optional; the default flow stays simple): multiple teams, logos, users with roles (Owner / Admin / Purchaser / Coach) and email invites, multiple shipping addresses, internal approval for coaches' orders above a dollar amount, PO numbers, saved designs, and an organization switcher for people who belong to several programs.

**Honest by design:** fully custom products (the sample "sublimated jersey") and orders above a product's automatic quantity limit go to **pricing review** instead of getting a made-up price. Staff enter the confirmed price and the customer pays online. No phone call is needed, and no instant price is promised that can't be kept.

---

## The only manual steps (staff console at `/staff`)

1. **Verify** tax-exempt certificates and invoice-terms applications (once per organization).
2. **Price** quote-required items after checking with the manufacturer.
3. **Upload proofs** for paid orders.
4. **Add tracking** only for shipments fulfilled outside Shopify (Shopify fulfillments sync automatically).

---

## Project layout

```
src/lib/catalog/        Products + supplier pricing rules (SAMPLE DATA — edit this)
src/lib/pricing.ts      Pricing engine (pure, unit-tested)
src/lib/roster.ts       Roster spreadsheet parsing and roster → line items
src/lib/checkout-lines.ts  Converts a priced order into exact Shopify line items
src/lib/server/         Database, auth, file storage, Shopify API, order lifecycle
src/lib/actions/        Server actions behind every form
src/app/                Pages: public site, /app customer portal, /staff console
prisma/schema.prisma    Database schema
tests/                  Unit tests (pricing, roster, checkout totals)
```

Tech: Next.js 15 (App Router) + TypeScript, Prisma (Postgres), Tailwind CSS, Shopify Admin GraphQL API.

---

## Before going live

These are required before real customers use the site:

- [ ] **Real pricing.** Replace every sample price in `src/lib/catalog/index.ts` with your supplier price list plus margin, then set `isSample: false`. Step-by-step instructions are in [docs/CATALOG.md](docs/CATALOG.md). Until you do, a yellow banner warns every visitor.
- [ ] **Connect Shopify and test it in a development store.** The Shopify code follows the Admin GraphQL API, but **it has not been run against a real store yet** because no store credentials were available. Place a test card order, a Net 30 invoice order and a fulfillment, and confirm the webhooks update the order. See [docs/SHOPIFY.md](docs/SHOPIFY.md).
- [x] **Production database.** The schema now uses Postgres (`provider = "postgresql"`). Set `DATABASE_URL` (pooled) and `DIRECT_URL` (direct, for `prisma db push`). Supabase, Neon or Railway all work. Local development needs a Postgres too (see `.env.example`).
- [x] **Production file storage.** Uploads (logos, proofs, certificates) are stored in the database (`StoredFile` table), so they survive on serverless hosts like Netlify. To move them to S3 / Supabase Storage later, only `src/lib/server/storage.ts` changes.
- [ ] **Email notifications.** Not built yet. Customers currently see updates in the portal only. Add emails for "proof ready", "payment needed", "approval needed", "shipped" and invite links (Resend or Postmark are simple options). Shopify already emails payment receipts.
- [ ] **Password reset.** Not built yet. Add a "forgot password" email link before launch.
- [ ] **Login rate limiting.** Add basic throttling on `/login` to slow down password guessing.
- [ ] **Legal pages.** Terms, privacy policy, and a return/reprint policy for custom goods.

Nice next steps: split one order across several ship-to addresses, auto-generated proof sheets from the builder preview, admin UI for editing the catalog, and analytics on where coaches drop off.

`npm audit` reports advisories in development-only tools (Vitest, Prisma CLI) and in `exceljs`'s `uuid` dependency. None of them are exposed to site visitors. Upgrade them when fixed versions are released.
