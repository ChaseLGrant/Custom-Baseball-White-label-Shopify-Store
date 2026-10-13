// Pricing engine. Pure functions, no database access — the same code runs in the
// browser (instant price updates while building an order) and on the server
// (the authoritative price written to the order and sent to Shopify).
//
// Rules:
//   * Product price tiers are based on the order's TOTAL quantity of that product
//     across all teams, so large programs get volume pricing automatically.
//   * Decoration tiers are based on the order's total pieces using that method.
//   * Setup fees are charged once per (logo, method) per order, and only once
//     ever for methods like embroidery digitizing that are kept on file.
//   * Anything we can't price from verified supplier rules is flagged as a
//     quote reason. Those orders are never offered instant checkout.

import { CATALOG, getProduct, type Catalog, type PriceTier, type Product } from "./catalog";
import type { LineConfig } from "./domain";

export interface PricedItem {
  size: string;
  quantity: number;
  name?: string | null;
  number?: string | null;
}

export interface PricingLineInput {
  key: string;
  productId: string;
  config: LineConfig;
  items: PricedItem[];
  /** All-in per-piece price set by staff after a quote review. */
  quotedUnitCents?: number | null;
}

export interface PricingInput {
  lines: PricingLineInput[];
  /** logoId -> decoration methods whose one-time setup is already paid. */
  setupsPaid?: Record<string, string[]>;
  catalog?: Catalog;
}

export type IssueLevel = "error" | "warning" | "quote";
export interface Issue {
  level: IssueLevel;
  message: string;
  lineKey?: string;
}

export interface LinePrice {
  key: string;
  productId: string;
  productName: string;
  quantity: number;
  baseUnitCents: number;
  /** Quantity basis used to choose the tier (whole-order quantity of this product). */
  tierQuantity: number;
  nextTier: { minQty: number; unitCents: number; piecesNeeded: number } | null;
  sizeUpchargeCents: number;
  productCents: number;
  decorationUnitCents: number;
  decorationCents: number;
  personalizationCents: number;
  lineTotalCents: number;
  /** Effective average per-piece price including decoration & personalization. */
  effectiveUnitCents: number;
  needsQuote: boolean;
  issues: Issue[];
}

export interface SetupFee {
  logoId: string;
  method: string;
  methodLabel: string;
  cents: number;
  waived: boolean;
  reason: string;
}

export interface OrderPrice {
  catalogVersion: string;
  lines: LinePrice[];
  setupFees: SetupFee[];
  totalQuantity: number;
  productCents: number;
  decorationCents: number;
  personalizationCents: number;
  setupCents: number;
  shippingCents: number;
  /** Pre-tax total. Sales tax is calculated by Shopify at checkout. */
  totalCents: number;
  issues: Issue[];
  quoteReasons: string[];
  canCheckout: boolean;
}

export function tierFor(tiers: PriceTier[], qty: number): PriceTier | null {
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  let match: PriceTier | null = null;
  for (const t of sorted) if (qty >= t.minQty) match = t;
  return match;
}

export function nextTierFor(tiers: PriceTier[], qty: number): PriceTier | null {
  return [...tiers].sort((a, b) => a.minQty - b.minQty).find((t) => t.minQty > qty) ?? null;
}

const sumQty = (items: PricedItem[]) => items.reduce((n, i) => n + Math.max(0, i.quantity), 0);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function priceOrder(input: PricingInput): OrderPrice {
  const catalog = input.catalog ?? CATALOG;
  const findProduct = (id: string): Product | undefined =>
    input.catalog ? catalog.products.find((p) => p.id === id) : getProduct(id);
  const setupsPaid = input.setupsPaid ?? {};

  // --- Whole-order quantity bases -------------------------------------------
  const qtyByProduct = new Map<string, number>();
  const qtyByMethod = new Map<string, number>();
  for (const line of input.lines) {
    const q = sumQty(line.items);
    qtyByProduct.set(line.productId, (qtyByProduct.get(line.productId) ?? 0) + q);
    if (line.quotedUnitCents != null) continue;
    const methods = new Set(line.config.decorations.map((d) => d.method));
    for (const m of methods) qtyByMethod.set(m, (qtyByMethod.get(m) ?? 0) + q);
  }

  const orderIssues: Issue[] = [];
  const quoteReasons: string[] = [];
  const lines: LinePrice[] = [];
  const setupMap = new Map<string, SetupFee>();

  for (const line of input.lines) {
    const product = findProduct(line.productId);
    const issues: Issue[] = [];
    const err = (message: string) => issues.push({ level: "error", message, lineKey: line.key });
    const warn = (message: string) => issues.push({ level: "warning", message, lineKey: line.key });

    if (!product) {
      err(`Product "${line.productId}" is no longer available.`);
      lines.push(emptyLine(line, "Unavailable product", issues));
      continue;
    }

    const quantity = sumQty(line.items);
    const tierQuantity = qtyByProduct.get(product.id) ?? quantity;
    const quoted = line.quotedUnitCents != null;

    // --- Validation ----------------------------------------------------------
    if (!product.colors.some((c) => c.id === line.config.color)) err("Choose a color.");
    if (quantity === 0) err("Add at least one piece (import a roster or enter sizes).");
    else if (tierQuantity < product.minQty)
      err(`Minimum order is ${product.minQty} ${product.name} — add ${product.minQty - tierQuantity} more.`);

    const missingSize = line.items.filter((i) => i.quantity > 0 && !i.size).length;
    if (missingSize) err(`${plural(missingSize, "player")} missing a size.`);
    const badSizes = [...new Set(line.items.filter((i) => i.size && !product.sizes.includes(i.size)).map((i) => i.size))];
    if (badSizes.length) err(`Size ${badSizes.join(", ")} isn't available for this product.`);

    for (const d of line.config.decorations) {
      const loc = product.locations.find((l) => l.id === d.location);
      if (!loc) err(`Placement "${d.location}" isn't available on this product.`);
      else if (!loc.methods.includes(d.method as never))
        err(`${catalog.decorationMethods[d.method as keyof typeof catalog.decorationMethods]?.label ?? d.method} isn't available at ${loc.label}.`);
      if (!d.logoId) err(`Choose a logo for ${loc?.label ?? d.location}.`);
    }
    if (line.config.names && !product.personalization.names) err("Player names aren't available on this product.");
    if (line.config.numbers && !product.personalization.numbers) err("Player numbers aren't available on this product.");

    const personalized = line.items.filter((i) => i.quantity > 0);
    if (line.config.names) {
      // Roster items carry a name string (possibly blank); extras carry null.
      const missing = personalized.filter((i) => typeof i.name === "string" && !i.name.trim()).length;
      if (missing) warn(`${plural(missing, "piece")} will have no name.`);
    }
    if (line.config.numbers) {
      const nums = personalized.map((i) => i.number?.trim()).filter(Boolean) as string[];
      const dupes = [...new Set(nums.filter((n, idx) => nums.indexOf(n) !== idx))];
      if (dupes.length) warn(`Duplicate numbers: ${dupes.join(", ")}.`);
    }

    // --- Quote checks --------------------------------------------------------
    let needsQuote = false;
    if (!quoted) {
      if (product.pricing.status !== "VERIFIED") {
        needsQuote = true;
        issues.push({ level: "quote", message: `${product.name} is priced per design by the manufacturer.`, lineKey: line.key });
      } else if (tierQuantity > product.pricing.maxAutoQty) {
        needsQuote = true;
        issues.push({
          level: "quote",
          message: `Orders over ${product.pricing.maxAutoQty} ${product.name} need a capacity check with the manufacturer.`,
          lineKey: line.key,
        });
      }
    }

    // --- Money -----------------------------------------------------------------
    let baseUnitCents = 0;
    let sizeUpchargeCents = 0;
    let decorationUnitCents = 0;
    let personalizationCents = 0;
    let nextTier: LinePrice["nextTier"] = null;

    if (quoted) {
      baseUnitCents = line.quotedUnitCents!;
    } else if (!needsQuote) {
      const tier = tierFor(product.pricing.tiers, Math.max(tierQuantity, product.minQty));
      baseUnitCents = tier?.unitCents ?? 0;
      const nt = nextTierFor(product.pricing.tiers, tierQuantity);
      if (nt && tierQuantity >= product.minQty)
        nextTier = { minQty: nt.minQty, unitCents: nt.unitCents, piecesNeeded: nt.minQty - tierQuantity };

      for (const item of line.items) sizeUpchargeCents += (product.sizeUpcharges[item.size] ?? 0) * Math.max(0, item.quantity);

      for (const d of line.config.decorations) {
        const method = catalog.decorationMethods[d.method as keyof typeof catalog.decorationMethods];
        if (!method) continue;
        const methodQty = qtyByMethod.get(d.method) ?? quantity;
        const t = tierFor(method.tiers, Math.max(methodQty, method.minQty));
        decorationUnitCents += t?.unitCents ?? 0;
      }

      if (line.config.names && product.personalization.names) {
        const named = line.items.filter((i) => i.name?.trim()).reduce((n, i) => n + i.quantity, 0);
        personalizationCents += named * product.personalization.names.unitCents;
      }
      if (line.config.numbers && product.personalization.numbers) {
        const numbered = line.items.filter((i) => i.number?.trim()).reduce((n, i) => n + i.quantity, 0);
        personalizationCents += numbered * product.personalization.numbers.unitCents;
      }
    }

    // Setup fees. Quoted lines are all-in prices, so they carry no separate setup.
    if (!quoted && quantity > 0) {
      for (const d of line.config.decorations) {
        if (!d.logoId) continue;
        const method = catalog.decorationMethods[d.method as keyof typeof catalog.decorationMethods];
        if (!method || method.setupCents === 0) continue;
        const id = `${d.logoId}:${method.id}`;
        if (setupMap.has(id)) continue;
        const waived = method.setupOneTimePerLogo && (setupsPaid[d.logoId] ?? []).includes(method.id);
        setupMap.set(id, {
          logoId: d.logoId,
          method: method.id,
          methodLabel: method.label,
          cents: waived ? 0 : method.setupCents,
          waived,
          reason: waived
            ? `${method.label} setup already on file for this logo`
            : method.setupOneTimePerLogo
              ? `One-time ${method.label.toLowerCase()} setup — free on future orders`
              : `${method.label} setup (charged per order)`,
        });
      }
    }

    const productCents = baseUnitCents * quantity + sizeUpchargeCents;
    const decorationCents = decorationUnitCents * quantity;
    const lineTotalCents = productCents + decorationCents + personalizationCents;
    lines.push({
      key: line.key,
      productId: product.id,
      productName: product.name,
      quantity,
      baseUnitCents,
      tierQuantity,
      nextTier,
      sizeUpchargeCents,
      productCents,
      decorationUnitCents,
      decorationCents,
      personalizationCents,
      lineTotalCents,
      effectiveUnitCents: quantity ? Math.round(lineTotalCents / quantity) : 0,
      needsQuote,
      issues,
    });
  }

  // Decoration method minimums (whole order)
  for (const [methodId, qty] of qtyByMethod) {
    const method = catalog.decorationMethods[methodId as keyof typeof catalog.decorationMethods];
    if (method && qty > 0 && qty < method.minQty)
      orderIssues.push({
        level: "error",
        message: `${method.label} requires at least ${method.minQty} pieces per order (you have ${qty}). Choose another method or add pieces.`,
      });
  }

  const allIssues = [...lines.flatMap((l) => l.issues), ...orderIssues];
  for (const i of allIssues) if (i.level === "quote" && !quoteReasons.includes(i.message)) quoteReasons.push(i.message);

  const setupFees = [...setupMap.values()];
  const productCents = lines.reduce((n, l) => n + l.productCents, 0);
  const decorationCents = lines.reduce((n, l) => n + l.decorationCents, 0);
  const personalizationCents = lines.reduce((n, l) => n + l.personalizationCents, 0);
  const setupCents = setupFees.reduce((n, f) => n + f.cents, 0);
  const totalQuantity = lines.reduce((n, l) => n + l.quantity, 0);
  const merchandise = productCents + decorationCents + personalizationCents + setupCents;
  const shippingCents =
    totalQuantity === 0 ? 0 : merchandise >= catalog.shipping.freeOverCents ? 0 : catalog.shipping.flatCents;

  const hasErrors = allIssues.some((i) => i.level === "error");
  return {
    catalogVersion: catalog.version,
    lines,
    setupFees,
    totalQuantity,
    productCents,
    decorationCents,
    personalizationCents,
    setupCents,
    shippingCents,
    totalCents: merchandise + shippingCents,
    issues: allIssues,
    quoteReasons,
    canCheckout: !hasErrors && quoteReasons.length === 0 && totalQuantity > 0,
  };
}

function emptyLine(line: PricingLineInput, name: string, issues: Issue[]): LinePrice {
  return {
    key: line.key,
    productId: line.productId,
    productName: name,
    quantity: sumQty(line.items),
    baseUnitCents: 0,
    tierQuantity: 0,
    nextTier: null,
    sizeUpchargeCents: 0,
    productCents: 0,
    decorationUnitCents: 0,
    decorationCents: 0,
    personalizationCents: 0,
    lineTotalCents: 0,
    effectiveUnitCents: 0,
    needsQuote: false,
    issues,
  };
}
