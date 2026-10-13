import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireOrg } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { getOrder, priceFullOrder } from "@/lib/server/orders";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Card, CardHeader, Field, Notice, PageHeader } from "@/components/ui";
import { AddressForm } from "@/components/AddressForm";
import { submitOrderAction } from "@/lib/actions/orders";
import { CATALOG, getProduct } from "@/lib/catalog";
import { can, formatMoney, formatOrderNumber, parseLineConfig } from "@/lib/domain";
import { shopifyConfigured } from "@/lib/server/shopify";

export const metadata = { title: "Review & checkout" };

export default async function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org, role } = await requireOrg();
  const order = await getOrder(id, org.id);
  if (!order) notFound();
  if (order.status !== "DRAFT") redirect(`/app/orders/${id}`);

  const [price, addresses] = await Promise.all([
    priceFullOrder(order),
    db.address.findMany({ where: { organizationId: org.id }, orderBy: [{ isDefault: "desc" }, { label: "asc" }] }),
  ]);
  const errors = price.issues.filter((i) => i.level === "error");
  const needsQuote = price.quoteReasons.length > 0;
  const needsApproval = org.approvalThresholdCents != null && price.totalCents >= org.approvalThresholdCents && !can(role, "approve_orders");
  const termsApproved = org.termsStatus === "APPROVED";
  const taxExempt = org.taxExemptStatus === "VERIFIED";

  const submitLabel = needsQuote
    ? "Submit for pricing review"
    : needsApproval
      ? "Submit for internal approval"
      : `Place order · ${formatMoney(price.totalCents)}`;

  return (
    <>
      <PageHeader back={{ href: `/app/orders/${id}`, label: "Back to order builder" }} title="Review & checkout" description={`${order.name} · ${formatOrderNumber(order.number)}`} />
      {errors.length > 0 ? (
        <Notice tone="red" title="This order isn't ready yet">
          <ul className="list-inside list-disc">{errors.map((e, i) => <li key={i}>{e.message}</li>)}</ul>
          <Link href={`/app/orders/${id}`} className="mt-2 inline-block font-semibold underline">Fix in the order builder</Link>
        </Notice>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <Card>
              <CardHeader title="1. Confirm your items" description="Check colors, logos and roster sizes. You'll also approve a production proof before anything is made." />
              <ul className="divide-y divide-slate-100">
                {order.lines.map((l) => {
                  const p = getProduct(l.productId)!;
                  const c = parseLineConfig(l.config);
                  const lp = price.lines.find((x) => x.key === l.id)!;
                  return (
                    <li key={l.id} className="flex flex-wrap justify-between gap-2 px-5 py-3 text-sm">
                      <div>
                        <p className="font-semibold">{lp.quantity} × {p.name} — {p.colors.find((x) => x.id === c.color)?.name}</p>
                        <p className="text-slate-500">
                          {l.team?.name ?? "No team"}
                          {c.decorations.length > 0 && ` · ${c.decorations.map((d) => `${p.locations.find((x) => x.id === d.location)?.label} (${CATALOG.decorationMethods[d.method as keyof typeof CATALOG.decorationMethods]?.label})`).join(", ")}`}
                          {c.names && " · names"}{c.numbers && " · numbers"}
                        </p>
                        {lp.issues.filter((i) => i.level === "warning").map((i, n) => <p key={n} className="text-amber-700">! {i.message}</p>)}
                      </div>
                      <p className="font-semibold">{lp.needsQuote ? "Pricing review" : formatMoney(lp.lineTotalCents)}</p>
                    </li>
                  );
                })}
              </ul>
            </Card>

            <ActionForm action={submitOrderAction} className="space-y-6">
              <input type="hidden" name="orderId" value={order.id} />
              <Card>
                <CardHeader title="2. Shipping address" />
                <div className="p-5">
                  {addresses.length === 0 ? (
                    <p className="text-sm text-amber-700">Add a shipping address below first.</p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {addresses.map((a, i) => (
                        <label key={a.id} className="flex cursor-pointer gap-2 rounded-lg border border-slate-200 p-3 font-normal has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                          <input type="radio" name="shippingAddressId" value={a.id} defaultChecked={order.shippingAddressId ? order.shippingAddressId === a.id : i === 0} required className="mt-1" />
                          <span className="text-sm"><strong>{a.label}</strong><br />{a.attention && <>{a.attention}<br /></>}{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.postalCode}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              <Card>
                <CardHeader title="3. Payment" />
                <div className="space-y-4 p-5">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="flex cursor-pointer gap-2 rounded-lg border border-slate-200 p-3 font-normal has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                      <input type="radio" name="paymentMethod" value="CARD" defaultChecked={!termsApproved || order.paymentMethod !== "INVOICE"} className="mt-1" />
                      <span className="text-sm"><strong>Pay online</strong><br />Card, Shop Pay and more via secure Shopify checkout.</span>
                    </label>
                    <label className={`flex gap-2 rounded-lg border border-slate-200 p-3 font-normal has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 ${termsApproved ? "cursor-pointer" : "opacity-60"}`}>
                      <input type="radio" name="paymentMethod" value="INVOICE" disabled={!termsApproved} defaultChecked={termsApproved && order.paymentMethod === "INVOICE"} className="mt-1" />
                      <span className="text-sm">
                        <strong>Purchase order / invoice</strong><br />
                        {termsApproved ? `Net ${org.termsNetDays ?? 30} terms — approved for ${org.name}.` : <>Requires approved terms. <Link href="/app/settings#purchasing" className="underline">Apply</Link></>}
                      </span>
                    </label>
                  </div>
                  <Field label="PO number" htmlFor="poNumber" hint="Required for invoice orders. Optional for card payments — it'll print on your receipt.">
                    <input id="poNumber" name="poNumber" defaultValue={order.poNumber ?? ""} />
                  </Field>
                  <Field label="Notes (optional)" htmlFor="notes" hint="Anything our art team should know, e.g. “match last year's navy”.">
                    <textarea id="notes" name="notes" rows={2} defaultValue={order.notes ?? ""} />
                  </Field>
                  {needsApproval && <Notice tone="amber">Orders of {formatMoney(org.approvalThresholdCents!)} or more need approval from an admin or purchaser in {org.name}. We&apos;ll notify them.</Notice>}
                  {needsQuote && <Notice tone="blue" title="Pricing review">{price.quoteReasons.join(" ")} We&apos;ll confirm the price and you&apos;ll pay online — no phone calls.</Notice>}
                  {!shopifyConfigured() && !needsQuote && <Notice tone="amber">Test mode: Shopify isn&apos;t connected, so the next step is a simulated checkout. No card is charged.</Notice>}
                </div>
              </Card>
              <SubmitBar label={submitLabel} disabled={addresses.length === 0} />
            </ActionForm>

            <Card>
              <CardHeader title="Add a shipping address" />
              <div className="p-5"><AddressForm /></div>
            </Card>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Card className="p-5">
              <h2 className="font-semibold">Summary</h2>
              <dl className="mt-3 space-y-1.5 text-sm">
                <Row label={`Garments (${price.totalQuantity} pcs)`} value={formatMoney(price.productCents)} />
                {price.decorationCents > 0 && <Row label="Decoration" value={formatMoney(price.decorationCents)} />}
                {price.personalizationCents > 0 && <Row label="Names & numbers" value={formatMoney(price.personalizationCents)} />}
                {price.setupFees.map((f) => <Row key={f.logoId + f.method} label={`${f.methodLabel} setup`} value={f.waived ? "Free (on file)" : formatMoney(f.cents)} />)}
                <Row label="Shipping" value={price.shippingCents ? formatMoney(price.shippingCents) : "Free"} />
                <Row label="Sales tax" value={taxExempt ? "Exempt (verified)" : "Calculated at payment"} />
                <div className="flex justify-between border-t border-slate-200 pt-2 text-lg font-bold"><dt>Total</dt><dd>{formatMoney(price.totalCents)}</dd></div>
              </dl>
              {!taxExempt && ["HIGH_SCHOOL", "COLLEGE"].includes(org.type) && (
                <p className="mt-3 text-xs text-slate-500">Tax-exempt? <Link href="/app/settings#purchasing" className="underline">Upload your certificate</Link> before ordering.</p>
              )}
              <p className="mt-3 text-xs text-slate-500">
                Production: {Math.max(...order.lines.map((l) => getProduct(l.productId)?.leadTimeDays[0] ?? 0))}–{Math.max(...order.lines.map((l) => getProduct(l.productId)?.leadTimeDays[1] ?? 0))} business days after you approve your proof, plus shipping.
              </p>
            </Card>
          </aside>
        </div>
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-slate-600">{label}</dt><dd>{value}</dd></div>;
}

function SubmitBar({ label, disabled }: { label: string; disabled: boolean }) {
  return disabled ? (
    <p className="text-sm text-amber-700">Add a shipping address to continue.</p>
  ) : (
    <SubmitButton variant="accent" className="w-full py-3 text-base">{label}</SubmitButton>
  );
}
