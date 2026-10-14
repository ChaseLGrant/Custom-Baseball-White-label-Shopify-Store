import Link from "next/link";
import { getCurrentUser } from "@/lib/server/auth";
import { ButtonLink } from "./ui";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-black tracking-tight ${className}`}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-500 text-sm text-white">CC</span>
      <span>Club Custom</span>
    </span>
  );
}

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-brand-900"><Logo /></Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-3">
          <Link href="/catalog" className="rounded px-2 py-1 font-medium text-slate-700 hover:text-brand-700">Catalog & pricing</Link>
          <Link href="/#how" className="hidden rounded px-2 py-1 font-medium text-slate-700 hover:text-brand-700 sm:inline">How it works</Link>
          {user ? (
            <ButtonLink href={user.memberships.length ? "/app" : "/staff"}>My account</ButtonLink>
          ) : (
            <>
              <Link href="/login" className="rounded px-2 py-1 font-medium text-slate-700 hover:text-brand-700">Sign in</Link>
              <ButtonLink href="/order" variant="accent">Start an order</ButtonLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-slate-500">
        <Logo className="text-brand-900" />
        <p>Custom team gear for schools, colleges and club programs. Secure payments by Shopify.</p>
      </div>
    </footer>
  );
}
