import { notFound } from "next/navigation";
import { getOrder } from "@/lib/server/orders";
import { db } from "@/lib/server/db";
import { ActionForm } from "@/components/ActionForm";
import { OrderLinesSummary } from "@/components/OrderLinesSummary";
import { MilestoneTracker } from "@/components/MilestoneTracker";
import { Badge, Card, CardHeader, Field, PageHeader, statusTone } from "@/components/ui";
import { addInternalNote, addShipment, releaseQuote, staffSetStatus, uploadProof } from "@/lib/actions/staff";
import { getProduct } from "@/lib/catalog";
import { ORDER_STATUSES, formatMoney, formatOrderNumber, type OrderStatus } from "@/lib/domain";

export default async function StaffOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const order = await getOrder((await params).id);
  if (!order) notFound();
  const status = order.status as OrderStatus;
  const creator = await db.user.findUnique({ where: { id: order.createdById } });
  const address = order.shippingSnapshot ? JSON.parse(order.shippingSnapshot) : null;
  const quoteLines = order.lines.filter((l) => getProduct(l.productId)?.pricing.status !== "VERIFIED" || l.lineTotalCents === 0 || l.quotedUnitCents != null);

  return (
    <>
      <PageHeader
        back={{ href: "/staff", label: "Queue" }}
        title={<span className="flex flex-wrap items-center gap-3">{formatOrderNumber(order.number)} · {order.organization.name} <Badge tone={statusTone(status)}>{ORDER_STATUSES[status]?.label}</Badge></span>}
        description={`${order.name} · ${creator?.name} <${creator?.email}> · ${order.paymentMethod}${order.poNumber ? ` · PO ${order.poNumber}` : ""}${order.taxExempt ? " · TAX EXEMPT" : ""}${order.shopifyOrderName ? ` · Shopify ${order.shopifyOrderName}` : ""}`}
      />
      <Card className="mb-6 p-5"><MilestoneTracker status={status} /></Card>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          {status === "QUOTE_REVIEW" && (
            <Card className="border-violet-300">
              <CardHeader title="Set pricing" description="All-in price per piece (garment + decoration + personalization) as confirmed with the manufacturer." />
              <ActionForm action={releaseQuote} submitLabel="Confirm pricing & send to customer" className="p-5">
                <input type="hidden" name="orderId" value={order.id} />
                {quoteLines.map((l) => (
                  <Field key={l.id} label={`${l.quantity} × ${getProduct(l.productId)?.name}${l.team ? ` (${l.team.name})` : ""}`} htmlFor={`q-${l.id}`}>
                    <input id={`q-${l.id}`} name={`quote.${l.id}`} type="number" step="0.01" min="0" placeholder="Per piece, USD" defaultValue={l.quotedUnitCents ? (l.quotedUnitCents / 100).toFixed(2) : ""} />
                  </Field>
                ))}
              </ActionForm>
            </Card>
          )}
          {["PAID", "INVOICED", "PROOF_REVISION", "PROOF_READY"].includes(status) && (
            <Card className={status === "PROOF_READY" ? "" : "border-amber-300"}>
              <CardHeader title={status === "PROOF_READY" ? "Replace proof" : "Upload production proof"} description="PDF or image showing every item, color, placement and the full name/number list." />
              <ActionForm action={uploadProof} submitLabel="Send proof to customer" className="p-5" resetOnSuccess>
                <input type="hidden" name="orderId" value={order.id} />
                <input name="file" type="file" accept=".pdf,.png,.jpg,.jpeg" required aria-label="Proof file" />
                <Field label="Note to customer (optional)" htmlFor="pnote"><textarea id="pnote" name="note" rows={2} /></Field>
              </ActionForm>
            </Card>
          )}
          {["IN_PRODUCTION", "SHIPPED"].includes(status) && (
            <Card>
              <CardHeader title="Add shipment" description="Shopify fulfillments with tracking sync automatically; use this for anything shipped outside Shopify." />
              <ActionForm action={addShipment} submitLabel="Record shipment" className="grid gap-3 p-5 sm:grid-cols-2">
                <input type="hidden" name="orderId" value={order.id} />
                <Field label="Carrier" htmlFor="carrier"><select id="carrier" name="carrier"><option>UPS</option><option>FedEx</option><option>USPS</option><option>Other</option></select></Field>
                <Field label="Tracking number" htmlFor="tn"><input id="tn" name="trackingNumber" required /></Field>
              </ActionForm>
            </Card>
          )}
          <OrderLinesSummary order={order} />
          {order.proofs.map((p) => (
            <p key={p.id} className="text-sm">Proof v{p.version}: <a className="text-brand-600 underline" href={p.fileUrl} target="_blank" rel="noreferrer">file</a> — {p.status}{p.customerNote ? ` — “${p.customerNote}”` : ""}</p>
          ))}
        </div>
        <aside className="space-y-6">
          <Card className="p-5 text-sm">
            <h2 className="font-semibold">Totals (snapshot, catalog {order.catalogVersion})</h2>
            <p className="mt-2">Garments {formatMoney(order.subtotalCents)} · Decoration {formatMoney(order.decorationCents)} · Personalization {formatMoney(order.personalizationCents)} · Setup {formatMoney(order.setupCents)} · Shipping {formatMoney(order.shippingCents)}</p>
            <p className="mt-1 text-base font-bold">Total {formatMoney(order.totalCents)} {order.taxExempt ? "(tax exempt)" : "+ tax"}</p>
            {address && <p className="mt-3 text-slate-600">Ship to: {address.company}, {address.attention ? `${address.attention}, ` : ""}{address.line1}, {address.city}, {address.state} {address.postalCode}</p>}
            {order.notes && <p className="mt-2 text-slate-600">Customer notes: {order.notes}</p>}
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold">Status</h2>
            {status === "SHIPPED" && (
              <ActionForm action={staffSetStatus} submitLabel="Mark delivered" submitVariant="secondary" className="mt-2">
                <input type="hidden" name="orderId" value={order.id} /><input type="hidden" name="status" value="DELIVERED" />
              </ActionForm>
            )}
            {!["IN_PRODUCTION", "SHIPPED", "DELIVERED", "CANCELLED", "DRAFT"].includes(status) && (
              <ActionForm action={staffSetStatus} submitLabel="Cancel order" submitVariant="danger" className="mt-2">
                <input type="hidden" name="orderId" value={order.id} /><input type="hidden" name="status" value="CANCELLED" />
                <input name="note" placeholder="Reason (shown to customer). Refund in Shopify if paid." />
              </ActionForm>
            )}
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold">Activity</h2>
            <ActionForm action={addInternalNote} submitLabel="Add note" submitVariant="secondary" className="mt-2" resetOnSuccess>
              <input type="hidden" name="orderId" value={order.id} />
              <textarea name="note" rows={2} aria-label="Note" />
              <label className="flex items-center gap-2 text-xs font-normal"><input type="checkbox" name="visible" /> Visible to customer</label>
            </ActionForm>
            <ol className="mt-4 space-y-3 text-sm">
              {order.events.map((e) => (
                <li key={e.id} className={`border-l-2 pl-3 ${e.visible ? "border-slate-200" : "border-amber-300 bg-amber-50/50"}`}>
                  <p>{e.message}</p>
                  <p className="text-xs text-slate-400">{e.createdAt.toLocaleString()}{!e.visible && " · internal"}</p>
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>
    </>
  );
}
