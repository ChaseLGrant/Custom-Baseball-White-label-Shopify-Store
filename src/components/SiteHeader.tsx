import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "@/lib/server/auth";
import { ButtonLink } from "./ui";

/** The Club Custom script wordmark. White ink by default (the site is dark); `ink="black"` for light backgrounds. */
const LOGO_RATIO = 1782 / 351;
const LOGO_HEIGHTS = { sm: 28, md: 34, lg: 44, xl: 96 } as const;
export function Logo({
  className = "",
  size = "md",
  ink = "white",
  priority = false,
}: { className?: string; dark?: boolean; size?: keyof typeof LOGO_HEIGHTS; ink?: "white" | "black"; priority?: boolean }) {
  const h = LOGO_HEIGHTS[size];
  return (
    <Image
      src={ink === "black" ? "/brand/club-custom-logo-black.png" : "/brand/club-custom-logo-white.png"}
      alt="Club Custom"
      width={Math.round(h * LOGO_RATIO)}
      height={h}
      priority={priority}
      className={`block h-auto max-w-full select-none ${className}`}
      style={{ width: Math.round(h * LOGO_RATIO) }}
    />
  );
}

export async function SiteHeader({ dark = false }: { dark?: boolean }) {
  const user = await getCurrentUser();
  const link = dark ? "text-slate-600 hover:text-white" : "text-slate-600 hover:text-slate-900";
  return (
    <header className={`sticky top-0 z-40 backdrop-blur-xl ${dark ? "border-b border-white/10 bg-black/80" : "border-b border-white/10 bg-black/85"}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5">
        <Link href="/" aria-label="Club Custom home" className="shrink-0"><Logo size="md" priority className="!w-[132px] sm:!w-[172px]" /></Link>
        <nav className="flex items-center gap-1 text-sm font-medium sm:gap-2">
          <Link href="/catalog" className={`hidden whitespace-nowrap rounded-full px-3 py-1.5 sm:inline ${link}`}>Shop gear</Link>
          <Link href="/#how" className={`hidden rounded-full px-3 py-1.5 sm:inline ${link}`}>How it works</Link>
          {user ? (
            <Link href={user.memberships.length ? "/app" : "/staff"} className={`whitespace-nowrap rounded-full px-3 py-1.5 ${link}`}>My account</Link>
          ) : (
            <Link href="/login" className={`whitespace-nowrap rounded-full px-3 py-1.5 ${link}`}>Sign in</Link>
          )}
          <ButtonLink href="/order" variant="accent" className="ml-1 whitespace-nowrap"><span className="sm:hidden">Order</span><span className="hidden sm:inline">Start an order</span></ButtonLink>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-black text-slate-400">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo size="lg" />
          <p className="mt-5 max-w-sm text-sm">Custom uniforms, helmets and game-day gear for high schools, colleges, travel and club programs. No sales calls required.</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="eyebrow text-white">Shop</p>
          <Link href="/catalog?group=uniforms" className="block hover:text-white">Uniforms</Link>
          <Link href="/catalog?group=headwear" className="block hover:text-white">Helmets & caps</Link>
          <Link href="/catalog?group=gear" className="block hover:text-white">Player gear</Link>
          <Link href="/catalog?group=gameday" className="block hover:text-white">Game-day extras</Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="eyebrow text-white">Ordering</p>
          <Link href="/order" className="block hover:text-white">Start an order</Link>
          <Link href="/login" className="block hover:text-white">Track an order</Link>
          <p>Secure checkout by Shopify</p>
        </div>
      </div>
    </footer>
  );
}
