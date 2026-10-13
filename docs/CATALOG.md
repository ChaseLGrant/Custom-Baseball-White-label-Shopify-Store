# Entering your real supplier pricing

Every price on the site comes from one file: `src/lib/catalog/index.ts`. It currently holds **sample** numbers. This guide explains how to replace them.

## 1. For each product, collect from your supplier

- Garment cost at each quantity break (e.g. 12+, 24+, 48+, 96+)
- Upcharges for larger sizes (2XL, 3XL…)
- Minimum order quantity
- Available colors and sizes
- Production lead time after art approval
- The largest quantity they can reliably fulfill at list price

Add your margin. **The numbers you enter are what customers pay.**

## 2. Edit the product

```ts
pricing: {
  status: "VERIFIED",              // or "QUOTE_REQUIRED" if you can't price it automatically
  tiers: [
    { minQty: 12, unitCents: 4200 }, // $42.00 each for 12–23
    { minQty: 24, unitCents: 3800 },
  ],
  maxAutoQty: 600,                 // above this, the order goes to pricing review
  source: "Acme Sportswear 2027 price list, p.14",
  verifiedAt: "2027-01-15",
},
```

Prices are in **cents** (`4200` = $42.00), which avoids rounding errors.

## 3. Decoration methods

`decorationMethods` holds per-piece prices for each method (embroidery, screen print…), the setup fee, and whether that setup is **one-time per logo** (true for embroidery digitizing: customers never pay it again for the same logo) or charged on every order (screen print screens).

## 4. When to use QUOTE_REQUIRED

Use it when the price can't be known in advance. Examples: fully sublimated custom designs, special fabrics, or a supplier with no published price list. Customers can still build and submit the order. It goes to **Pricing review** in the staff console, you enter the confirmed per-piece price, and the customer pays online.

## 5. Finish

1. Bump `version` (e.g. `"2027.01"`). Every order records the version it was priced with.
2. Set `isSample: false` to remove the warning banner.
3. Run `npm test`. If you changed sample prices that the tests check, update the expected numbers to match.

Existing orders keep the price they were placed at. Drafts and reorders use the new prices.
