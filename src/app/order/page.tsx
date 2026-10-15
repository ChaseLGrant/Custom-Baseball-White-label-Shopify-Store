import Link from "next/link";
import { cookies } from "next/headers";
import { Logo } from "@/components/SiteHeader";
import { getCurrentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { logoSetupsPaid } from "@/lib/server/orders";
import { QuickOrder } from "./QuickOrder";

export const metadata = { title: "Order uniforms" };

export default async function OrderPage({ searchParams }: { searchParams: Promise<{ add?: string }> }) {
  const { add } = await searchParams;
  const user = await getCurrentUser();
  const activeId = (await cookies()).get("cc_org")?.value;
  const m = user?.memberships.find((x) => x.organizationId === activeId) ?? user?.memberships[0];

  const [logos, teams, setupsPaid] = m
    ? await Promise.all([
        db.logo.findMany({ where: { organizationId: m.organizationId, archived: false }, orderBy: { createdAt: "asc" } }),
        db.team.findMany({
          where: { organizationId: m.organizationId, archived: false },
          include: { roster: { orderBy: { sortOrder: "asc" } } },
          orderBy: { createdAt: "asc" },
        }),
        logoSetupsPaid(m.organizationId),
      ])
    : [[], [], {}];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5">
          <Link href={user ? "/app" : "/"}><Logo /></Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
            <Link href="/catalog" className="hover:text-slate-900">Shop gear</Link>
            {user ? <Link href="/app" className="hover:text-slate-900">My account</Link> : <Link href="/login?next=/order" className="hover:text-slate-900">Sign in</Link>}
          </nav>
        </div>
      </header>
      <QuickOrder
        signedIn={!!m}
        orgId={m?.organizationId ?? null}
        orgName={m?.organization.name ?? null}
        logos={logos.map((l) => ({ id: l.id, name: l.name, url: l.fileUrl }))}
        teams={teams.map((t) => ({
          id: t.id,
          name: t.name,
          roster: t.roster.map((p) => ({ name: p.name, number: p.number, size: p.size, topSize: p.topSize, bottomSize: p.bottomSize, hatSize: p.hatSize })),
        }))}
        setupsPaid={setupsPaid}
        initialAdd={add ?? null}
      />
    </div>
  );
}
