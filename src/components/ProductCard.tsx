import Link from "next/link";
import { lowestUnitCents, type Product } from "@/lib/catalog";
import { formatMoney } from "@/lib/domain";
import { SAMPLE_LOGO_URL } from "@/lib/sample-logo";
import { ProductPreview } from "./ProductPreview";

/** Preferred showcase color per product. */
export function showcaseColor(p: Product) {
  for (const c of ["black", "navy", "white"]) if (p.colors.some((x) => x.id === c)) return c;
  return p.colors[0].id;
}

export function ProductCard({ product: p }: { product: Product }) {
  const low = lowestUnitCents(p);
  return (
    <Link href={`/catalog/${p.id}`} className="group flex flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200/80 transition hover:-translate-y-1 hover:shadow-xl">
      <div className="studio relative p-6">
        <ProductPreview
          product={p}
          colorId={showcaseColor(p)}
          single
          decorations={[{ location: p.locations[0].id, logoId: "sample" }]}
          logoUrls={{ sample: SAMPLE_LOGO_URL }}
          numbers={["eye-black", "helmet-decal-kit"].includes(p.id)}
          sampleNumber="7"
          className="mx-auto w-[85%] transition duration-300 group-hover:scale-105"
        />
        <div className="absolute left-4 top-4 flex gap-1">
          {p.colors.slice(0, 6).map((c) => <span key={c.id} className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ background: c.hex }} />)}
          {p.colors.length > 6 && <span className="text-[10px] font-semibold text-slate-400">+{p.colors.length - 6}</span>}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="font-semibold leading-snug">{p.name}</p>
        <p className="mt-1 line-clamp-2 text-sm text-slate-500">{p.tagline}</p>
        <div className="mt-auto flex items-baseline justify-between pt-4">
          <p className="text-sm">
            {low != null ? <><span className="text-slate-500">from </span><span className="text-base font-bold">{formatMoney(low)}</span></> : <span className="font-semibold text-violet-700">Priced per design</span>}
          </p>
          <p className="text-xs text-slate-400">min {p.minQty}</p>
        </div>
      </div>
    </Link>
  );
}
