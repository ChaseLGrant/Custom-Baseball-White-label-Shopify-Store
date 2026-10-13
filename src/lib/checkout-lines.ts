// Converts a priced order into Shopify custom line items whose total matches our
// price to the cent. Pieces are grouped by their exact per-piece cost (size
// upcharges and personalization make pieces cost different amounts).

import { CATALOG, getProduct } from "./catalog";
import type { LineConfig } from "./domain";
import type { OrderPrice, PricedItem } from "./pricing";

export interface CheckoutLineItem {
  title: string;
  quantity: number;
  unitCents: number;
  attributes: { key: string; value: string }[];
}

export interface CheckoutSourceLine {
  key: string;
  productId: string;
  teamName: string | null;
  config: LineConfig;
  items: PricedItem[];
  quotedUnitCents?: number | null;
}

export function buildCheckoutItems(lines: CheckoutSourceLine[], pricing: OrderPrice): CheckoutLineItem[] {
  const out: CheckoutLineItem[] = [];
  for (const line of lines) {
    const product = getProduct(line.productId);
    const priced = pricing.lines.find((l) => l.key === line.key);
    if (!product || !priced) throw new Error(`Line ${line.key} has no price.`);
    const color = product.colors.find((c) => c.id === line.config.color)?.name ?? line.config.color;

    const groups = new Map<number, { sizes: Map<string, number>; qty: number }>();
    for (const item of line.items) {
      if (item.quantity <= 0) continue;
      let unit: number;
      if (line.quotedUnitCents != null) unit = line.quotedUnitCents;
      else {
        unit = priced.baseUnitCents + (product.sizeUpcharges[item.size] ?? 0) + priced.decorationUnitCents;
        if (line.config.names && product.personalization.names && item.name?.trim()) unit += product.personalization.names.unitCents;
        if (line.config.numbers && product.personalization.numbers && item.number?.trim()) unit += product.personalization.numbers.unitCents;
      }
      const g = groups.get(unit) ?? { sizes: new Map(), qty: 0 };
      g.qty += item.quantity;
      g.sizes.set(item.size, (g.sizes.get(item.size) ?? 0) + item.quantity);
      groups.set(unit, g);
    }

    const decorations = line.config.decorations
      .map((d) => {
        const loc = product.locations.find((l) => l.id === d.location)?.label ?? d.location;
        const m = CATALOG.decorationMethods[d.method as keyof typeof CATALOG.decorationMethods]?.label ?? d.method;
        return `${loc}: ${m}`;
      })
      .join("; ");
    for (const [unitCents, g] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
      const sizes = [...g.sizes.entries()]
        .sort((a, b) => product.sizes.indexOf(a[0]) - product.sizes.indexOf(b[0]))
        .map(([s, q]) => `${s}×${q}`)
        .join(", ");
      out.push({
        title: `${product.name} — ${color}${line.teamName ? ` (${line.teamName})` : ""}`,
        quantity: g.qty,
        unitCents,
        attributes: [
          { key: "SKU", value: product.sku },
          { key: "Sizes", value: sizes },
          ...(decorations ? [{ key: "Decoration", value: decorations }] : []),
          ...(line.config.names ? [{ key: "Names", value: "Yes (per roster)" }] : []),
          ...(line.config.numbers ? [{ key: "Numbers", value: "Yes (per roster)" }] : []),
        ],
      });
    }
  }

  for (const fee of pricing.setupFees) {
    if (fee.cents === 0) continue;
    out.push({
      title: `${fee.methodLabel} setup`,
      quantity: 1,
      unitCents: fee.cents,
      attributes: [{ key: "Note", value: fee.reason }],
    });
  }

  const sum = out.reduce((n, i) => n + i.unitCents * i.quantity, 0);
  const expected = pricing.totalCents - pricing.shippingCents;
  if (sum !== expected) throw new Error(`Checkout total mismatch: line items ${sum} ≠ order ${expected}.`);
  return out;
}
