import { getProduct } from "./catalog";
import { lineConfigSchema, type LineConfig } from "./domain";

/** A sensible starting configuration for a product added to an order. */
export function defaultLineConfig(productId: string, primaryLogoId: string | null, preferredColor = "navy"): LineConfig {
  const p = getProduct(productId)!;
  const color = p.colors.some((c) => c.id === preferredColor) ? preferredColor : p.colors[0].id;
  const first = p.locations[0];
  return lineConfigSchema.parse({
    color,
    decorations: primaryLogoId && first ? [{ location: first.id, method: first.methods[0], logoId: primaryLogoId }] : [],
    names: false,
    numbers: false,
    sizing: p.sizeField === "none" ? "SIZE_RUN" : "ROSTER",
  });
}
