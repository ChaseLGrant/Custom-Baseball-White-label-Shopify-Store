import { describe, expect, it } from "vitest";
import { addBusinessDays, estimateDelivery } from "../src/lib/delivery";

describe("delivery estimate", () => {
  it("skips weekends", () => {
    // Friday + 1 business day = Monday
    expect(addBusinessDays(new Date(2026, 9, 16), 1).getDate()).toBe(19);
  });
  it("uses the slowest product", () => {
    const from = new Date(2026, 9, 12); // Monday
    const [early, late] = estimateDelivery([[5, 8], [10, 15]], from)!;
    // 2 proof + 10 production + 3 ship = 15 business days -> Mon Nov 2
    expect(early.toDateString()).toBe(new Date(2026, 10, 2).toDateString());
    // 2 + 15 + 5 = 22 business days -> Wed Nov 11
    expect(late.toDateString()).toBe(new Date(2026, 10, 11).toDateString());
  });
  it("returns null with nothing selected", () => {
    expect(estimateDelivery([])).toBeNull();
  });
});
