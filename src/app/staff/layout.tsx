import Link from "next/link";
import { Logo } from "@/components/SiteHeader";
import { NavLink } from "@/components/NavLink";
import { requireStaff } from "@/lib/server/auth";
import { logout } from "@/lib/actions/auth";

export const metadata = { title: { default: "Staff", template: "%s · Staff · Club Custom" } };

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 bg-black text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-6 px-4 py-3">
          <Link href="/staff" aria-label="Club Custom" className="shrink-0"><Logo size="sm" className="!w-[124px] sm:!w-[150px]" /></Link>
          <span className="eyebrow rounded bg-white px-2 py-0.5 text-black">Staff</span>
          <nav className="flex gap-1 text-sm [&_a]:text-slate-700 [&_a:hover]:bg-white/10">
            <NavLink href="/staff" label="Order queue" exact />
            <NavLink href="/staff/verifications" label="Verifications" />
          </nav>
          <div className="ml-auto flex items-center gap-4 text-sm">
            <span className="text-slate-600">{user.name}</span>
            {user.memberships.length > 0 && <Link href="/app" className="text-slate-600 hover:text-white">Customer view</Link>}
            <form action={logout}><button className="text-slate-600 hover:text-white">Sign out</button></form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
