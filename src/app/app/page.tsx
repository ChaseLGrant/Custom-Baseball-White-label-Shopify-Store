import Link from "next/link";
import { requireOrg } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { Badge, ButtonLink, Card, CardHeader, Notice, statusTone } from "@/components/ui";
import { ORDER_STATUSES, can, formatMoney, formatOrderNumber, type OrderStatus } from "@/lib/domain";
import { createOrder } from "@/lib/actions/orders";
import { reorderAndPay } from "@/lib/actions/quick";

export const metadata = { title: "Home" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { org, user, role } = await requireOrg();
  const { welcome } = await searchParams;
  const [logos, teams, rosterCount, orders] = await Promise.all([
    db.logo.count({ where: { organizationId: org.id, archived: false } }),
    db.team.findMany({ where: { organizationId: org.id, archived: false }, include: { _count: { select: { roster: true } } } }),
    db.rosterPlayer.count({ where: { team: { organizationId: org.id } } }),
    db.order.findMany({ where: { organizationId: org.id }, orderBy: { updatedAt: "desc" }, take: 8 }),
  ]);
  const placed = orders.some((o) => o.status !== "DRAFT");
  // "Order again" offers the most recent order that has actually been made.
  const lastDone = orders.find((o) => ["IN_PRODUCTION", "SHIPPED", "DELIVERED"].includes(o.status));

  const steps = [
    { done: logos > 0, label: "Upload your logo", href: "/app/logos", hint: "Once — reused on every order." },
    { done: teams.length > 0, label: "Add a team", href: "/app/teams", hint: "e.g. Varsity Baseball." },
    { done: rosterCount > 0, label: "Import your roster", href: teams[0] ? `/app/teams/${teams[0].id}` : "/app/teams", hint: "Spreadsheet of names, numbers, sizes." },
    { done: placed, label: "Place your first order", href: "/order", hint: "See the total and pay online." },
  ];
  const todo = steps.filter((s) => !s.done).length;

  const needsYou = orders.filter(
    (o) => o.status === "PROOF_READY" || o.status === "AWAITING_PAYMENT" || (o.status === "PENDING_APPROVAL" && can(role, "approve_orders")),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-5xl">{welcome ? `Welcome, ${user.name.split(" ")[0]}!` : org.name}</h1>
        <p className="text-slate-600">Everything for your program&apos;s custom gear, in one place.</p>
      </div>

      {needsYou.length > 0 && (
        <Card className="border-amber-300">
          <CardHeader title="Waiting on you" />
          <ul className="divide-y divide-slate-100">
            {needsYou.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <span><strong>{o.name}</strong> <span className="text-slate-500">{formatOrderNumber(o.number)}</span></span>
                <ButtonLink href={o.status === "AWAITING_PAYMENT" && o.checkoutUrl ? o.checkoutUrl : `/app/orders/${o.id}`} variant="accent">
                  {o.status === "PROOF_READY" ? "Review proof" : o.status === "AWAITING_PAYMENT" ? "Pay now" : "Review & approve"}
                </ButtonLink>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2" id="new-order">
          <Link href="/order" className="studio-dark group relative block overflow-hidden rounded-3xl p-8 text-white transition hover:shadow-2xl">
            <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-accent-500/10 blur-3xl transition group-hover:bg-accent-500/20" />
            <p className="font-display text-5xl">New order <span className="text-accent-500">→</span></p>
            <p className="mt-2 text-slate-600">
              {logos > 0 && rosterCount > 0
                ? "Your logo and roster are saved. Pick products and pay."
                : "Drop your logo and roster, see your price, pay."}
            </p>
          </Link>
          {lastDone && (
            <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Order again</p>
                <p className="font-semibold">{lastDone.name}</p>
                <p className="text-sm text-slate-500">Same gear, today&apos;s prices, your current roster.</p>
              </div>
              <form action={reorderAndPay}>
                <input type="hidden" name="orderId" value={lastDone.id} />
                <button className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-black hover:bg-slate-700">↻ Reorder &amp; pay</button>
              </form>
            </Card>
          )}
          <form action={createOrder} className="text-sm text-slate-600">
            <input type="hidden" name="name" value="" />
            Ordering for several teams, or need custom placements? <button className="font-semibold text-brand-600 underline">Open the full order builder</button>
          </form>
        </div>

        {todo ? (
          <Card>
            <CardHeader title={`Getting set up (${steps.length - todo}/${steps.length})`} />
            <ol className="space-y-1 p-3">
              {steps.map((s) => (
                <li key={s.label}>
                  <Link href={s.href} className="flex items-start gap-3 rounded-md px-2 py-2 hover:bg-slate-50">
                    <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs ${s.done ? "bg-accent-500 text-black" : "border-2 border-slate-300"}`}>{s.done ? "✓" : ""}</span>
                    <span>
                      <span className={`block text-sm font-medium ${s.done ? "text-slate-400 line-through" : ""}`}>{s.label}</span>
                      {!s.done && <span className="block text-xs text-slate-500">{s.hint}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </Card>
        ) : (
          <Card>
            <CardHeader title="Your teams" action={<Link href="/app/teams" className="text-sm font-semibold text-brand-600">Manage →</Link>} />
            <ul className="divide-y divide-slate-100">
              {teams.map((t) => (
                <li key={t.id}>
                  <Link href={`/app/teams/${t.id}`} className="flex items-center justify-between gap-2 px-5 py-3 hover:bg-slate-50">
                    <span className="font-medium">{t.name}</span>
                    <span className="text-sm text-slate-500">{t._count.roster} players</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">Share a team&apos;s size link so players fill in their own name, number and size.</p>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader title="Recent orders" action={<Link href="/app/orders" className="text-sm font-semibold text-brand-600">All orders →</Link>} />
        {orders.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">No orders yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/app/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-slate-50">
                  <span><span className="font-medium">{o.name}</span> <span className="text-sm text-slate-500">{formatOrderNumber(o.number)}</span></span>
                  <span className="flex items-center gap-3">
                    {o.totalCents > 0 && <span className="text-sm text-slate-600">{formatMoney(o.totalCents)}</span>}
                    <Badge tone={statusTone(o.status)}>{ORDER_STATUSES[o.status as OrderStatus]?.label ?? o.status}</Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {org.taxExemptStatus === "NONE" && ["HIGH_SCHOOL", "COLLEGE"].includes(org.type) && can(role, "manage_purchasing") && (
        <Notice title="Tax-exempt school?">
          Upload your exemption certificate once in <Link href="/app/settings#purchasing" className="font-semibold underline">Organization settings</Link> and verified orders won&apos;t be charged sales tax.
        </Notice>
      )}
    </div>
  );
}
