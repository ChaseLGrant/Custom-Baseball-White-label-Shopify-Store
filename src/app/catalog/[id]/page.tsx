import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { Badge, ButtonLink } from "@/components/ui";
import { ProductPreview } from "@/components/ProductPreview";
import { ProductCard, showcaseColor } from "@/components/ProductCard";
import { DecorationPricing, PriceTiers } from "@/components/PriceTable";
import { CATALOG, GROUPS, getProduct, lowestUnitCents } from "@/lib/catalog";
import { formatMoney } from "@/lib/domain";
import { SAMPLE_LOGO_URL } from "@/lib/sample-logo";

export function generateStaticParams() {
  return CATALOG.products.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: getProduct((await params).id)?.name ?? "Product" };
}

export default async function ProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ color?: string }> }) {
  const product = getProduct((await params).id);
  if (!product) notFound();
  const { color } = await searchParams;
  const colorId = product.colors.some((c) => c.id === color) ? color! : showcaseColor(product);
  const low = lowestUnitCents(product);
  const upcharges = Object.entries(product.sizeUpcharges);
  const group = GROUPS.find((g) => g.id === product.group)!;
  const related = CATALOG.products.filter((p) => p.group === product.group && p.id !== product.id).slice(0, 4);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-5 py-10">
        <Link href={`/catalog?group=${group.id}`} className="text-sm font-medium text-slate-500 hover:text-slate-900">← {group.label}</Link>
        <div className="mt-4 grid gap-10 lg:grid-cols-[1.25fr_1fr]">
          <div className="studio rounded-[2rem] p-8 ring-1 ring-slate-200/80 sm:p-12">
            <ProductPreview
              product={product}
              colorId={colorId}
              decorations={product.locations.slice(0, 1).map((l) => ({ location: l.id, logoId: "sample" }))}
              logoUrls={{ sample: SAMPLE_LOGO_URL }}
              names={!!product.personalization.names}
              numbers={!!product.personalization.numbers}
              sampleName="RIVERA"
              sampleNumber="7"
            />
            <p className="mt-4 text-center text-xs text-slate-400">Shown with a sample logo. You&apos;ll see your own logo as you order.</p>
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="flex flex-wrap items-center gap-2">
              {product.pricing.status === "VERIFIED" ? <Badge tone="green">Instant price</Badge> : <Badge tone="purple">Priced per design</Badge>}
              <span className="text-xs text-slate-400">SKU {product.sku}</span>
            </div>
            <h1 className="font-display mt-3 text-5xl">{product.name}</h1>
            <p className="mt-3 text-lg text-slate-600">{product.description}</p>
            {low != null && (
              <p className="mt-5 text-slate-500">
                From <span className="text-3xl font-bold text-slate-900">{formatMoney(low)}</span>
                {product.unitLabel ? ` / ${product.unitLabel}` : " each"}
              </p>
            )}

            <p className="mt-6 text-sm font-semibold">Color: {product.colors.find((c) => c.id === colorId)?.name}</p>
            <div className="mt-2 flex flex-wrap gap-2" aria-label="Colors">
              {product.colors.map((c) => (
                <Link key={c.id} href={`?color=${c.id}`} scroll={false} title={c.name}
                  className={`h-9 w-9 rounded-full ring-offset-2 transition ${c.id === colorId ? "ring-2 ring-accent-500" : "ring-1 ring-slate-200 hover:ring-slate-400"}`}
                  style={{ background: c.hex }}>
                  <span className="sr-only">{c.name}</span>
                </Link>
              ))}
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
              {[
                ["Minimum", `${product.minQty} ${product.unitLabel ? product.unitLabel + "s" : "pieces"}`],
                ["Ready in", `${product.leadTimeDays[0]}–${product.leadTimeDays[1]} business days`],
                ["Sizes", product.sizes.join(" · ")],
                ["Your logo", product.locations.map((l) => l.label).join(", ")],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-surface p-3.5 ring-1 ring-slate-200/80">
                  <dt className="text-xs text-slate-500">{k}</dt>
                  <dd className="mt-0.5 font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            <ButtonLink href={`/order?add=${product.id}`} variant="accent" className="mt-6 w-full py-3.5 text-base">Customize & order →</ButtonLink>
            <ul className="mt-4 space-y-1 text-sm text-slate-600">
              {product.features.map((f) => <li key={f}>✓ {f}</li>)}
            </ul>
          </div>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl bg-surface p-6 ring-1 ring-slate-200/80">
            <h2 className="text-lg font-bold">Price per {product.unitLabel ?? "piece"}</h2>
            <p className="mb-3 text-sm text-slate-500">Based on your order&apos;s total quantity of this product — across all teams.</p>
            <PriceTiers product={product} />
            {upcharges.length > 0 && <p className="mt-3 text-sm text-slate-500">Size upcharges: {upcharges.map(([s, c]) => `${s} +${formatMoney(c)}`).join(", ")}</p>}
          </div>
          <div className="rounded-3xl bg-surface p-6 ring-1 ring-slate-200/80">
            <h2 className="mb-3 text-lg font-bold">Logo & personalization</h2>
            <DecorationPricing product={product} />
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-4xl">More {group.label.toLowerCase()}</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{related.map((p) => <ProductCard key={p.id} product={p} />)}</div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
