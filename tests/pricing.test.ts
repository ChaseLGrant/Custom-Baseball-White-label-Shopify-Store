import { describe, expect, it } from "vitest";
import { priceOrder, tierFor } from "@/lib/pricing";
import { lineConfigSchema, type LineConfig } from "@/lib/domain";
import { CATALOG, getProduct } from "@/lib/catalog";
import { buildLineItems, type RosterPlayerLike } from "@/lib/roster";

const cfg = (c: Partial<LineConfig>): LineConfig => lineConfigSchema.parse({ color: "navy", ...c });

const roster = (n: number): RosterPlayerLike[] =>
  Array.from({ length: n }, (_, i) => ({
    name: `Player ${i + 1}`,
    number: String(i + 1),
    size: i % 5 === 0 ? "2XL" : "L",
    topSize: null,
    bottomSize: null,
    hatSize: null,
  }));

function line(productId: string, config: LineConfig, players: RosterPlayerLike[], key = productId) {
  const product = getProduct(productId)!;
  return { key, productId, config, items: buildLineItems(product, config, players) };
}

describe("tierFor", () => {
  const tiers = [
    { minQty: 12, unitCents: 1000 },
    { minQty: 24, unitCents: 900 },
  ];
  it("picks the highest tier reached", () => {
    expect(tierFor(tiers, 12)?.unitCents).toBe(1000);
    expect(tierFor(tiers, 23)?.unitCents).toBe(1000);
    expect(tierFor(tiers, 24)?.unitCents).toBe(900);
    expect(tierFor(tiers, 11)).toBeNull();
  });
});

describe("priceOrder — the core coach story (25 jerseys, pants, hats, BP tees)", () => {
  const players = roster(25); // 5 players are 2XL
  const logo = "logo1";
  const result = priceOrder({
    lines: [
      line("jersey-full-button", cfg({
        color: "navy",
        decorations: [{ location: "front-chest", method: "TACKLE_TWILL", logoId: logo }],
        names: true,
        numbers: true,
      }), players),
      line("pants-piped", cfg({ color: "gray" }), players),
      line("hat-stretch-fit", cfg({ color: "navy", decorations: [{ location: "front", method: "EMBROIDERY", logoId: logo }] }), players),
      line("bp-tee", cfg({ color: "navy", decorations: [{ location: "front-center", method: "SCREEN_PRINT", logoId: logo }] }), players),
    ],
  });

  it("can be checked out with no errors or quotes", () => {
    expect(result.issues.filter((i) => i.level !== "warning")).toEqual([]);
    expect(result.canCheckout).toBe(true);
    expect(result.totalQuantity).toBe(100);
  });

  it("prices jerseys at the 24+ tier with big-size upcharges and personalization", () => {
    const j = result.lines[0];
    expect(j.baseUnitCents).toBe(3800);
    expect(j.sizeUpchargeCents).toBe(5 * 200);
    expect(j.decorationUnitCents).toBe(1200); // tackle twill 24+
    expect(j.personalizationCents).toBe(25 * (700 + 900));
    expect(j.lineTotalCents).toBe(25 * 3800 + 1000 + 25 * 1200 + 25 * 1600);
  });

  it("maps apparel sizes to cap sizes", () => {
    const hatItems = buildLineItems(getProduct("hat-stretch-fit")!, cfg({}), players);
    expect(new Set(hatItems.map((i) => i.size))).toEqual(new Set(["M/L", "L/XL"]));
  });

  it("charges each (logo, method) setup once", () => {
    expect(result.setupFees.map((f) => [f.method, f.cents])).toEqual([
      ["TACKLE_TWILL", 3500],
      ["EMBROIDERY", 4000],
      ["SCREEN_PRINT", 2500],
    ]);
  });

  it("gets free shipping over the threshold", () => {
    expect(result.shippingCents).toBe(0);
    expect(result.totalCents).toBe(
      result.productCents + result.decorationCents + result.personalizationCents + result.setupCents,
    );
  });
});

describe("priceOrder — rules", () => {
  it("waives one-time setup already paid for a logo (reorders)", () => {
    const r = priceOrder({
      lines: [line("hat-stretch-fit", cfg({ decorations: [{ location: "front", method: "EMBROIDERY", logoId: "L" }] }), roster(12))],
      setupsPaid: { L: ["EMBROIDERY"] },
    });
    expect(r.setupFees[0]).toMatchObject({ waived: true, cents: 0 });
  });

  it("does not waive per-order setup like screen printing", () => {
    const r = priceOrder({
      lines: [line("bp-tee", cfg({ decorations: [{ location: "front-center", method: "SCREEN_PRINT", logoId: "L" }] }), roster(12))],
      setupsPaid: { L: ["SCREEN_PRINT"] },
    });
    expect(r.setupFees[0]).toMatchObject({ waived: false, cents: 2500 });
  });

  it("aggregates quantity across teams for volume tiers", () => {
    const r = priceOrder({
      lines: [
        line("bp-tee", cfg({}), roster(12), "varsity"),
        line("bp-tee", cfg({}), roster(12), "jv"),
      ],
    });
    expect(r.lines.every((l) => l.baseUnitCents === 1500)).toBe(true); // 24+ tier
  });

  it("blocks checkout under the minimum and says how many to add", () => {
    const r = priceOrder({ lines: [line("jersey-full-button", cfg({}), roster(8))] });
    expect(r.canCheckout).toBe(false);
    expect(r.issues.find((i) => i.level === "error")?.message).toMatch(/add 4 more/);
  });

  it("enforces decoration method minimums across the order", () => {
    const strict = {
      ...CATALOG,
      decorationMethods: { ...CATALOG.decorationMethods, SCREEN_PRINT: { ...CATALOG.decorationMethods.SCREEN_PRINT, minQty: 24 } },
    };
    const deco = cfg({ decorations: [{ location: "front-center", method: "SCREEN_PRINT", logoId: "L" }] });
    const small = priceOrder({ catalog: strict, lines: [line("bp-tee", deco, roster(12))] });
    expect(small.canCheckout).toBe(false);
    expect(small.issues.some((i) => /Screen print requires at least 24/.test(i.message))).toBe(true);
    const big = priceOrder({ catalog: strict, lines: [line("bp-tee", deco, roster(12), "a"), line("bp-tee", deco, roster(12), "b")] });
    expect(big.canCheckout).toBe(true);
  });

  it("routes quote-required products to review instead of instant checkout", () => {
    const r = priceOrder({ lines: [line("sublimated-jersey", cfg({}), roster(15))] });
    expect(r.canCheckout).toBe(false);
    expect(r.quoteReasons.length).toBe(1);
    expect(r.lines[0].lineTotalCents).toBe(0);
  });

  it("accepts a staff quote and then allows checkout", () => {
    const l = { ...line("sublimated-jersey", cfg({}), roster(15)), quotedUnitCents: 6500 };
    const r = priceOrder({ lines: [l] });
    expect(r.canCheckout).toBe(true);
    expect(r.lines[0].lineTotalCents).toBe(15 * 6500);
  });

  it("requires a quote above the automatic quantity limit", () => {
    const p = getProduct("equipment-bag")!;
    const r = priceOrder({
      lines: [{ key: "b", productId: p.id, config: cfg({ color: "black" }), items: [{ size: "OS", quantity: p.pricing.maxAutoQty + 1 }] }],
    });
    expect(r.quoteReasons[0]).toMatch(/capacity check/);
  });

  it("flags invalid placements, missing logos and bad sizes", () => {
    const r = priceOrder({
      lines: [
        {
          key: "j",
          productId: "hat-stretch-fit",
          config: cfg({ decorations: [{ location: "front", method: "SCREEN_PRINT", logoId: null }] }),
          items: [{ size: "XXXXL", quantity: 12 }],
        },
      ],
    });
    const msgs = r.issues.map((i) => i.message).join(" | ");
    expect(msgs).toMatch(/Screen print isn't available/);
    expect(msgs).toMatch(/Choose a logo/);
    expect(msgs).toMatch(/Size XXXXL/);
  });

  it("charges flat shipping on small orders", () => {
    const r = priceOrder({ lines: [line("hat-stretch-fit", cfg({}), roster(12))] });
    expect(r.shippingCents).toBe(CATALOG.shipping.flatCents);
  });

  it("warns about duplicate numbers", () => {
    const players = roster(12).map((p) => ({ ...p, number: "7" }));
    const r = priceOrder({ lines: [line("jersey-full-button", cfg({ numbers: true }), players)] });
    expect(r.issues.some((i) => i.level === "warning" && /Duplicate numbers: 7/.test(i.message))).toBe(true);
    expect(r.canCheckout).toBe(true);
  });

  it("tells the coach how many pieces unlock the next price break", () => {
    const r = priceOrder({ lines: [line("bp-tee", cfg({}), roster(20))] });
    expect(r.lines[0].nextTier).toEqual({ minQty: 24, unitCents: 1500, piecesNeeded: 4 });
  });
});
