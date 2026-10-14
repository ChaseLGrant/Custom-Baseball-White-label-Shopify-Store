import { CATALOG, type Product } from "@/lib/catalog";
import { formatMoney } from "@/lib/domain";

export function PriceTiers({ product }: { product: Product }) {
  if (product.pricing.status !== "VERIFIED")
    return <p className="text-sm text-slate-600">Priced per design after a quick manufacturer review — you&apos;ll still order, approve and pay online.</p>;
  const tiers = [...product.pricing.tiers].sort((a, b) => a.minQty - b.minQty);
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-slate-500">
          <th className="py-1 font-medium">Quantity</th>
          <th className="py-1 text-right font-medium">Per piece</th>
        </tr>
      </thead>
      <tbody>
        {tiers.map((t, i) => (
          <tr key={t.minQty} className="border-t border-slate-100">
            <td className="py-1.5">{t.minQty}{tiers[i + 1] ? `–${tiers[i + 1].minQty - 1}` : "+"}</td>
            <td className="py-1.5 text-right font-semibold">{formatMoney(t.unitCents)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DecorationPricing({ product }: { product: Product }) {
  const methods = [...new Set(product.locations.flatMap((l) => l.methods))].map((m) => CATALOG.decorationMethods[m]);
  return (
    <div className="space-y-3 text-sm">
      {methods.filter((m) => m.id === "INCLUDED").map((m) => (
        <div key={m.id}>
          <p className="font-semibold">Your logo — included</p>
          <p className="text-slate-500">Custom printing is part of the price. No setup fee.</p>
        </div>
      ))}
      {methods.filter((m) => m.id !== "INCLUDED").map((m) => (
        <div key={m.id}>
          <p className="font-semibold">{m.label}</p>
          <p className="text-slate-500">{m.description}</p>
          <p className="mt-1">
            {m.tiers.map((t) => `${formatMoney(t.unitCents)} (${t.minQty}+)`).join(" · ")} per piece, per location
            {m.minQty > 1 && ` · min ${m.minQty} pieces`}
          </p>
          <p className="text-slate-500">
            {m.setupCents === 0
              ? "No setup fee"
              : `${formatMoney(m.setupCents)} setup per logo${m.setupOneTimePerLogo ? " — one time only, free on every reorder" : " per order"}`}
          </p>
        </div>
      ))}
      {(product.personalization.names || product.personalization.numbers) && (
        <div>
          <p className="font-semibold">Personalization (from your roster)</p>
          {product.personalization.names && <p>{product.personalization.names.label}: {product.personalization.names.unitCents ? `${formatMoney(product.personalization.names.unitCents)} each` : "included"}</p>}
          {product.personalization.numbers && <p>{product.personalization.numbers.label}: {product.personalization.numbers.unitCents ? `${formatMoney(product.personalization.numbers.unitCents)} each` : "included"}</p>}
        </div>
      )}
    </div>
  );
}
