import Link from "next/link";
import { requireOrg } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { Badge, Card, EmptyState, PageHeader, statusTone } from "@/components/ui";
import { createOrder } from "@/lib/actions/orders";
import { ORDER_STATUSES, formatMoney, formatOrderNumber, type OrderStatus } from "@/lib/domain";

export const metadata = { title: "Orders" };

const FILTERS = {
  all: { label: "All", statuses: null },
  action: { label: "Needs action", statuses: ["PROOF_READY", "AWAITING_PAYMENT", "PENDING_APPROVAL"] },
  active: { label: "In progress", statuses: ["QUOTE_REVIEW", "PAID", "INVOICED", "PROOF_REVISION", "IN_PRODUCTION", "SHIPPED"] },
  drafts: { label: "Drafts", statuses: ["DRAFT"] },
  done: { label: "Completed", statuses: ["DELIVERED", "CANCELLED"] },
} as const;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { org } = await requireOrg();
  const f = ((await searchParams).f ?? "all") as keyof typeof FILTERS;
  const filter = FILTERS[f] ?? FILTERS.all;
  const orders = await db.order.findMany({
    where: { organizationId: org.id, ...(filter.statuses ? { status: { in: [...filter.statuses] } } : {}) },
    include: { lines: { select: { quantity: true, team: { select: { name: true } } } } },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <>
      <PageHeader
        title="Orders"
        actions={
          <form action={createOrder}>
            <input type="hidden" name="name" value="" />
            <button className="rounded-md bg-accent-500 px-4 py-2 text-sm font-semibold text-black hover:bg-accent-600">New order</button>
          </form>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {Object.entries(FILTERS).map(([k, v]) => (
          <Link key={k} href={`/app/orders?f=${k}`} className={`rounded-full px-3 py-1 ${f === k ? "bg-brand-900 text-white" : "bg-surface ring-1 ring-slate-200"}`}>{v.label}</Link>
        ))}
      </div>
      {orders.length === 0 ? (
        <EmptyState title="No orders here" description="Start a new order to build gear for one team or your whole program." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-2">Order</th><th className="px-4 py-2">Teams</th><th className="px-4 py-2">Status</th><th className="px-4 py-2 text-right">Total</th><th className="px-4 py-2">Updated</th></tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const teams = [...new Set(o.lines.map((l) => l.team?.name).filter(Boolean))];
                return (
                  <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3"><Link href={`/app/orders/${o.id}`} className="font-semibold text-brand-700 hover:underline">{o.name}</Link><div className="text-xs text-slate-500">{formatOrderNumber(o.number)}{o.poNumber ? ` · PO ${o.poNumber}` : ""}</div></td>
                    <td className="px-4 py-3 text-slate-600">{teams.join(", ") || "—"}</td>
                    <td className="px-4 py-3"><Badge tone={statusTone(o.status)}>{ORDER_STATUSES[o.status as OrderStatus]?.label ?? o.status}</Badge></td>
                    <td className="px-4 py-3 text-right">{o.totalCents ? formatMoney(o.totalCents) : "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{o.updatedAt.toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
