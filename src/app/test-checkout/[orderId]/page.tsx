// TEST MODE ONLY. Stands in for Shopify checkout when Shopify isn't connected,
// so the whole flow can be tried locally. It refuses to run once Shopify is set up.
import { notFound, redirect } from "next/navigation";
import { requireOrg } from "@/lib/server/auth";
import { getOrder, markPaid } from "@/lib/server/orders";
import { shopifyConfigured } from "@/lib/server/shopify";
import { AuthShell } from "@/components/AuthShell";
import { Button, Notice } from "@/components/ui";
import { formatMoney, formatOrderNumber } from "@/lib/domain";

export default async function TestCheckout({ params }: { params: Promise<{ orderId: string }> }) {
  if (shopifyConfigured()) notFound();
  const { orderId } = await params;
  const { org } = await requireOrg();
  const order = await getOrder(orderId, org.id);
  if (!order) notFound();
  if (order.status !== "AWAITING_PAYMENT") redirect(`/app/orders/${orderId}`);

  async function pay() {
    "use server";
    if (shopifyConfigured()) return;
    const { org } = await requireOrg();
    const o = await getOrder(orderId, org.id);
    if (!o) return;
    await markPaid(o.id, { orderId: `test-${o.id}`, name: `TEST-${o.number}` });
    redirect(`/app/orders/${o.id}`);
  }

  return (
    <AuthShell title="Test checkout" subtitle={`${order.name} · ${formatOrderNumber(order.number)}`}>
      <Notice tone="amber" title="Shopify isn't connected">
        This page simulates Shopify&apos;s secure checkout. No card is charged. Connect Shopify (see README) to take real payments.
      </Notice>
      <p className="mt-4 text-3xl font-black">{formatMoney(order.totalCents)}</p>
      <p className="text-sm text-slate-500">{order.taxExempt ? "Tax exempt" : "+ sales tax (calculated by Shopify)"}</p>
      <form action={pay} className="mt-6"><Button variant="accent" className="w-full py-3">Simulate successful payment</Button></form>
    </AuthShell>
  );
}
