import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { Badge, Card } from "@/components/ui";
import { ProductPreview } from "@/components/ProductPreview";
import { CATALOG, CATEGORY_LABELS, lowestUnitCents } from "@/lib/catalog";
import { SPORTS, formatMoney } from "@/lib/domain";

export const metadata = { title: "Catalog & pricing" };

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ sport?: string }> }) {
  const { sport } = await searchParams;
  const products = CATALOG.products.filter((p) => !sport || p.sports.includes(sport));
  const categories = [...new Set(products.map((p) => p.category))];
  const sports = [...new Set(CATALOG.products.flatMap((p) => p.sports))];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-black tracking-tight">Catalog & pricing</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Every price, minimum and decoration cost is right here — no quote request needed. Prices drop automatically as your
          program&apos;s total quantity grows, across all of your teams.
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          <Link href="/catalog" className={`rounded-full px-3 py-1 ${!sport ? "bg-brand-900 text-white" : "bg-white ring-1 ring-slate-200"}`}>All sports</Link>
          {sports.map((s) => (
            <Link key={s} href={`/catalog?sport=${s}`} className={`rounded-full px-3 py-1 ${sport === s ? "bg-brand-900 text-white" : "bg-white ring-1 ring-slate-200"}`}>
              {SPORTS[s as keyof typeof SPORTS] ?? s}
            </Link>
          ))}
        </div>

        {categories.map((cat) => (
          <section key={cat} className="mt-10">
            <h2 className="text-lg font-bold">{CATEGORY_LABELS[cat]}</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.filter((p) => p.category === cat).map((p) => {
                const low = lowestUnitCents(p);
                return (
                  <Link key={p.id} href={`/catalog/${p.id}`} className="group">
                    <Card className="h-full p-4 transition group-hover:border-brand-600 group-hover:shadow-md">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <ProductPreview product={p} colorId={p.colors.find((c) => c.id === "navy")?.id ?? p.colors[0].id} decorations={[]} logoUrls={{}} />
                      </div>
                      <div className="mt-3 flex items-start justify-between gap-2">
                        <h3 className="font-semibold">{p.name}</h3>
                        {p.pricing.status === "VERIFIED" ? <Badge tone="green">Instant price</Badge> : <Badge tone="purple">Priced per design</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {low != null ? <>From <strong>{formatMoney(low)}</strong> · </> : null}
                        Min {p.minQty} · {p.colors.length} colors · {p.leadTimeDays[0]}–{p.leadTimeDays[1]} business days
                      </p>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
        <p className="mt-10 text-sm text-slate-500">{CATALOG.shipping.description} Sales tax is calculated at checkout; verified tax-exempt organizations aren&apos;t charged tax.</p>
      </main>
      <SiteFooter />
    </>
  );
}
