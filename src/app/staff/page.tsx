import Link from "next/link";
import { db } from "@/lib/server/db";
import { Badge, Card, CardHeader, PageHeader, statusTone } from "@/components/ui";
import { ORDER_STATUSES, formatMoney, formatOrderNumber, type OrderStatus } from "@/lib/domain";

const QUEUES: { title: string; description: string; statuses: OrderStatus[] }[] = [
  { title: "Pricing review", description: "Quote-required items. Confirm with the manufacturer, then set prices.", statuses: ["QUOTE_REVIEW"] },
  { title: "Proofs to prepare", description: "Paid or invoiced orders, and requested revisions.", statuses: ["PAID", "INVOICED", "PROOF_REVISION"] },
  { title: "Waiting on customer", description: "No action needed unless it stalls.", statuses: ["PROOF_READY", "AWAITING_PAYMENT", "PENDING_APPROVAL"] },
  { title: "In production", description: "Add tracking when shipped (automatic for Shopify fulfillments).", statuses: ["IN_PRODUCTION"] },
  { title: "Shipped", description: "Mark delivered when confirmed.", statuses: ["SHIPPED"] },
];

export default async function StaffQueue() {
  const orders = await db.order.findMany({
    where: { status: { in: QUEUES.flatMap((q) => q.statuses) } },
    include: { organization: true },
    orderBy: { updatedAt: "asc" },
  });
  const flagged = await db.orderEvent.findMany({ where: { type: "PAYMENT", visible: false }, include: { order: true }, orderBy: { createdAt: "desc" }, take: 20 });
  const [pendingTax, pendingTerms] = await Promise.all([
    db.organization.count({ where: { taxExemptStatus: "PENDING" } }),
    db.organization.count({ where: { termsStatus: "PENDING" } }),
  ]);
  return (
    <>
      <PageHeader title="Order queue" description="Only exceptions land here. Everything else runs itself." />
      {(pendingTax > 0 || pendingTerms > 0) && (
        <Link href="/staff/verifications" className="mb-6 block rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {pendingTax} tax-exemption certificate(s) and {pendingTerms} invoice-terms application(s) waiting for review →
        </Link>
      )}
      {flagged.length > 0 && (
        <Card className="mb-6 border-red-300">
          <CardHeader title="Payments needing reconciliation" />
          <ul className="divide-y divide-slate-100 text-sm">
            {flagged.map((e) => <li key={e.id} className="px-5 py-2"><Link className="font-medium text-brand-700" href={`/staff/orders/${e.orderId}`}>{formatOrderNumber(e.order.number)}</Link> — {e.message}</li>)}
          </ul>
        </Card>
      )}
      <div className="space-y-6">
        {QUEUES.map((q) => {
          const list = orders.filter((o) => q.statuses.includes(o.status as OrderStatus));
          return (
            <Card key={q.title}>
              <CardHeader title={`${q.title} (${list.length})`} description={q.description} />
              {list.length === 0 ? (
                <p className="px-5 py-4 text-sm text-slate-400">Nothing here.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {list.map((o) => (
                    <li key={o.id}>
                      <Link href={`/staff/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-slate-50">
                        <span><strong>{formatOrderNumber(o.number)}</strong> · {o.organization.name} · {o.name}</span>
                        <span className="flex items-center gap-3 text-sm">
                          <span className="text-slate-500">{formatMoney(o.totalCents)}</span>
                          <Badge tone={statusTone(o.status)}>{ORDER_STATUSES[o.status as OrderStatus].label}</Badge>
                          <span className="text-slate-400">{o.updatedAt.toLocaleDateString()}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
