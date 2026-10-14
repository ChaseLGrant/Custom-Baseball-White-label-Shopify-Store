import Link from "next/link";
import { getCurrentUser } from "@/lib/server/auth";
import { ButtonLink } from "./ui";

export function Logo({ className = "", dark = false }: { className?: string; dark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
        <rect width="32" height="32" rx="9" fill="#ff5a1f" />
        <path d="M9 21c-2.2-2.9-2.2-7.1 0-10M23 11c2.2 2.9 2.2 7.1 0 10" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="1.6 2.2" />
        <circle cx="16" cy="16" r="8.5" fill="none" stroke="#fff" strokeWidth="2.4" />
      </svg>
      <span className={`font-display text-[22px] italic ${dark ? "text-white" : "text-slate-900"}`}>Club Custom</span>
    </span>
  );
}

export async function SiteHeader({ dark = false }: { dark?: boolean }) {
  const user = await getCurrentUser();
  const link = dark ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900";
  return (
    <header className={`sticky top-0 z-40 backdrop-blur-xl ${dark ? "bg-brand-900/80" : "border-b border-slate-200/70 bg-white/80"}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5">
        <Link href="/"><Logo dark={dark} /></Link>
        <nav className="flex items-center gap-1 text-sm font-medium sm:gap-2">
          <Link href="/catalog" className={`rounded-full px-3 py-1.5 ${link}`}>Shop gear</Link>
          <Link href="/#how" className={`hidden rounded-full px-3 py-1.5 sm:inline ${link}`}>How it works</Link>
          {user ? (
            <Link href={user.memberships.length ? "/app" : "/staff"} className={`rounded-full px-3 py-1.5 ${link}`}>My account</Link>
          ) : (
            <Link href="/login" className={`rounded-full px-3 py-1.5 ${link}`}>Sign in</Link>
          )}
          <ButtonLink href="/order" variant="accent" className="ml-1">Start an order</ButtonLink>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-brand-900 text-slate-400">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo dark />
          <p className="mt-3 max-w-sm text-sm">Custom uniforms, helmets and game-day gear for high schools, colleges, travel and club programs. No sales calls required.</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-white">Shop</p>
          <Link href="/catalog?group=uniforms" className="block hover:text-white">Uniforms</Link>
          <Link href="/catalog?group=headwear" className="block hover:text-white">Helmets & caps</Link>
          <Link href="/catalog?group=gear" className="block hover:text-white">Player gear</Link>
          <Link href="/catalog?group=gameday" className="block hover:text-white">Game-day extras</Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-white">Ordering</p>
          <Link href="/order" className="block hover:text-white">Start an order</Link>
          <Link href="/login" className="block hover:text-white">Track an order</Link>
          <p>Secure checkout by Shopify</p>
        </div>
      </div>
    </footer>
  );
}
