import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { Badge, ButtonLink, Card, CardHeader } from "@/components/ui";
import { ProductPreview } from "@/components/ProductPreview";
import { DecorationPricing, PriceTiers } from "@/components/PriceTable";
import { CATALOG, getProduct } from "@/lib/catalog";
import { formatMoney } from "@/lib/domain";

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
  const colorId = product.colors.some((c) => c.id === color) ? color! : product.colors[0].id;
  const upcharges = Object.entries(product.sizeUpcharges);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <Card className="p-6">
              <ProductPreview product={product} colorId={colorId} decorations={[]} logoUrls={{}} names={!!product.personalization.names} numbers={!!product.personalization.numbers} />
            </Card>
            <div className="mt-4 flex flex-wrap gap-2" aria-label="Colors">
              {product.colors.map((c) => (
                <a key={c.id} href={`?color=${c.id}`} title={c.name} className={`h-8 w-8 rounded-full border-2 ${c.id === colorId ? "border-brand-600 ring-2 ring-brand-100" : "border-slate-300"}`} style={{ background: c.hex }}>
                  <span className="sr-only">{c.name}</span>
                </a>
              ))}
            </div>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-black tracking-tight">{product.name}</h1>
              {product.pricing.status === "VERIFIED" ? <Badge tone="green">Instant price</Badge> : <Badge tone="purple">Priced per design</Badge>}
            </div>
            <p className="mt-1 text-sm text-slate-500">SKU {product.sku}</p>
            <p className="mt-3 text-slate-700">{product.description}</p>
            <ul className="mt-3 list-inside list-disc text-sm text-slate-600">
              {product.features.map((f) => <li key={f}>{f}</li>)}
            </ul>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-slate-500">Minimum order</dt><dd className="font-semibold">{product.minQty} pieces</dd></div>
              <div><dt className="text-slate-500">Production time</dt><dd className="font-semibold">{product.leadTimeDays[0]}–{product.leadTimeDays[1]} business days after proof approval</dd></div>
              <div><dt className="text-slate-500">Sizes</dt><dd className="font-semibold">{product.sizes.join(", ")}</dd></div>
              <div><dt className="text-slate-500">Logo placements</dt><dd className="font-semibold">{product.locations.map((l) => l.label).join(", ")}</dd></div>
            </dl>
            <ButtonLink href="/signup" variant="accent" className="mt-6">Start an order with this product</ButtonLink>
          </div>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader title="Garment price" description="Based on your order's total quantity of this product — across all teams." />
            <div className="p-5">
              <PriceTiers product={product} />
              {upcharges.length > 0 && (
                <p className="mt-3 text-sm text-slate-500">Size upcharges: {upcharges.map(([s, c]) => `${s} +${formatMoney(c)}`).join(", ")}</p>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title="Decoration & personalization" />
            <div className="p-5"><DecorationPricing product={product} /></div>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
