import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { ButtonLink, Card } from "@/components/ui";
import { ProductPreview } from "@/components/ProductPreview";
import { CATALOG, UNIFORM_KIT_PRODUCT_IDS, getProduct, lowestUnitCents } from "@/lib/catalog";
import { formatMoney } from "@/lib/domain";

const STEPS = [
  ["Upload your logo once", "Saved to your organization. Every team and every season reuses it — no more emailing artwork."],
  ["Pick your products", "Real catalog with minimums, colors, placements and prices shown up front."],
  ["Customize instantly", "Choose colors and logo placements and see a live preview as you go."],
  ["Import your roster", "Drop in a spreadsheet of names, numbers and sizes. We handle the rest."],
  ["See the exact price", "Volume discounts, decoration and setup fees calculated automatically. No quote request."],
  ["Pay online", "Card checkout through Shopify, or a purchase order on approved invoice terms."],
  ["Approve your proof online", "Review the production proof in your portal. Nothing is made until you approve."],
  ["Track it & reorder next season", "Live order status and tracking. Reorder in minutes with updated sizes."],
];

const AVOID = [
  "Calling a sales rep for basic pricing",
  "Dozens of back-and-forth emails",
  "Re-sending your logo every season",
  "Typing up roster sizes by hand",
  "Calling to ask where your order is",
];

export default function Home() {
  const kit = UNIFORM_KIT_PRODUCT_IDS.map((id) => getProduct(id)!);
  return (
    <>
      <SiteHeader />
      <main>
        <section className="bg-brand-900 text-white">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent-500">For athletic programs</p>
              <h1 className="text-4xl font-black leading-tight tracking-tight md:text-5xl">
                Order your team&apos;s custom uniforms without talking to a salesperson.
              </h1>
              <p className="mt-5 text-lg text-brand-100">
                Upload your logo once, import your roster, see the real price, and pay online — for one team or your whole athletic department.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/signup" variant="accent" className="px-6 py-3 text-base">Start your order</ButtonLink>
                <ButtonLink href="/catalog" variant="secondary" className="px-6 py-3 text-base">See prices</ButtonLink>
              </div>
              <p className="mt-4 text-sm text-brand-100">Free account · No minimum commitment · Prices shown before you sign up</p>
            </div>
            <Card className="p-5 text-slate-900">
              <p className="text-sm font-semibold text-slate-500">A full baseball uniform kit, in one order</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {kit.map((p, i) => (
                  <div key={p.id} className="rounded-lg bg-slate-50 p-2">
                    <ProductPreview
                      product={p}
                      colorId={["navy", "gray", "navy", "navy"][i]}
                      decorations={[]}
                      logoUrls={{}}
                    />
                    <p className="mt-1 text-xs font-semibold">{p.name}</p>
                    <p className="text-xs text-slate-500">from {formatMoney(lowestUnitCents(p) ?? 0)}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-10 md:grid-cols-3">
            <div>
              <h2 className="text-2xl font-bold">No more…</h2>
              <ul className="mt-4 space-y-2 text-slate-700">
                {AVOID.map((a) => (
                  <li key={a} className="flex gap-2"><span className="text-accent-500">✕</span>{a}</li>
                ))}
              </ul>
            </div>
            <div className="md:col-span-2">
              <h2 className="text-2xl font-bold">A coach ordering for 25 players</h2>
              <p className="mt-2 text-slate-600">
                Jerseys, pants, hats and batting practice tees for a 25-player roster: upload a logo, choose four products, import the roster,
                confirm colors, see the total, and pay. All in one sitting, without a single email.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
                {[["1", "logo upload"], ["4", "products"], ["1", "roster file"], ["0", "sales emails"]].map(([n, l]) => (
                  <Card key={l} className="p-4">
                    <p className="text-3xl font-black text-brand-900">{n}</p>
                    <p className="text-sm text-slate-500">{l}</p>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-3xl font-black tracking-tight">How it works</h2>
            <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map(([title, body], i) => (
                <li key={title}>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 font-bold text-brand-700">{i + 1}</span>
                  <h3 className="mt-3 font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold">Built for whole athletic programs</h2>
              <ul className="mt-4 grid grid-cols-1 gap-2 text-slate-700 sm:grid-cols-2">
                {[
                  "Multiple teams & sports",
                  "Multiple logos",
                  "Multiple authorized users",
                  "Several shipping addresses",
                  "Bulk orders with volume pricing",
                  "Purchase orders & invoice terms",
                  "Tax-exempt purchasing",
                  "Internal order approvals",
                  "Saved uniform designs",
                  "Seasonal reorders",
                ].map((f) => (
                  <li key={f} className="flex gap-2"><span className="text-emerald-600">✓</span>{f}</li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-slate-500">Only need one team? None of the advanced features get in your way.</p>
            </div>
            <Card className="p-6">
              <h3 className="font-semibold">Honest about what&apos;s instant</h3>
              <p className="mt-2 text-sm text-slate-600">
                Products we can price from verified supplier pricing check out instantly. Fully custom items (like sublimated designs) and
                unusually large runs need the manufacturer to confirm — we&apos;ll tell you up front, review it quickly, and you&apos;ll still pay
                and approve everything online. Every order gets a production proof you approve before anything is made.
              </p>
              <Link href="/catalog" className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:underline">
                Browse {CATALOG.products.length} products with pricing →
              </Link>
            </Card>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
