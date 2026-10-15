// Delivery estimate shown before checkout: proof turnaround + production
// (the slowest product in the order) + ground shipping, in business days.

export const PROOF_DAYS = 2;
export const SHIP_DAYS: [number, number] = [3, 5];

export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from);
  let left = days;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return d;
}

/** Earliest/latest arrival if ordered on `from`, or null with no products. */
export function estimateDelivery(leadTimes: [number, number][], from = new Date()): [Date, Date] | null {
  if (!leadTimes.length) return null;
  const min = Math.max(...leadTimes.map((l) => l[0]));
  const max = Math.max(...leadTimes.map((l) => l[1]));
  return [addBusinessDays(from, PROOF_DAYS + min + SHIP_DAYS[0]), addBusinessDays(from, PROOF_DAYS + max + SHIP_DAYS[1])];
}

export function formatDateRange([a, b]: [Date, Date]): string {
  const f = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${f(a)} – ${f(b)}`;
}
