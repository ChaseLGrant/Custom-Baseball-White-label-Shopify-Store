import { describe, expect, it } from "vitest";
import { buildCheckoutItems } from "@/lib/checkout-lines";
import { priceOrder } from "@/lib/pricing";
import { lineConfigSchema } from "@/lib/domain";
import { getProduct } from "@/lib/catalog";
import { buildLineItems } from "@/lib/roster";

describe("buildCheckoutItems", () => {
  it("sends Shopify line items that add up exactly to our price", () => {
    const players = Array.from({ length: 30 }, (_, i) => ({
      name: i % 7 === 0 ? "" : `P${i}`, // some players without names cost less
      number: String(i),
      size: ["S", "M", "L", "2XL", "3XL"][i % 5],
      topSize: null,
      bottomSize: null,
      hatSize: null,
    }));
    const config = lineConfigSchema.parse({
      color: "royal",
      names: true,
      numbers: true,
      decorations: [{ location: "front-chest", method: "TACKLE_TWILL", logoId: "L1" }],
      extras: { XL: 3 },
    });
    const lines = [
      {
        key: "a",
        productId: "jersey-full-button",
        teamName: "Varsity",
        config,
        items: buildLineItems(getProduct("jersey-full-button")!, config, players),
      },
    ];
    const price = priceOrder({ lines });
    const items = buildCheckoutItems(lines, price);
    const sum = items.reduce((n, i) => n + i.unitCents * i.quantity, 0);
    expect(sum).toBe(price.totalCents - price.shippingCents);
    expect(items.find((i) => i.title === "Tackle twill setup")?.unitCents).toBe(3500);
    expect(items[0].title).toBe("Pro Full-Button Jersey — Royal (Varsity)");
  });
});
