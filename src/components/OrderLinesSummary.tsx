import { CATALOG, getProduct } from "@/lib/catalog";
import { formatMoney, parseLineConfig } from "@/lib/domain";
import { sizeBreakdown } from "@/lib/roster";
import type { FullOrder } from "@/lib/server/orders";
import { Card, CardHeader } from "./ui";

/** Read-only summary of a submitted order's lines with the frozen roster. */
export function OrderLinesSummary({ order }: { order: FullOrder }) {
  return (
    <Card>
      <CardHeader title="Items" description={`${order.lines.reduce((n, l) => n + l.quantity, 0)} pieces`} />
      <ul className="divide-y divide-slate-100">
        {order.lines.map((l) => {
          const product = getProduct(l.productId);
          const c = parseLineConfig(l.config);
          const color = product?.colors.find((x) => x.id === c.color);
          const personalized = l.items.filter((i) => i.name || i.number);
          return (
            <li key={l.id} className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="h-5 w-5 rounded-full border border-slate-300" style={{ background: color?.hex }} />
                  <div>
                    <p className="font-semibold">{l.quantity} × {product?.name ?? l.productId}</p>
                    <p className="text-sm text-slate-500">{color?.name}{l.team ? ` · ${l.team.name}` : ""}</p>
                  </div>
                </div>
                <p className="font-semibold">{l.quotedUnitCents == null && l.lineTotalCents === 0 ? "Pricing review" : formatMoney(l.lineTotalCents)}</p>
              </div>
              <div className="mt-2 grid gap-1 text-sm text-slate-600">
                {product && <p>Sizes: {sizeBreakdown(product, l.items).map(([s, q]) => `${s}×${q}`).join(", ")}</p>}
                {c.decorations.length > 0 && (
                  <p>
                    Decoration:{" "}
                    {c.decorations
                      .map((d) => `${product?.locations.find((x) => x.id === d.location)?.label ?? d.location} (${CATALOG.decorationMethods[d.method as keyof typeof CATALOG.decorationMethods]?.label ?? d.method})`)
                      .join(", ")}
                  </p>
                )}
                {personalized.length > 0 && (
                  <details>
                    <summary className="cursor-pointer text-brand-600">Names & numbers ({personalized.length})</summary>
                    <ul className="mt-1 columns-2 text-xs sm:columns-3">
                      {personalized.map((i) => <li key={i.id}>{i.number ? `#${i.number} ` : ""}{i.name} — {i.size}</li>)}
                    </ul>
                  </details>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
