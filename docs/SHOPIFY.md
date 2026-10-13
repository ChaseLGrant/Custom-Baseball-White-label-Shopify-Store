# Connecting Shopify

Club Custom uses your Shopify store for **payments, tax, invoices and fulfillment**. Orders are created as Shopify **Draft Orders** because every order is custom-priced.

> ⚠️ This integration follows Shopify's Admin GraphQL API (version `2025-07`), but it hasn't been tested against a live store yet. Test it in a **development store** first, using the checklist at the bottom.

## 1. Create a custom app

Shopify Admin → **Settings → Apps and sales channels → Develop apps → Create an app**.

Give it these Admin API access scopes:

- `write_draft_orders`, `read_draft_orders`
- `read_orders`, `write_orders`
- `read_fulfillments`
- `read_payment_terms` (needed for purchase-order / Net terms orders)

Install the app and copy the **Admin API access token** (starts with `shpat_`).

## 2. Set environment variables

```
SHOPIFY_STORE_DOMAIN="your-store.myshopify.com"
SHOPIFY_ADMIN_ACCESS_TOKEN="shpat_..."
SHOPIFY_API_VERSION="2025-07"
APP_URL="https://your-club-custom-domain.com"
```

Once these are set, the test checkout page switches off and real checkout is used.

## 3. Webhooks

Shopify Admin → **Settings → Notifications → Webhooks**. Create these, all in JSON format, pointing to `https://YOUR_APP_URL/api/webhooks/shopify`:

| Event | What it does in Club Custom |
|---|---|
| Order payment (`orders/paid`) | Marks the order **Paid**, and the art team queue gets it |
| Fulfillment creation (`fulfillments/create`) | Marks **Shipped** and shows the tracking link |
| Fulfillment update (`fulfillments/update`) | Updates tracking; marks **Delivered** when the carrier confirms |

Copy the webhook signing secret shown on that page into `SHOPIFY_WEBHOOK_SECRET`. Requests without a valid signature are rejected.

## 4. Payment terms (for schools paying by PO)

Shopify supports Net 15/30/45/60 payment terms on orders. When staff approve an organization for "Net 30", its invoice orders are created in Shopify with Net 30 terms and payment pending. Shopify then handles the invoice and payment.

## Test checklist (development store)

- [ ] Card order: build an order, check out, pay with Shopify's test gateway. The order shows **Paid**.
- [ ] Tax-exempt org: the Shopify order shows no tax.
- [ ] Invoice org: the order shows as Net 30, payment pending, with the PO number.
- [ ] Fulfill in Shopify with tracking. The Club Custom order shows **Shipped** with the link.
- [ ] Edit an unpaid order. The old Shopify checkout link stops working.
- [ ] Shopify line items add up exactly to the Club Custom total, plus tax.
