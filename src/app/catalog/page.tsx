import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { ProductCard } from "@/components/ProductCard";
import { CATALOG, GROUPS } from "@/lib/catalog";

export const metadata = { title: "Shop gear" };

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const { group } = await searchParams;
  const active = GROUPS.find((g) => g.id === group);
  const groups = active ? [active] : GROUPS;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-5 py-12">
        <h1 className="font-display text-6xl">{active ? active.label : "Shop all gear"}</h1>
        <p className="mt-3 max-w-2xl text-lg text-slate-500">
          Every price, minimum and option is right here — no quote request. Prices drop automatically as your program&apos;s total quantity grows.
        </p>
        <nav className="sticky top-[60px] z-30 -mx-5 mt-8 flex gap-2 overflow-x-auto bg-slate-50/90 px-5 py-3 backdrop-blur">
          <Pill href="/catalog" on={!active}>All</Pill>
          {GROUPS.map((g) => <Pill key={g.id} href={`/catalog?group=${g.id}`} on={active?.id === g.id}>{g.label}</Pill>)}
        </nav>

        {groups.map((g) => {
          const items = CATALOG.products.filter((p) => p.group === g.id);
          if (!items.length) return null;
          return (
            <section key={g.id} className="mt-10">
              {!active && (
                <div className="mb-4 flex items-baseline justify-between">
                  <h2 className="font-display text-3xl">{g.label}</h2>
                  <Link href={`/catalog?group=${g.id}`} className="text-sm font-semibold text-slate-500 hover:text-slate-900">See all →</Link>
                </div>
              )}
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {items.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </section>
          );
        })}
        <p className="mt-14 text-sm text-slate-500">{CATALOG.shipping.description} Sales tax is calculated at checkout; verified tax-exempt organizations aren&apos;t charged tax.</p>
      </main>
      <SiteFooter />
    </>
  );
}

function Pill({ href, on, children }: { href: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${on ? "bg-brand-900 text-white" : "bg-surface text-slate-700 ring-1 ring-slate-200 hover:ring-slate-300"}`}>
      {children}
    </Link>
  );
}
