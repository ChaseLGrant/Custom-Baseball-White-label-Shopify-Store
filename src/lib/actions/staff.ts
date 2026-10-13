"use server";
// Club Custom staff operations. These are the only manual steps in the
// workflow: verifying institutional paperwork, pricing quote-only items,
// uploading production proofs, and recording shipments not synced from Shopify.
import { revalidatePath } from "next/cache";
import { db } from "../server/db";
import { requireStaff } from "../server/auth";
import { DOCUMENT_TYPES, saveUpload } from "../server/storage";
import { addEvent, getOrder, priceFullOrder, proceedToPayment, setStatus, voidCheckout } from "../server/orders";
import { can, type Role } from "../domain";
import { action, optStr, str } from "./util";

export const verifyTaxExemption = action(async (_prev: unknown, fd: FormData) => {
  await requireStaff();
  const approve = str(fd, "decision") === "approve";
  const note = optStr(fd, "note");
  if (!approve && !note) throw new Error("Tell the customer why it wasn't accepted.");
  await db.organization.update({
    where: { id: str(fd, "orgId") },
    data: { taxExemptStatus: approve ? "VERIFIED" : "REJECTED", taxExemptNote: approve ? null : note },
  });
  revalidatePath("/staff", "layout");
  return approve ? "Tax exemption verified." : "Marked as not accepted.";
});

export const decideTerms = action(async (_prev: unknown, fd: FormData) => {
  await requireStaff();
  const approve = str(fd, "decision") === "approve";
  const days = Number(str(fd, "netDays") || "30");
  if (approve && ![15, 30, 45, 60].includes(days)) throw new Error("Choose Net 15, 30, 45 or 60.");
  await db.organization.update({
    where: { id: str(fd, "orgId") },
    data: { termsStatus: approve ? "APPROVED" : "REJECTED", termsNetDays: approve ? days : null },
  });
  revalidatePath("/staff", "layout");
  return approve ? `Approved for Net ${days}.` : "Terms declined.";
});

/** Set all-in per-piece prices for quote-required lines, then release the order for payment. */
export const releaseQuote = action(async (_prev: unknown, fd: FormData) => {
  const staff = await requireStaff();
  const order = await getOrder(str(fd, "orderId"));
  if (!order || order.status !== "QUOTE_REVIEW") throw new Error("Order isn't in pricing review.");
  for (const line of order.lines) {
    const raw = str(fd, `quote.${line.id}`);
    if (!raw) continue;
    const cents = Math.round(Number(raw) * 100);
    if (!Number.isFinite(cents) || cents <= 0) throw new Error("Enter prices as dollar amounts.");
    await db.orderLine.update({ where: { id: line.id }, data: { quotedUnitCents: cents } });
  }
  const refreshed = (await getOrder(order.id))!;
  const price = await priceFullOrder(refreshed);
  if (price.quoteReasons.length) throw new Error("Every quote-required line needs a price: " + price.quoteReasons.join(" "));

  await addEvent(order.id, "NOTE", `Pricing confirmed by ${staff.name}.`, staff.id, false);
  const creator = await db.user.findUnique({ where: { id: order.createdById }, include: { memberships: true } });
  const creatorRole = creator?.memberships.find((m) => m.organizationId === order.organizationId)?.role as Role | undefined;
  const org = order.organization;
  if (org.approvalThresholdCents != null && price.totalCents >= org.approvalThresholdCents && !can(creatorRole, "approve_orders")) {
    await db.order.update({ where: { id: order.id }, data: { approvalRequestedAt: new Date() } });
    await setStatus(order.id, "PENDING_APPROVAL", "Pricing confirmed. Waiting for approval from an organization admin or purchaser.", staff.id);
  } else {
    await proceedToPayment(order.id, creator?.email ?? "", staff.id);
  }
  revalidatePath("/staff", "layout");
  return "Pricing confirmed and sent to the customer.";
});

export const uploadProof = action(async (_prev: unknown, fd: FormData) => {
  const staff = await requireStaff();
  const order = await getOrder(str(fd, "orderId"));
  if (!order || !["PAID", "INVOICED", "PROOF_REVISION", "PROOF_READY"].includes(order.status)) throw new Error("This order isn't waiting on a proof.");
  const { url } = await saveUpload(order.organizationId, "proofs", fd.get("file") as File, DOCUMENT_TYPES, 25 * 1024 * 1024);
  // A new proof supersedes any still-pending one.
  await db.proof.updateMany({ where: { orderId: order.id, status: "PENDING" }, data: { status: "CHANGES_REQUESTED", customerNote: "Superseded by a newer proof" } });
  const version = (order.proofs[0]?.version ?? 0) + 1;
  await db.proof.create({ data: { orderId: order.id, version, fileUrl: url, staffNote: optStr(fd, "note") } });
  await setStatus(order.id, "PROOF_READY", `Proof v${version} is ready for your approval.`, staff.id);
  revalidatePath("/staff", "layout");
  return `Proof v${version} sent to the customer.`;
});

export const addShipment = action(async (_prev: unknown, fd: FormData) => {
  const staff = await requireStaff();
  const order = await getOrder(str(fd, "orderId"));
  if (!order || !["IN_PRODUCTION", "SHIPPED"].includes(order.status)) throw new Error("Order isn't ready to ship.");
  const trackingNumber = optStr(fd, "trackingNumber");
  if (!trackingNumber) throw new Error("Enter a tracking number.");
  const carrier = optStr(fd, "carrier");
  await db.shipment.create({ data: { orderId: order.id, carrier, trackingNumber, trackingUrl: trackingUrlFor(carrier, trackingNumber) } });
  if (order.status !== "SHIPPED") await setStatus(order.id, "SHIPPED", `Shipped via ${carrier ?? "carrier"} (${trackingNumber}).`, staff.id);
  else await addEvent(order.id, "SHIPMENT", `Another package shipped: ${trackingNumber}.`, staff.id);
  revalidatePath("/staff", "layout");
  return "Shipment recorded.";
});

export const staffSetStatus = action(async (_prev: unknown, fd: FormData) => {
  const staff = await requireStaff();
  const order = await getOrder(str(fd, "orderId"));
  if (!order) throw new Error("Order not found.");
  const to = str(fd, "status");
  const allowed: Record<string, string[]> = {
    DELIVERED: ["SHIPPED"],
    CANCELLED: ["PENDING_APPROVAL", "QUOTE_REVIEW", "AWAITING_PAYMENT", "PAID", "INVOICED", "PROOF_READY", "PROOF_REVISION"],
  };
  if (!allowed[to]?.includes(order.status)) throw new Error(`Can't move from ${order.status} to ${to}.`);
  if (to === "CANCELLED") await voidCheckout(order.id);
  await setStatus(order.id, to as "DELIVERED" | "CANCELLED", to === "DELIVERED" ? "Delivered." : `Cancelled by Club Custom.${optStr(fd, "note") ? " " + optStr(fd, "note") : ""}`, staff.id);
  revalidatePath("/staff", "layout");
  return "Updated.";
});

export const addInternalNote = action(async (_prev: unknown, fd: FormData) => {
  const staff = await requireStaff();
  const note = str(fd, "note");
  if (!note) throw new Error("Write a note.");
  await addEvent(str(fd, "orderId"), "NOTE", note, staff.id, fd.get("visible") === "on");
  revalidatePath("/staff", "layout");
  return "Note added.";
});

function trackingUrlFor(carrier: string | null, n: string) {
  const c = (carrier ?? "").toLowerCase();
  const q = encodeURIComponent(n);
  if (c.includes("ups")) return `https://www.ups.com/track?tracknum=${q}`;
  if (c.includes("fedex")) return `https://www.fedex.com/fedextrack/?trknbr=${q}`;
  if (c.includes("usps")) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${q}`;
  return null;
}
