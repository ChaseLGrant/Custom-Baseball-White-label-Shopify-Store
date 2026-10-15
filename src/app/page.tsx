import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { ButtonLink } from "@/components/ui";
import { ProductPreview } from "@/components/ProductPreview";
import { GROUPS, getProduct, lowestUnitCents, type Product } from "@/lib/catalog";
import { formatMoney } from "@/lib/domain";
import { SAMPLE_LOGO_URL } from "@/lib/sample-logo";
import { priceOrder } from "@/lib/pricing";
import { buildLineItems } from "@/lib/roster";
import { quickLineConfig } from "@/lib/quick-config";
import { UNIFORM_KIT_PRODUCT_IDS } from "@/lib/catalog";

/** Live price of the 25-player uniform kit, so the homepage never shows a stale number. */
function kitPrice() {
  const roster = Array.from({ length: 25 }, (_, i) => ({ name: `P${i}`, number: String(i), size: ["S", "M", "L", "XL"][i % 4], topSize: null, bottomSize: null, hatSize: null }));
  const lines = UNIFORM_KIT_PRODUCT_IDS.map((id) => {
    const p = getProduct(id)!;
    const config = quickLineConfig(p, { color: "navy", logoId: "sample", rosterCount: 25, personalize: true, sizeRun: {} });
    return { key: id, productId: id, config, items: buildLineItems(p, config, roster) };
  });
  return priceOrder({ lines }).totalCents;
}

const logos = { sample: SAMPLE_LOGO_URL };
function Mock({ id, color, className, numbers = false }: { id: string; color: string; className?: string; numbers?: boolean }) {
  const p = getProduct(id)!;
  return <ProductPreview product={p} colorId={color} single decorations={[{ location: p.locations[0].id, logoId: "sample" }]} logoUrls={logos} numbers={numbers} sampleNumber="7" className={className} />;
}

const GROUP_HERO: Record<Product["group"], [string, string]> = {
  uniforms: ["jersey-full-button", "black"],
  headwear: ["batting-helmet", "black"],
  gear: ["batting-gloves", "black"],
  gameday: ["eye-black", "white"],
  apparel: ["fleece-hoodie", "black"],
};

export default function Home() {
  return (
    <>
      <SiteHeader dark />
      <main>
        {/* Hero */}
        <section className="studio-dark relative overflow-hidden text-white">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-20 pt-14 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-accent-400 ring-1 ring-white/15">
                Custom team gear · No sales calls
              </p>
              <h1 className="font-display mt-6 text-6xl sm:text-7xl lg:text-[88px]">
                Outfit the<br />whole team.<br /><span className="text-accent-500">In two clicks.</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg text-slate-600">
                Drop in your logo and roster. See every player&apos;s jersey, helmet, gloves and grips with your logo on them — and the exact price. Pay online. Done.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/order" variant="accent" className="px-7 py-3.5 text-base">Start your order →</ButtonLink>
                <ButtonLink href="/catalog" variant="secondary" className="px-7 py-3.5 text-base">Shop all gear</ButtonLink>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
                {["Real prices up front", "Roster upload", "Approve proofs online", "1-click reorders"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5"><span className="text-accent-500">✓</span>{t}</span>
                ))}
              </div>
            </div>

            {/* Product collage */}
            <div className="relative mx-auto aspect-square w-full max-w-[560px]">
              <div className="absolute inset-[12%] rounded-full bg-accent-500/10 blur-3xl" />
              <Mock id="batting-helmet" color="black" className="absolute left-[2%] top-[4%] w-[58%] drop-shadow-2xl" />
              <Mock id="jersey-full-button" color="white" className="absolute right-[0%] top-[0%] w-[44%] drop-shadow-2xl" />
              <Mock id="batting-gloves" color="black" className="absolute bottom-[4%] left-[6%] w-[34%] drop-shadow-2xl" />
              <Mock id="team-socks" color="black" className="absolute bottom-[0%] left-[36%] w-[30%] drop-shadow-2xl" />
              <Mock id="bat-grip" color="black" className="absolute bottom-[6%] right-[4%] w-[26%] drop-shadow-2xl" />
              <div className="absolute right-[2%] top-[46%] rounded-2xl bg-surface px-4 py-3 text-slate-900 shadow-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">25 players · full kit</p>
                <p className="font-display text-3xl">{formatMoney(kitPrice()).replace(/\.00$/, "")}</p>
                <p className="text-xs text-emerald-600">Instant price · free shipping</p>
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="mx-auto max-w-7xl px-5 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-5xl">Everything with your logo on it</h2>
            <Link href="/catalog" className="text-sm font-semibold text-slate-900 hover:text-accent-600">View all gear →</Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {GROUPS.map((g) => {
              const [id, color] = GROUP_HERO[g.id];
              return (
                <Link key={g.id} href={`/catalog?group=${g.id}`} className="group overflow-hidden rounded-3xl bg-surface ring-1 ring-slate-200/80 transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="studio p-6"><Mock id={id} color={color} className="mx-auto w-4/5 transition duration-300 group-hover:scale-105" /></div>
                  <div className="p-5">
                    <p className="font-display text-2xl">{g.label}</p>
                    <p className="mt-1 text-sm text-slate-500">{g.blurb}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="bg-surface py-20">
          <div className="mx-auto max-w-7xl px-5">
            <h2 className="font-display text-5xl">How it works</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {[
                ["01", "Drop your logo", "Upload once. It's saved for every team, every season — and shows up on every mockup instantly."],
                ["02", "Drop your roster", "Any spreadsheet. Names, numbers and sizes are read automatically and matched to every product."],
                ["03", "Pay & approve", "See the exact total, pay securely through Shopify, then approve your production proof online."],
              ].map(([n, t, b]) => (
                <div key={n} className="rounded-3xl bg-slate-50 p-8">
                  <p className="font-display text-6xl text-accent-500">{n}</p>
                  <p className="mt-4 text-xl font-bold">{t}</p>
                  <p className="mt-2 text-slate-600">{b}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm text-slate-500">Next season? One click: <strong>Reorder &amp; pay</strong> — same gear, today&apos;s prices, your updated roster.</p>
          </div>
        </section>

        {/* Game-day extras */}
        <section className="mx-auto max-w-7xl px-5 py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-accent-600">The details that make a team</p>
              <h2 className="font-display mt-3 text-5xl">Game-day extras</h2>
              <p className="mt-4 text-lg text-slate-600">Eye black with every player&apos;s number. Pine tar with your label. Grips and wrist tape printed with your logo. Add them to any order in one tap.</p>
              <ButtonLink href="/catalog?group=gameday" variant="primary" className="mt-6">Shop game-day extras</ButtonLink>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[["eye-black", "white"], ["pine-tar", "black"], ["bat-grip", "black"], ["wrist-tape", "black"]].map(([id, color]) => {
                const p = getProduct(id)!;
                return (
                  <Link key={id} href={`/catalog/${id}`} className="group rounded-3xl bg-surface p-3 ring-1 ring-slate-200/80 transition hover:shadow-lg">
                    <div className="studio rounded-2xl p-2"><Mock id={id} color={color} numbers={id === "eye-black"} className="transition group-hover:scale-105" /></div>
                    <p className="mt-2 text-sm font-semibold leading-tight">{p.name}</p>
                    <p className="text-xs text-slate-500">from {formatMoney(lowestUnitCents(p) ?? 0)}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Programs */}
        <section className="bg-surface py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-5xl">Built for whole programs</h2>
              <p className="mt-4 text-lg text-slate-600">One coach and one team? It&apos;s two clicks. A whole athletic department? Everything&apos;s there when you need it.</p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                ["Multiple teams & logos", "Varsity, JV, 14U — one account"],
                ["Purchase orders", "Net terms invoices for schools"],
                ["Tax-exempt orders", "Upload your certificate once"],
                ["Order approvals", "Admins sign off on big orders"],
                ["Online proofs", "Approve artwork without email"],
                ["Live tracking", "Production status & shipping"],
              ].map(([t, b]) => (
                <li key={t} className="rounded-2xl bg-slate-50 p-5">
                  <p className="font-semibold">{t}</p>
                  <p className="text-sm text-slate-500">{b}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="studio-dark text-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-5 py-16">
            <h2 className="font-display text-5xl">Ready when your team is.</h2>
            <ButtonLink href="/order" variant="accent" className="px-8 py-4 text-base">Start your order →</ButtonLink>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
