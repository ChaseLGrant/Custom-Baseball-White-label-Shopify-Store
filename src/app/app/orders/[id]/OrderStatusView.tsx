import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { Badge, Button, ButtonLink, Card, CardHeader, Field, Notice, PageHeader, statusTone } from "@/components/ui";
import { MilestoneTracker } from "@/components/MilestoneTracker";
import { OrderLinesSummary } from "@/components/OrderLinesSummary";
import { approveOrderAction, cancelOrderAction, decideProofAction, editOrderAction, reorderAction } from "@/lib/actions/orders";
import { ORDER_STATUSES, can, formatMoney, formatOrderNumber, isPaidOrInvoiced, parseJsonArray, type OrderStatus } from "@/lib/domain";
import type { OrgContext } from "@/lib/server/auth";
import type { FullOrder } from "@/lib/server/orders";
import { db } from "@/lib/server/db";

export async function OrderStatusView({ order, ctx, justSubmitted }: { order: FullOrder; ctx: OrgContext; justSubmitted: boolean }) {
  const status = order.status as OrderStatus;
  const info = ORDER_STATUSES[status];
  const pendingProof = order.proofs.find((p) => p.status === "PENDING");
  const unpaid = ["PENDING_APPROVAL", "QUOTE_REVIEW", "AWAITING_PAYMENT"].includes(status);
  const address = order.shippingSnapshot ? JSON.parse(order.shippingSnapshot) : null;
  const creator = await db.user.findUnique({ where: { id: order.createdById }, select: { name: true } });
  const quoteReasons = parseJsonArray(order.quoteReasons);

  return (
    <>
      <PageHeader
        back={{ href: "/app/orders", label: "Orders" }}
        title={<span className="flex flex-wrap items-center gap-3">{order.name} <Badge tone={statusTone(status)}>{info?.label ?? status}</Badge></span>}
        description={`${formatOrderNumber(order.number)} · placed by ${creator?.name ?? "—"}${order.submittedAt ? ` on ${order.submittedAt.toLocaleDateString()}` : ""}`}
        actions={
          isPaidOrInvoiced(status) || status === "CANCELLED" ? (
            <form action={reorderAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <Button variant="secondary">↻ Reorder</Button>
            </form>
          ) : null
        }
      />

      {justSubmitted && status === "INVOICED" && <div className="mb-4"><Notice tone="green" title="Order placed!">Your purchase order was accepted. You&apos;ll get a proof to approve here soon.</Notice></div>}
      {justSubmitted && status === "QUOTE_REVIEW" && <div className="mb-4"><Notice tone="green" title="Submitted for pricing review">We&apos;ll confirm pricing and email you when it&apos;s ready to pay online.</Notice></div>}
      {justSubmitted && status === "PENDING_APPROVAL" && <div className="mb-4"><Notice tone="green" title="Sent for approval">An admin or purchaser in your organization will review it.</Notice></div>}

      {status !== "CANCELLED" && <Card className="mb-6 p-5"><MilestoneTracker status={status} /></Card>}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          {/* What happens next / the customer's action */}
          <Card className={status === "PROOF_READY" || status === "AWAITING_PAYMENT" ? "border-amber-300" : ""}>
            <CardHeader title="Status" description={info?.customer} />
            <div className="space-y-4 p-5">
              {status === "AWAITING_PAYMENT" && order.checkoutUrl && (
                <ButtonLink href={order.checkoutUrl} variant="accent" className="px-6 py-3 text-base">Pay {formatMoney(order.totalCents)} securely</ButtonLink>
              )}
              {status === "QUOTE_REVIEW" && quoteReasons.length > 0 && (
                <ul className="list-inside list-disc text-sm text-slate-600">{quoteReasons.map((r) => <li key={r}>{r}</li>)}</ul>
              )}
              {status === "PENDING_APPROVAL" &&
                (can(ctx.role, "approve_orders") ? (
                  <ActionForm action={approveOrderAction} submitLabel={`Approve ${formatMoney(order.totalCents)} order`} submitVariant="accent">
                    <input type="hidden" name="orderId" value={order.id} />
                    <p className="text-sm text-slate-600">Approving sends this order to payment{order.paymentMethod === "INVOICE" ? ` on your invoice terms (PO ${order.poNumber})` : ""}.</p>
                  </ActionForm>
                ) : (
                  <p className="text-sm text-slate-600">Your organization requires approval for orders of this size. Admins and purchasers see it on their dashboard.</p>
                ))}

              {pendingProof && status === "PROOF_READY" && (
                <div className="space-y-4">
                  <ProofPreview url={pendingProof.fileUrl} version={pendingProof.version} note={pendingProof.staffNote} />
                  {can(ctx.role, "approve_proofs") && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <ActionForm action={decideProofAction} submitLabel="Approve proof & start production" submitVariant="accent" className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                        <input type="hidden" name="proofId" value={pendingProof.id} />
                        <input type="hidden" name="decision" value="APPROVED" />
                        <label className="flex items-start gap-2 font-normal">
                          <input type="checkbox" name="confirm" className="mt-1" />
                          <span className="text-sm">I&apos;ve checked spelling, numbers, sizes, colors and logo placement. I understand production starts on approval.</span>
                        </label>
                      </ActionForm>
                      <ActionForm action={decideProofAction} submitLabel="Request changes" submitVariant="secondary" className="rounded-lg border border-slate-200 p-4">
                        <input type="hidden" name="proofId" value={pendingProof.id} />
                        <input type="hidden" name="decision" value="CHANGES_REQUESTED" />
                        <Field label="What should we change?" htmlFor="note"><textarea id="note" name="note" rows={3} placeholder="e.g. #12 should be RIVERA not RIVERRA; logo slightly larger" /></Field>
                      </ActionForm>
                    </div>
                  )}
                </div>
              )}

              {order.shipments.length > 0 && (
                <div>
                  <p className="text-sm font-semibold">Tracking</p>
                  <ul className="mt-1 space-y-1 text-sm">
                    {order.shipments.map((s) => (
                      <li key={s.id}>
                        {s.carrier ?? "Carrier"}: {s.trackingUrl ? <a href={s.trackingUrl} target="_blank" rel="noreferrer" className="font-medium text-brand-600 underline">{s.trackingNumber ?? "Track package"}</a> : s.trackingNumber}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {unpaid && (
                <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4">
                  <ActionForm action={editOrderAction} submitLabel="Edit order" submitVariant="secondary"><input type="hidden" name="orderId" value={order.id} /></ActionForm>
                  <ActionForm action={cancelOrderAction} submitLabel="Cancel order" submitVariant="danger"><input type="hidden" name="orderId" value={order.id} /></ActionForm>
                </div>
              )}
            </div>
          </Card>

          <OrderLinesSummary order={order} />

          {order.proofs.length > 0 && (
            <Card>
              <CardHeader title="Proof history" />
              <ul className="divide-y divide-slate-100">
                {order.proofs.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                    <span><a href={p.fileUrl} target="_blank" className="font-medium text-brand-600 underline" rel="noreferrer">Proof v{p.version}</a> · {p.createdAt.toLocaleDateString()}</span>
                    <span className="flex items-center gap-2">
                      {p.customerNote && <span className="text-slate-500">“{p.customerNote}”</span>}
                      <Badge tone={p.status === "APPROVED" ? "green" : p.status === "PENDING" ? "amber" : "blue"}>{p.status === "CHANGES_REQUESTED" ? "Changes requested" : p.status.toLowerCase()}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <aside className="space-y-6">
          <Card className="p-5">
            <h2 className="font-semibold">Totals</h2>
            <dl className="mt-3 space-y-1.5 text-sm">
              <Row label="Garments" value={formatMoney(order.subtotalCents)} />
              {order.decorationCents > 0 && <Row label="Decoration" value={formatMoney(order.decorationCents)} />}
              {order.personalizationCents > 0 && <Row label="Names & numbers" value={formatMoney(order.personalizationCents)} />}
              {order.setupCents > 0 && <Row label="Setup" value={formatMoney(order.setupCents)} />}
              <Row label="Shipping" value={order.shippingCents ? formatMoney(order.shippingCents) : "Free"} />
              <Row label="Sales tax" value={order.taxExempt ? "Exempt" : isPaidOrInvoiced(status) ? "As charged by Shopify" : "Calculated at payment"} />
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold"><dt>Total</dt><dd>{formatMoney(order.totalCents)}</dd></div>
            </dl>
            {status === "QUOTE_REVIEW" && <p className="mt-2 text-xs text-violet-700">Excludes items awaiting pricing.</p>}
          </Card>
          <Card className="p-5 text-sm">
            <h2 className="font-semibold">Details</h2>
            <dl className="mt-3 space-y-2">
              <div><dt className="text-slate-500">Payment</dt><dd>{order.paymentMethod === "INVOICE" ? `Invoice (Net ${order.organization.termsNetDays ?? 30})` : "Card via Shopify"}{order.shopifyOrderName ? ` · Shopify ${order.shopifyOrderName}` : ""}</dd></div>
              {order.poNumber && <div><dt className="text-slate-500">PO number</dt><dd>{order.poNumber}</dd></div>}
              {address && (
                <div><dt className="text-slate-500">Ship to</dt><dd>{address.attention && <>{address.attention}<br /></>}{address.line1}{address.line2 ? `, ${address.line2}` : ""}<br />{address.city}, {address.state} {address.postalCode}</dd></div>
              )}
              {order.notes && <div><dt className="text-slate-500">Notes</dt><dd>{order.notes}</dd></div>}
            </dl>
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold">Activity</h2>
            <ol className="mt-3 space-y-3 text-sm">
              {order.events.filter((e) => e.visible).map((e) => (
                <li key={e.id} className="border-l-2 border-slate-200 pl-3">
                  <p>{e.message}</p>
                  <p className="text-xs text-slate-400">{e.createdAt.toLocaleString()}</p>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs text-slate-500">Questions about an unusual order? <Link href="mailto:orders@clubcustom.example" className="underline">Email us</Link> — but you shouldn&apos;t need to.</p>
          </Card>
        </aside>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><dt className="text-slate-600">{label}</dt><dd>{value}</dd></div>;
}

function ProofPreview({ url, version, note }: { url: string; version: number; note: string | null }) {
  const isPdf = url.endsWith(".pdf");
  return (
    <div>
      <p className="text-sm font-semibold">Production proof v{version}</p>
      {note && <p className="mt-1 text-sm text-slate-600">From our art team: {note}</p>}
      <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        {isPdf ? (
          <iframe src={url} className="h-[520px] w-full" title={`Proof v${version}`} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`Proof v${version}`} className="mx-auto max-h-[520px]" />
        )}
      </div>
      <a href={url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-medium text-brand-600 underline">Open full size</a>
    </div>
  );
}
