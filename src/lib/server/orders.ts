// Order lifecycle. Every state change goes through this module so pricing is
// always recomputed on the server and every change leaves an audit event.

import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { CATALOG, getProduct } from "../catalog";
import { can, formatOrderNumber, parseJsonArray, parseLineConfig, type OrderStatus, type Role } from "../domain";
import { priceOrder, type OrderPrice, type PricingLineInput } from "../pricing";
import { buildLineItems } from "../roster";
import { buildCheckoutItems, type CheckoutSourceLine } from "../checkout-lines";
import { createCardCheckout, createInvoiceOrder, deleteDraftOrder, shopifyConfigured, type DraftOrderParams } from "./shopify";

export const orderInclude = {
  lines: {
    orderBy: { sortOrder: "asc" },
    include: { items: { orderBy: { sortOrder: "asc" } }, team: { include: { roster: { orderBy: { sortOrder: "asc" } } } } },
  },
  proofs: { orderBy: { version: "desc" } },
  events: { orderBy: { createdAt: "desc" } },
  shipments: { orderBy: { createdAt: "desc" } },
  organization: true,
} satisfies Prisma.OrderInclude;

export type FullOrder = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export async function getOrder(orderId: string, organizationId?: string) {
  return db.order.findFirst({
    where: { id: orderId, ...(organizationId ? { organizationId } : {}) },
    include: orderInclude,
  });
}

export async function addEvent(orderId: string, type: string, message: string, actorId?: string | null, visible = true) {
  await db.orderEvent.create({ data: { orderId, type, message, actorId: actorId ?? null, visible } });
}

export async function setStatus(orderId: string, status: OrderStatus, message: string, actorId?: string | null) {
  await db.order.update({ where: { id: orderId }, data: { status } });
  await addEvent(orderId, "STATUS", message, actorId);
}

export async function nextOrderNumber(): Promise<number> {
  const c = await db.counter.upsert({
    where: { id: "order" },
    create: { id: "order", value: 1001 },
    update: { value: { increment: 1 } },
  });
  return c.value;
}

export async function logoSetupsPaid(organizationId: string): Promise<Record<string, string[]>> {
  const logos = await db.logo.findMany({ where: { organizationId }, select: { id: true, setupsPaid: true } });
  return Object.fromEntries(logos.map((l) => [l.id, parseJsonArray(l.setupsPaid)]));
}

/**
 * Pricing inputs for an order. Drafts read the team's *current* roster; once an
 * order is submitted, the frozen item snapshot is used.
 */
export function pricingLines(order: FullOrder): (PricingLineInput & CheckoutSourceLine)[] {
  return order.lines.map((l) => {
    const config = parseLineConfig(l.config);
    const product = getProduct(l.productId);
    const items =
      order.status === "DRAFT" && product
        ? buildLineItems(product, config, l.team?.roster ?? [])
        : l.items.map((i) => ({ size: i.size, quantity: i.quantity, name: i.name, number: i.number }));
    return {
      key: l.id,
      productId: l.productId,
      config,
      items,
      teamName: l.team?.name ?? null,
      quotedUnitCents: l.quotedUnitCents,
    };
  });
}

export async function priceFullOrder(order: FullOrder): Promise<OrderPrice> {
  return priceOrder({ lines: pricingLines(order), setupsPaid: await logoSetupsPaid(order.organizationId) });
}

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------

export interface SubmitInput {
  paymentMethod: "CARD" | "INVOICE";
  poNumber: string | null;
  shippingAddressId: string;
  notes: string | null;
  contactEmail: string;
}

export async function submitOrder(orderId: string, ctx: { userId: string; role: Role; organizationId: string }, input: SubmitInput) {
  const order = await getOrder(orderId, ctx.organizationId);
  if (!order) throw new Error("Order not found.");
  if (order.status !== "DRAFT") throw new Error("This order was already submitted.");
  if (!can(ctx.role, "build_orders")) throw new Error("You don't have permission to place orders.");

  const org = order.organization;
  const address = await db.address.findFirst({ where: { id: input.shippingAddressId, organizationId: org.id } });
  if (!address) throw new Error("Choose a shipping address.");
  if (input.paymentMethod === "INVOICE") {
    if (org.termsStatus !== "APPROVED") throw new Error("Invoice terms aren't approved for your organization yet.");
    if (!input.poNumber?.trim()) throw new Error("A purchase order number is required for invoice orders.");
  }

  const lines = pricingLines(order);
  const price = priceOrder({ lines, setupsPaid: await logoSetupsPaid(org.id) });
  const errors = price.issues.filter((i) => i.level === "error");
  if (errors.length) throw new Error(errors.map((e) => e.message).join(" "));
  if (price.totalQuantity === 0) throw new Error("Add at least one product.");

  // Freeze line items and prices.
  await db.$transaction(async (tx) => {
    for (const line of lines) {
      const p = price.lines.find((pl) => pl.key === line.key)!;
      await tx.orderLineItem.deleteMany({ where: { lineId: line.key } });
      await tx.orderLineItem.createMany({
        data: line.items.map((i, idx) => ({
          lineId: line.key,
          name: i.name || null,
          number: i.number || null,
          size: i.size,
          quantity: i.quantity,
          sortOrder: idx,
        })),
      });
      await tx.orderLine.update({
        where: { id: line.key },
        data: {
          quantity: p.quantity,
          unitPriceCents: p.baseUnitCents,
          decorationUnitCents: p.decorationUnitCents,
          lineTotalCents: p.lineTotalCents,
        },
      });
    }
    await tx.order.update({
      where: { id: order.id },
      data: {
        ...priceSnapshot(price),
        paymentMethod: input.paymentMethod,
        poNumber: input.poNumber?.trim() || null,
        shippingAddressId: address.id,
        shippingSnapshot: JSON.stringify({ ...address, company: org.name }),
        notes: input.notes?.trim() || null,
        taxExempt: org.taxExemptStatus === "VERIFIED",
        submittedAt: new Date(),
        status: "PENDING_APPROVAL", // provisional; resolved just below
      },
    });
  });
  await addEvent(order.id, "STATUS", "Order submitted.", ctx.userId);

  if (price.quoteReasons.length) {
    await setStatus(order.id, "QUOTE_REVIEW", "Sent for pricing review: " + price.quoteReasons.join(" "), ctx.userId);
    return { status: "QUOTE_REVIEW" as const };
  }

  const needsApproval =
    org.approvalThresholdCents != null && price.totalCents >= org.approvalThresholdCents && !can(ctx.role, "approve_orders");
  if (needsApproval) {
    await db.order.update({ where: { id: order.id }, data: { approvalRequestedAt: new Date() } });
    await addEvent(order.id, "STATUS", "Waiting for approval from an organization admin or purchaser.", ctx.userId);
    return { status: "PENDING_APPROVAL" as const };
  }

  try {
    return await proceedToPayment(order.id, input.contactEmail, ctx.userId);
  } catch (e) {
    // Don't leave the order half-submitted: return it to draft so the customer can retry.
    await db.order.update({ where: { id: order.id }, data: { status: "DRAFT", submittedAt: null } });
    await addEvent(order.id, "NOTE", `Checkout couldn't be created: ${(e as Error).message}`, ctx.userId, false);
    throw new Error("We couldn't open checkout just now. Your order was saved as a draft — please try again in a minute.");
  }
}

function priceSnapshot(price: OrderPrice) {
  return {
    catalogVersion: price.catalogVersion,
    subtotalCents: price.productCents,
    decorationCents: price.decorationCents,
    personalizationCents: price.personalizationCents,
    setupCents: price.setupCents,
    shippingCents: price.shippingCents,
    totalCents: price.totalCents,
    quoteReasons: JSON.stringify(price.quoteReasons),
  };
}

/** Internal approval by an org admin/purchaser. */
export async function approveOrder(orderId: string, ctx: { userId: string; role: Role; organizationId: string; email: string }) {
  if (!can(ctx.role, "approve_orders")) throw new Error("Only admins and purchasers can approve orders.");
  const order = await db.order.findFirst({ where: { id: orderId, organizationId: ctx.organizationId } });
  if (!order || order.status !== "PENDING_APPROVAL") throw new Error("This order isn't waiting for approval.");
  await db.order.update({ where: { id: orderId }, data: { approvedById: ctx.userId, approvedAt: new Date() } });
  await addEvent(orderId, "STATUS", "Approved for purchase.", ctx.userId);
  return proceedToPayment(orderId, ctx.email, ctx.userId);
}

/** Creates the Shopify checkout (card) or the Shopify invoice order (PO / terms). */
export async function proceedToPayment(orderId: string, contactEmail: string, actorId: string | null) {
  const order = await getOrder(orderId);
  if (!order) throw new Error("Order not found.");
  const price = await priceFullOrder(order);
  if (!price.canCheckout) throw new Error("This order can't be paid yet: " + price.issues.map((i) => i.message).join(" "));
  // Price may have been finalized by a quote; keep the order and line snapshots in sync.
  await db.order.update({ where: { id: orderId }, data: priceSnapshot(price) });
  for (const p of price.lines) {
    await db.orderLine.update({
      where: { id: p.key },
      data: { quantity: p.quantity, unitPriceCents: p.baseUnitCents, decorationUnitCents: p.decorationUnitCents, lineTotalCents: p.lineTotalCents },
    });
  }

  const address = order.shippingSnapshot ? JSON.parse(order.shippingSnapshot) : null;
  const params: DraftOrderParams = {
    clubCustomOrderId: order.id,
    orderNumber: formatOrderNumber(order.number),
    email: contactEmail,
    organizationName: order.organization.name,
    poNumber: order.poNumber,
    taxExempt: order.taxExempt,
    note: `${order.name}${order.notes ? `\n\nCustomer notes: ${order.notes}` : ""}\nCatalog ${price.catalogVersion}`,
    items: buildCheckoutItems(pricingLines(order), price),
    shippingCents: price.shippingCents,
    shippingAddress: address,
    netTermsDays: order.organization.termsNetDays,
  };

  if (order.paymentMethod === "INVOICE") {
    if (shopifyConfigured()) {
      const r = await createInvoiceOrder(params);
      await db.order.update({
        where: { id: orderId },
        data: { shopifyDraftOrderId: r.draftOrderId, shopifyOrderId: r.shopifyOrderId, shopifyOrderName: r.shopifyOrderName },
      });
    }
    await markSetupsPaid(order);
    await setStatus(
      orderId,
      "INVOICED",
      `Accepted on Net ${order.organization.termsNetDays ?? 30} terms (PO ${order.poNumber}). An invoice will be emailed.`,
      actorId,
    );
    return { status: "INVOICED" as const };
  }

  let checkoutUrl: string;
  if (shopifyConfigured()) {
    const r = await createCardCheckout(params);
    checkoutUrl = r.checkoutUrl;
    await db.order.update({ where: { id: orderId }, data: { shopifyDraftOrderId: r.draftOrderId } });
  } else {
    checkoutUrl = `/test-checkout/${orderId}`;
  }
  await db.order.update({ where: { id: orderId }, data: { checkoutUrl } });
  await setStatus(orderId, "AWAITING_PAYMENT", "Ready for secure online payment.", actorId);
  return { status: "AWAITING_PAYMENT" as const, checkoutUrl };
}

export async function markPaid(orderId: string, shopify?: { orderId: string; name: string }) {
  const order = await getOrder(orderId);
  if (!order) return;
  if (order.status !== "AWAITING_PAYMENT") {
    // Never drop a payment silently: flag it for staff to reconcile.
    if (!order.paidAt)
      await addEvent(orderId, "PAYMENT", `⚠️ Payment received while order was "${order.status}" (Shopify ${shopify?.name ?? "?"}). Staff review needed.`, null, false);
    return;
  }
  await db.order.update({
    where: { id: orderId },
    data: { paidAt: new Date(), shopifyOrderId: shopify?.orderId, shopifyOrderName: shopify?.name },
  });
  await markSetupsPaid(order);
  await setStatus(orderId, "PAID", "Payment received. Our art team is preparing your proof.");
}

/** Remember one-time setups (digitizing) so future orders don't pay them again. */
async function markSetupsPaid(order: FullOrder) {
  const byLogo = new Map<string, Set<string>>();
  for (const l of order.lines) {
    for (const d of parseLineConfig(l.config).decorations) {
      const m = CATALOG.decorationMethods[d.method as keyof typeof CATALOG.decorationMethods];
      if (!d.logoId || !m?.setupOneTimePerLogo || l.quotedUnitCents != null) continue;
      byLogo.set(d.logoId, (byLogo.get(d.logoId) ?? new Set()).add(m.id));
    }
  }
  for (const [logoId, methods] of byLogo) {
    const logo = await db.logo.findFirst({ where: { id: logoId, organizationId: order.organizationId } });
    if (!logo) continue;
    const merged = [...new Set([...parseJsonArray(logo.setupsPaid), ...methods])];
    await db.logo.update({ where: { id: logoId }, data: { setupsPaid: JSON.stringify(merged) } });
  }
}

// ---------------------------------------------------------------------------
// Proofs
// ---------------------------------------------------------------------------

export async function decideProof(
  proofId: string,
  ctx: { userId: string; role: Role; organizationId: string },
  decision: "APPROVED" | "CHANGES_REQUESTED",
  note: string | null,
) {
  if (!can(ctx.role, "approve_proofs")) throw new Error("You can't approve proofs.");
  const proof = await db.proof.findFirst({ where: { id: proofId, order: { organizationId: ctx.organizationId } } });
  if (!proof || proof.status !== "PENDING") throw new Error("This proof has already been reviewed.");
  if (decision === "CHANGES_REQUESTED" && !note?.trim()) throw new Error("Tell us what to change.");
  await db.proof.update({
    where: { id: proofId },
    data: { status: decision, customerNote: note?.trim() || null, decidedById: ctx.userId, decidedAt: new Date() },
  });
  if (decision === "APPROVED") {
    await addEvent(proof.orderId, "PROOF", `Proof v${proof.version} approved.`, ctx.userId);
    await setStatus(proof.orderId, "IN_PRODUCTION", "Sent to production.", ctx.userId);
  } else {
    await addEvent(proof.orderId, "PROOF", `Changes requested on proof v${proof.version}: ${note}`, ctx.userId);
    await setStatus(proof.orderId, "PROOF_REVISION", "Revising proof with your changes.", ctx.userId);
  }
}

// ---------------------------------------------------------------------------
// Drafts & reorders
// ---------------------------------------------------------------------------

export async function createDraft(organizationId: string, userId: string, name: string) {
  return db.order.create({
    data: { organizationId, createdById: userId, name: name.trim() || "New order", number: await nextOrderNumber() },
  });
}

/** Copy a past order's products, teams and designs into a new draft priced at today's rates. */
export async function reorder(orderId: string, organizationId: string, userId: string) {
  const source = await getOrder(orderId, organizationId);
  if (!source) throw new Error("Order not found.");
  const draft = await db.order.create({
    data: {
      organizationId,
      createdById: userId,
      name: `${source.name} (reorder)`,
      number: await nextOrderNumber(),
      reorderedFromId: source.id,
      shippingAddressId: source.shippingAddressId,
      paymentMethod: source.paymentMethod,
      lines: {
        create: source.lines.map((l, i) => {
          const config = parseLineConfig(l.config);
          // A team that no longer exists can't supply a roster, so fall back to the old size run.
          if (config.sizing === "ROSTER" && !l.teamId) {
            config.sizing = "SIZE_RUN";
            config.sizeRun = {};
            for (const it of l.items) config.sizeRun[it.size] = (config.sizeRun[it.size] ?? 0) + it.quantity;
          }
          return { productId: l.productId, teamId: l.teamId, config: JSON.stringify(config), sortOrder: i };
        }),
      },
    },
  });
  await addEvent(draft.id, "NOTE", `Reordered from ${formatOrderNumber(source.number)}. Prices reflect today's catalog.`, userId);
  return draft;
}

/** Return an unpaid order to draft (customer edit) or cancel it, voiding any open checkout link. */
export async function voidCheckout(orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (order?.shopifyDraftOrderId && !order.shopifyOrderId) {
    await deleteDraftOrder(order.shopifyDraftOrderId).catch((e) =>
      addEvent(orderId, "NOTE", `Couldn't void Shopify draft ${order.shopifyDraftOrderId}: ${(e as Error).message}`, null, false),
    );
  }
  await db.order.update({ where: { id: orderId }, data: { checkoutUrl: null, shopifyDraftOrderId: null } });
}
