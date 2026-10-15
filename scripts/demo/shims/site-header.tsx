// Demo version of the site header/footer (the real one checks who is signed in).
import Link from "next/link";

export function Logo({ className = "", dark = false }: { className?: string; dark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
        <rect width="32" height="32" rx="9" fill="#2bff88" />
        <path d="M9 21c-2.2-2.9-2.2-7.1 0-10M23 11c2.2 2.9 2.2 7.1 0 10" stroke="#000" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="1.6 2.2" />
        <circle cx="16" cy="16" r="8.5" fill="none" stroke="#000" strokeWidth="2.4" />
      </svg>
      <span className={`font-display text-[22px] ${dark ? "text-white" : "text-slate-900"}`}>Club Custom</span>
    </span>
  );
}

export function SiteHeader({ dark = false }: { dark?: boolean }) {
  const link = dark ? "text-slate-600 hover:text-white" : "text-slate-600 hover:text-slate-900";
  return (
    <header className={`sticky top-0 z-40 backdrop-blur-xl ${dark ? "bg-brand-900/80" : "border-b border-slate-200/70 bg-surface/80"}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-3.5">
        <Link href="/"><Logo dark={dark} /></Link>
        <nav className="flex items-center gap-1 text-sm font-medium sm:gap-2">
          <Link href="/catalog" className={`rounded-full px-3 py-1.5 ${link}`}>Shop gear</Link>
          <Link href="/#how" className={`hidden rounded-full px-3 py-1.5 sm:inline ${link}`}>How it works</Link>
          <Link href="/order" className="ml-1 rounded-full bg-accent-500 px-4 py-2 font-semibold text-black hover:bg-accent-600">Start an order</Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-brand-900 text-slate-400">
      <div className="mx-auto max-w-7xl px-5 py-12 text-sm">
        <Logo dark />
        <p className="mt-3 max-w-md">Clickable preview of the Club Custom ordering site. Accounts, proof approval, order tracking and real Shopify checkout run on the live site.</p>
      </div>
    </footer>
  );
}
