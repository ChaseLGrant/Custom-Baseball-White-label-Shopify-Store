"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "../server/db";
import { requireOrg, requirePermission } from "../server/auth";
import { approveOrder, createDraft, decideProof, reorder, setStatus, submitOrder, voidCheckout } from "../server/orders";
import { getProduct, UNIFORM_KIT_PRODUCT_IDS } from "../catalog";
import { can, lineConfigSchema } from "../domain";
import { defaultLineConfig } from "../line-defaults";
import { action, optStr, str } from "./util";

export async function createOrder(fd: FormData) {
  const { org, user } = await requirePermission("build_orders");
  const order = await createDraft(org.id, user.id, str(fd, "name") || `${new Date().getFullYear()} order`);
  const teamId = optStr(fd, "teamId");
  const team = teamId ? await db.team.findFirst({ where: { id: teamId, organizationId: org.id } }) : null;
  if (fd.get("kit") === "1") {
    const logo = await db.logo.findFirst({ where: { organizationId: org.id, archived: false }, orderBy: { createdAt: "asc" } });
    await db.orderLine.createMany({
      data: UNIFORM_KIT_PRODUCT_IDS.map((productId, i) => ({
        orderId: order.id,
        productId,
        teamId: team?.id ?? null,
        sortOrder: i,
        config: JSON.stringify(defaultLineConfig(productId, logo?.id ?? null, productId === "pants-piped" ? "gray" : "navy")),
      })),
    });
  }
  redirect(`/app/orders/${order.id}`);
}

const draftLineSchema = z.object({
  id: z.string().optional(),
  productId: z.string(),
  teamId: z.string().nullable(),
  config: lineConfigSchema,
});

/** Autosave from the order builder: replaces the draft's lines. */
export async function saveDraft(orderId: string, input: { name: string; lines: unknown[] }) {
  const { org } = await requirePermission("build_orders");
  const order = await db.order.findFirst({ where: { id: orderId, organizationId: org.id } });
  if (!order || order.status !== "DRAFT") throw new Error("This order can no longer be edited.");
  const lines = z.array(draftLineSchema).max(100).parse(input.lines);

  const teamIds = new Set((await db.team.findMany({ where: { organizationId: org.id }, select: { id: true } })).map((t) => t.id));
  const logoIds = new Set((await db.logo.findMany({ where: { organizationId: org.id }, select: { id: true } })).map((l) => l.id));
  for (const l of lines) {
    if (!getProduct(l.productId)) throw new Error("Unknown product.");
    if (l.teamId && !teamIds.has(l.teamId)) l.teamId = null;
    for (const d of l.config.decorations) if (d.logoId && !logoIds.has(d.logoId)) d.logoId = null;
  }

  const existing = await db.orderLine.findMany({ where: { orderId }, select: { id: true } });
  const keep = new Set(lines.map((l) => l.id).filter(Boolean));
  const result = await db.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { name: input.name.trim().slice(0, 100) || order.name } });
    await tx.orderLine.deleteMany({ where: { orderId, id: { in: existing.map((e) => e.id).filter((id) => !keep.has(id)) } } });
    const ids: string[] = [];
    for (const [i, l] of lines.entries()) {
      const data = { productId: l.productId, teamId: l.teamId, config: JSON.stringify(l.config), sortOrder: i };
      if (l.id && existing.some((e) => e.id === l.id)) {
        await tx.orderLine.update({ where: { id: l.id }, data });
        ids.push(l.id);
      } else {
        ids.push((await tx.orderLine.create({ data: { ...data, orderId } })).id);
      }
    }
    return ids;
  });
  return { lineIds: result, savedAt: new Date().toISOString() };
}

export const submitOrderAction = action(async (_prev: unknown, fd: FormData) => {
  const { org, user, role } = await requireOrg();
  const orderId = str(fd, "orderId");
  const paymentMethod = str(fd, "paymentMethod") === "INVOICE" ? "INVOICE" : "CARD";
  const result = await submitOrder(orderId, { userId: user.id, role, organizationId: org.id }, {
    paymentMethod,
    poNumber: optStr(fd, "poNumber"),
    shippingAddressId: str(fd, "shippingAddressId"),
    notes: optStr(fd, "notes"),
    contactEmail: user.email,
  });
  revalidatePath("/app", "layout");
  if (result.status === "AWAITING_PAYMENT") redirect(result.checkoutUrl);
  redirect(`/app/orders/${orderId}?submitted=1`);
});

export const approveOrderAction = action(async (_prev: unknown, fd: FormData) => {
  const { org, user, role } = await requireOrg();
  const orderId = str(fd, "orderId");
  const result = await approveOrder(orderId, { userId: user.id, role, organizationId: org.id, email: user.email });
  revalidatePath("/app", "layout");
  if (result.status === "AWAITING_PAYMENT") redirect(result.checkoutUrl);
  return "Approved.";
});

export const decideProofAction = action(async (_prev: unknown, fd: FormData) => {
  const { org, user, role } = await requireOrg();
  const decision = str(fd, "decision") === "APPROVED" ? "APPROVED" : "CHANGES_REQUESTED";
  if (decision === "APPROVED" && fd.get("confirm") !== "on") throw new Error("Please confirm you've checked spelling, numbers, sizes and colors.");
  await decideProof(str(fd, "proofId"), { userId: user.id, role, organizationId: org.id }, decision, optStr(fd, "note"));
  revalidatePath("/app", "layout");
  return decision === "APPROVED" ? "Proof approved — your order is in production." : "Thanks — we'll send a revised proof.";
});

export async function reorderAction(fd: FormData) {
  const { org, user } = await requirePermission("build_orders");
  const draft = await reorder(str(fd, "orderId"), org.id, user.id);
  redirect(`/app/orders/${draft.id}`);
}

export async function deleteDraftAction(fd: FormData) {
  const { org } = await requirePermission("build_orders");
  await db.order.deleteMany({ where: { id: str(fd, "orderId"), organizationId: org.id, status: "DRAFT" } });
  revalidatePath("/app", "layout");
  redirect("/app/orders");
}

/** Customers can cancel any order that hasn't been paid or invoiced. */
export const cancelOrderAction = action(async (_prev: unknown, fd: FormData) => {
  const { org, user, role } = await requireOrg();
  const order = await db.order.findFirst({ where: { id: str(fd, "orderId"), organizationId: org.id } });
  if (!order || !["PENDING_APPROVAL", "QUOTE_REVIEW", "AWAITING_PAYMENT"].includes(order.status))
    throw new Error("This order can't be cancelled online. Contact us if production hasn't started.");
  if (order.createdById !== user.id && !can(role, "approve_orders")) throw new Error("Only the person who placed this order or an admin can cancel it.");
  await voidCheckout(order.id);
  await setStatus(order.id, "CANCELLED", "Cancelled by customer.", user.id);
  revalidatePath("/app", "layout");
  return "Order cancelled.";
});

/** Return a submitted-but-unpaid order to draft so it can be edited. */
export const editOrderAction = action(async (_prev: unknown, fd: FormData) => {
  const { org, user } = await requirePermission("build_orders");
  const order = await db.order.findFirst({ where: { id: str(fd, "orderId"), organizationId: org.id } });
  if (!order || !["PENDING_APPROVAL", "AWAITING_PAYMENT", "QUOTE_REVIEW"].includes(order.status)) throw new Error("This order can't be edited now.");
  await voidCheckout(order.id);
  // A confirmed quote only covers what was quoted; edits need fresh pricing.
  const hadQuotes = await db.orderLine.updateMany({ where: { orderId: order.id, quotedUnitCents: { not: null } }, data: { quotedUnitCents: null } });
  await db.order.update({ where: { id: order.id }, data: { status: "DRAFT", approvalRequestedAt: null, submittedAt: null } });
  await db.orderEvent.create({
    data: { orderId: order.id, type: "STATUS", message: hadQuotes.count ? "Reopened for editing. Custom-priced items will be re-quoted." : "Reopened for editing.", actorId: user.id },
  });
  redirect(`/app/orders/${order.id}`);
});
