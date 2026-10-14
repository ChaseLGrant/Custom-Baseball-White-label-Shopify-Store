import Link from "next/link";
import { Logo } from "@/components/SiteHeader";
import { NavLink } from "@/components/NavLink";
import { requireOrg } from "@/lib/server/auth";
import { logout, switchOrganization } from "@/lib/actions/auth";
import { ROLES } from "@/lib/domain";
import { db } from "@/lib/server/db";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, org, role } = await requireOrg();
  const [proofs, approvals] = await Promise.all([
    db.order.count({ where: { organizationId: org.id, status: "PROOF_READY" } }),
    db.order.count({ where: { organizationId: org.id, status: "PENDING_APPROVAL" } }),
  ]);
  const nav = [
    { href: "/app", label: "Home", exact: true },
    { href: "/app/orders", label: "Orders", badge: proofs + approvals || undefined },
    { href: "/app/teams", label: "Teams & rosters" },
    { href: "/app/logos", label: "Logos" },
    { href: "/app/designs", label: "Saved designs" },
    { href: "/app/settings", label: "Organization" },
  ];
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
          <Link href="/app"><Logo /></Link>
          <nav className="order-3 flex w-full gap-1 overflow-x-auto text-sm md:order-none md:w-auto">
            {nav.map((n) => <NavLink key={n.href} {...n} />)}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <Link href="/order" className="rounded-full bg-accent-500 px-4 py-2 font-semibold text-white shadow-[0_6px_20px_-6px_rgba(255,90,31,.6)] hover:bg-accent-600">New order</Link>
            {user.memberships.length > 1 ? (
              <form action={switchOrganization} className="flex items-center gap-1">
                <select name="orgId" defaultValue={org.id} className="!w-auto !py-1" aria-label="Organization">
                  {user.memberships.map((m) => <option key={m.organizationId} value={m.organizationId}>{m.organization.name}</option>)}
                </select>
                <button className="text-brand-600 hover:underline">Switch</button>
              </form>
            ) : (
              <span className="hidden font-medium text-slate-700 sm:inline">{org.name}</span>
            )}
            <span className="hidden text-slate-400 lg:inline">{user.name} · {ROLES[role]}</span>
            {user.isStaff && <Link href="/staff" className="font-medium text-accent-600">Staff</Link>}
            <form action={logout}><button className="text-slate-500 hover:text-slate-800">Sign out</button></form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-10">{children}</main>
    </div>
  );
}
