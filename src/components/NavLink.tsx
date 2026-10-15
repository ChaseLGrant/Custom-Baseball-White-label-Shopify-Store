"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, label, exact, badge }: { href: string; label: string; exact?: boolean; badge?: number }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`whitespace-nowrap rounded-full px-3.5 py-1.5 font-medium transition ${active ? "bg-slate-200 text-slate-900" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
    >
      {label}
      {badge ? <span className="ml-1.5 rounded-full bg-accent-500 px-1.5 py-0.5 text-xs text-black">{badge}</span> : null}
    </Link>
  );
}
