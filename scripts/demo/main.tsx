// Static, clickable preview of Club Custom built from the real pages and
// components. Server-only pieces (accounts, database, Shopify) are replaced by
// the shims in ./shims, so this runs entirely in the browser.
import { Suspense, use, useEffect, useMemo, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import Home from "@/app/page";
import CatalogPage from "@/app/catalog/page";
import ProductPage from "@/app/catalog/[id]/page";
import { QuickOrder } from "@/app/order/QuickOrder";
import { Logo, SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { CATALOG, getProduct } from "@/lib/catalog";
import { formatMoney } from "@/lib/domain";
import { priceOrder } from "@/lib/pricing";
import { buildLineItems } from "@/lib/roster";
import { quickLineConfig } from "@/lib/quick-config";
import { lastPayload, lastRoster, setOnPlaced } from "./shims/quick-actions";
import { RouterContext, parseHref, useRouter as useRouterHook, type Route } from "./router";

// Point product photos at the copies embedded in this page.
declare const __PRODUCT_PHOTOS__: Record<string, string>;
for (const p of CATALOG.products) if (p.photo && __PRODUCT_PHOTOS__[p.photo.src]) p.photo.src = __PRODUCT_PHOTOS__[p.photo.src];

// ---------------------------------------------------------------------------
// Sample files so anyone can try the order page without their own logo/roster
// ---------------------------------------------------------------------------

const SAMPLE_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="94" fill="#0f2d55" stroke="#f2b632" stroke-width="10"/><path d="M52 120 Q100 40 148 120 L132 120 Q100 74 68 120 Z" fill="#f2b632"/><text x="100" y="160" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="40" font-weight="900" fill="#ffffff">EAGLES</text></svg>`;
const FIRST = ["Mason", "Eli", "Jordan", "Caleb", "Luke", "Owen", "Ryan", "Tyler", "Gavin", "Nolan", "Cole", "Brady", "Isaac", "Wyatt", "Chase", "Logan", "Dylan", "Carter", "Evan", "Blake", "Hunter", "Jace", "Reid", "Miles", "Grant"];
const LAST = ["Rivera", "Turner", "Brooks", "Hayes", "Price", "Bennett", "Coleman", "Foster", "Reyes", "Hughes", "Myers", "Perry", "Long", "Ward", "Ross", "Jenkins", "Powell", "Sanders", "Patel", "Kim", "Russell", "Griffin", "Diaz", "Stone", "Webb"];
const SIZES = ["Adult Small", "M", "M", "adult large", "L", "L", "XL", "XL", "XXL", "M", "L", "Youth L", "XL", "L", "M", "L", "XL", "M", "L", "2XL", "M", "L", "XL", "L", "M"];
const SAMPLE_ROSTER_CSV = ["Player Name,Jersey #,Shirt Size", ...FIRST.map((f, i) => `${f} ${LAST[i]},${i + 1},${SIZES[i]}`)].join("\n");

function inject(selector: string, file: File) {
  const input = document.querySelector<HTMLInputElement>(selector);
  if (!input) return;
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}
function fill(name: string, value: string) {
  const el = document.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (el) el.value = value;
}
function loadSamples() {
  inject('input[type=file][accept*=".svg"]', new File([SAMPLE_LOGO_SVG], "eagles-logo.svg", { type: "image/svg+xml" }));
  setTimeout(() => inject('input[type=file][accept*=".csv"]', new File([SAMPLE_ROSTER_CSV], "eagles-roster.csv", { type: "text/csv" })), 50);
  fill("name", "Coach Jamie Fox");
  fill("email", "coach@example.com");
  fill("orgName", "Ridgeview High");
  fill("password", "demo-password");
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

// Server pages are async functions; render them once per page and cache the result.
const pageCache = new Map<string, Promise<ReactNode>>();
function Async({ cacheKey, make }: { cacheKey: string; make: () => Promise<ReactNode> }) {
  if (!pageCache.has(cacheKey)) pageCache.set(cacheKey, make());
  return <>{use(pageCache.get(cacheKey)!)}</>;
}

function OrderScreen() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-5 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-brand-900 px-5 py-4 text-white">
          <p className="text-sm">
            <span className="font-semibold">Try it:</span> load a sample logo and a 25-player roster, then pick gear and press Pay.
          </p>
          <button type="button" onClick={loadSamples} className="rounded-full bg-accent-500 px-5 py-2 text-sm font-semibold hover:bg-accent-600">
            Use sample logo &amp; roster
          </button>
        </div>
      </div>
      <QuickOrder signedIn={false} orgId={null} orgName={null} logos={[]} teams={[]} setupsPaid={{}} initialAdd={null} />
    </div>
  );
}

function DoneScreen() {
  const p = lastPayload;
  const summary = useMemo(() => {
    if (!p) return null;
    const lines = p.productIds.map((id) => {
      const product = getProduct(id)!;
      const config = quickLineConfig(product, { color: p.color, logoId: null, rosterCount: lastRoster.length, personalize: p.personalize, sizeRun: p.sizeRun, teamQty: p.teamQty[id] });
      return { key: id, productId: id, config, items: buildLineItems(product, config, lastRoster) };
    });
    return { lines, price: priceOrder({ lines }) };
  }, [p]);
  const steps = [
    ["Secure payment", "Shopify's checkout collects the shipping address and card (or Shop Pay, Apple Pay) and calculates sales tax."],
    ["Proof approval", "Your art team uploads a production proof. The coach approves it online with one click."],
    ["Production & tracking", "Live status and carrier tracking in the coach's account. No calls to check on an order."],
    ["Next season", "One click on “Reorder & pay”: same gear, today's prices, the updated roster."],
  ];
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-5 py-12">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent-600">Order ready</p>
        <h1 className="font-display mt-2 text-5xl">This is where checkout opens</h1>
        <p className="mt-3 text-lg text-slate-600">On the live site the coach lands on Shopify&apos;s secure checkout right now. Nothing is charged in this preview.</p>
        {summary && (
          <div className="mt-8 rounded-3xl bg-surface p-6 ring-1 ring-slate-200/80">
            <ul className="space-y-2 text-sm">
              {summary.price.lines.map((l) => (
                <li key={l.key} className="flex justify-between gap-3"><span className="text-slate-600">{l.quantity} × {l.productName}</span><span className="font-semibold tabular-nums">{formatMoney(l.lineTotalCents)}</span></li>
              ))}
              {summary.price.setupFees.filter((f) => f.cents).map((f) => (
                <li key={f.method} className="flex justify-between gap-3"><span className="text-slate-600">{f.methodLabel} setup (one time)</span><span className="font-semibold tabular-nums">{formatMoney(f.cents)}</span></li>
              ))}
            </ul>
            <div className="mt-4 flex items-baseline justify-between border-t border-slate-100 pt-4">
              <span className="font-semibold">Total</span>
              <span className="font-display text-4xl">{formatMoney(summary.price.totalCents)}</span>
            </div>
          </div>
        )}
        <h2 className="mt-12 text-xl font-bold">What happens next</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-2">
          {steps.map(([t, b], i) => (
            <li key={t} className="rounded-2xl bg-surface p-5 ring-1 ring-slate-200/80">
              <p className="text-sm font-semibold text-accent-600">Step {i + 1}</p>
              <p className="mt-1 font-semibold">{t}</p>
              <p className="mt-1 text-sm text-slate-600">{b}</p>
            </li>
          ))}
        </ol>
        <LinkButton href="/order">Build another order</LinkButton>
      </main>
      <SiteFooter />
    </div>
  );
}

function LiveOnly() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-5 py-20 text-center">
        <Logo className="justify-center" />
        <h1 className="font-display mt-6 text-5xl">Available on the live site</h1>
        <p className="mt-3 text-slate-600">Accounts, saved logos and rosters, proof approval, order tracking and reorders need the live site with its database. This preview covers browsing and building an order.</p>
        <LinkButton href="/order">Try building an order</LinkButton>
      </main>
    </div>
  );
}

function LinkButton({ href, children }: { href: string; children: ReactNode }) {
  const { go } = useRouterHook();
  return <button type="button" onClick={() => go(href)} className="mt-8 rounded-full bg-accent-500 px-6 py-3 font-semibold text-black hover:bg-accent-600">{children}</button>;
}

function Screen({ route }: { route: Route }) {
  const { path, query } = route;
  if (path === "/") return <Home />;
  if (path === "/catalog") return <Async cacheKey={"catalog" + JSON.stringify(query)} make={() => CatalogPage({ searchParams: Promise.resolve(query) })} />;
  const m = path.match(/^\/catalog\/([\w-]+)$/);
  if (m && getProduct(m[1])) return <Async cacheKey={path + JSON.stringify(query)} make={() => ProductPage({ params: Promise.resolve({ id: m[1] }), searchParams: Promise.resolve(query) })} />;
  if (path === "/order") return <OrderScreen key={JSON.stringify(query)} />;
  if (path === "/done") return <DoneScreen />;
  return <LiveOnly />;
}

function App() {
  const [route, setRoute] = useState<Route>({ path: "/", query: {}, anchor: null });
  const go = (href: string) => {
    const next = href.startsWith("?") ? { ...route, query: parseHref(href).query } : parseHref(href);
    setRoute(next);
    if (!href.startsWith("?")) window.scrollTo({ top: 0 });
  };
  useEffect(() => setOnPlaced(() => go("/done")));
  useEffect(() => {
    if (route.anchor) setTimeout(() => document.getElementById(route.anchor!)?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [route]);
  return (
    <RouterContext.Provider value={{ route, go }}>
      <Suspense fallback={<div className="p-10 text-center text-slate-400">Loading…</div>}>
        <Screen route={route} />
      </Suspense>
    </RouterContext.Provider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
