// The configuration the one-screen order builds for each product. Shared by
// the page (live price) and the server action (the real order) so they match.
import type { Product } from "./catalog";
import { lineConfigSchema, type LineConfig } from "./domain";
import { playerSizeFor } from "./roster";

export interface QuickOptions {
  color: string;
  logoId: string | null;
  /** Players on the roster being used (0 = no roster). */
  rosterCount: number;
  personalize: boolean;
  /** Apparel size run when there's no roster, e.g. { M: 10, L: 8 }. */
  sizeRun: Record<string, number>;
  /** Quantity for team-supply items (pine tar, wrist tape). */
  teamQty?: number;
}

/** Products that get player names / numbers by default when personalizing. */
const NAME_DEFAULT = new Set<Product["category"]>(["JERSEY"]);
const NUMBER_DEFAULT = new Set<Product["category"]>(["JERSEY", "HELMET"]);

export function pickColor(p: Product, color: string) {
  return p.colors.some((c) => c.id === color) ? color : p.colors.some((c) => c.id === "gray") ? "gray" : p.colors[0].id;
}

export function quickLineConfig(p: Product, o: QuickOptions): LineConfig {
  const loc = p.locations[0];
  const base = {
    color: pickColor(p, o.color),
    decorations: o.logoId && loc ? [{ location: loc.id, method: loc.methods[0], logoId: o.logoId }] : [],
  };
  if (p.orderUnit === "team") {
    return lineConfigSchema.parse({ ...base, sizing: "SIZE_RUN", sizeRun: { [p.sizes[0]]: o.teamQty ?? p.defaultTeamQty ?? p.minQty } });
  }
  if (o.rosterCount > 0) {
    return lineConfigSchema.parse({
      ...base,
      sizing: "ROSTER",
      names: o.personalize && NAME_DEFAULT.has(p.category) && !!p.personalization.names,
      numbers: o.personalize && NUMBER_DEFAULT.has(p.category) && !!p.personalization.numbers,
    });
  }
  // No roster: convert the apparel size run into this product's sizes (caps, gloves, helmets…).
  const sizeRun: Record<string, number> = {};
  for (const [size, qty] of Object.entries(o.sizeRun)) {
    if (!qty) continue;
    const s = playerSizeFor(p, { name: "", number: null, size, topSize: null, bottomSize: null, hatSize: null }) || p.sizes[0];
    sizeRun[s] = (sizeRun[s] ?? 0) + qty;
  }
  return lineConfigSchema.parse({ ...base, sizing: "SIZE_RUN", sizeRun });
}
