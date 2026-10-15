"use server";
// The one-screen order: logo + roster + products -> pay. Creates the account,
// logo, team, roster and order in one step so a coach never has to visit
// another page for their first order.
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "../server/db";
import { createSession, getCurrentUser, hashPassword, setActiveOrg } from "../server/auth";
import { LOGO_TYPES, saveUpload } from "../server/storage";
import { parseRosterFile } from "../server/roster-file";
import { createDraft, reorder, submitOrder } from "../server/orders";
import { getProduct } from "../catalog";
import { can, ORG_TYPES, SPORTS, type Role } from "../domain";
import { quickLineConfig } from "../quick-config";
import { action, str } from "./util";
import { normalizeSize, type RosterRow } from "../roster";

/** Parse a dropped roster file so the page can show sizes and price instantly. Saves nothing. */
export async function previewRoster(fd: FormData): Promise<{ players: RosterRow[]; problems: string[] }> {
  const r = await parseRosterFile(fd.get("file") as File);
  return { players: r.players, problems: r.problems };
}

const accountSchema = z.object({
  name: z.string().min(2, "Enter your name."),
  email: z.string().email("Enter a valid email."),
  password: z.string().min(8, "Choose a password with at least 8 characters."),
  orgName: z.string().min(2, "Enter your school or organization."),
});

const quickSchema = z.object({
  productIds: z.array(z.string()).min(1, "Pick at least one product."),
  color: z.string(),
  personalize: z.boolean(),
  existingLogoId: z.string().nullable(),
  existingTeamId: z.string().nullable(),
  teamName: z.string().max(80),
  sport: z.string(),
  sizeRun: z.record(z.string(), z.number().int().min(0)),
  teamQty: z.record(z.string(), z.number().int().min(0).max(5000)).default({}),
  // Roster typed in on the page (instead of a spreadsheet).
  manualRoster: z
    .array(z.object({ name: z.string().max(80), number: z.string().max(3).nullable(), size: z.string().max(10).nullable() }))
    .max(1000)
    .nullable()
    .default(null),
});

export const placeQuickOrder = action(async (_prev: unknown, fd: FormData) => {
  const input = quickSchema.parse(JSON.parse(str(fd, "payload")));
  const products = input.productIds.map((id) => getProduct(id)).filter((p) => p && p.pricing.status === "VERIFIED");
  if (products.length === 0) throw new Error("Pick at least one product.");

  const logoFile = fd.get("logo") as File | null;
  const rosterFile = fd.get("roster") as File | null;
  const hasLogoFile = !!logoFile && logoFile.size > 0;
  const hasRosterFile = !!rosterFile && rosterFile.size > 0;

  // Validate everything that can fail before creating anything.
  const roster = input.manualRoster?.length
    ? { players: input.manualRoster.map(typedPlayer), problems: [] as string[] }
    : hasRosterFile
      ? await parseRosterFile(rosterFile!)
      : null;
  if (roster && roster.players.length === 0) throw new Error(roster.problems.join(" ") || "We couldn't find any players in that file.");

  // --- Account (new coaches sign up right here) ---
  const current = await getCurrentUser();
  let userId: string, email: string, orgId: string, role: Role;
  if (current) {
    const m = current.memberships.find((x) => x.organizationId === str(fd, "orgId")) ?? current.memberships[0];
    if (!m) throw new Error("Create an organization first.");
    if (!can(m.role, "build_orders")) throw new Error("You don't have permission to place orders.");
    [userId, email, orgId, role] = [current.id, current.email, m.organizationId, m.role as Role];
  } else {
    const acct = accountSchema.safeParse({
      name: str(fd, "name"),
      email: str(fd, "email").toLowerCase(),
      password: String(fd.get("password") ?? ""),
      orgName: str(fd, "orgName"),
    });
    if (!acct.success) throw new Error(acct.error.issues[0].message);
    if (await db.user.findUnique({ where: { email: acct.data.email } }))
      throw new Error("You already have an account with that email. Sign in first, and your logo and roster will be filled in for you.");
    const orgType = str(fd, "orgType");
    const created = await db.user.create({
      data: {
        name: acct.data.name,
        email: acct.data.email,
        passwordHash: await hashPassword(acct.data.password),
        memberships: {
          create: { role: "OWNER", organization: { create: { name: acct.data.orgName, type: orgType in ORG_TYPES ? orgType : "OTHER" } } },
        },
      },
      include: { memberships: true },
    });
    await createSession(created.id);
    await setActiveOrg(created.memberships[0].organizationId);
    [userId, email, orgId, role] = [created.id, created.email, created.memberships[0].organizationId, "OWNER"];
  }

  // Name things after the team, or the school when no team name was given.
  const displayName = input.teamName.trim() || (await db.organization.findUnique({ where: { id: orgId } }))!.name;

  // --- Logo ---
  let logoId: string | null = null;
  if (hasLogoFile) {
    const { url, mimeType } = await saveUpload(orgId, "logos", logoFile!, LOGO_TYPES);
    const name = logoFile!.name.replace(/\.[^.]+$/, "").slice(0, 60) || "Logo";
    logoId = (await db.logo.create({ data: { organizationId: orgId, name, fileUrl: url, mimeType, isVector: mimeType === "image/svg+xml" } })).id;
  } else if (input.existingLogoId) {
    logoId = (await db.logo.findFirst({ where: { id: input.existingLogoId, organizationId: orgId } }))?.id ?? null;
  }

  // --- Team + roster ---
  let teamId: string | null = null;
  if (input.existingTeamId) teamId = (await db.team.findFirst({ where: { id: input.existingTeamId, organizationId: orgId } }))?.id ?? null;
  if (roster) {
    if (!teamId) {
      const name = displayName;
      teamId = (await db.team.create({ data: { organizationId: orgId, name, sport: input.sport in SPORTS ? input.sport : "BASEBALL" } })).id;
    }
    await db.$transaction([
      db.rosterPlayer.deleteMany({ where: { teamId } }),
      db.rosterPlayer.createMany({ data: roster.players.map((p, i) => ({ ...p, teamId: teamId!, sortOrder: i })) }),
    ]);
  }
  const rosterCount = teamId ? (roster ? roster.players.length : await db.rosterPlayer.count({ where: { teamId } })) : 0;
  const useRoster = rosterCount > 0;
  const sizeRunTotal = Object.values(input.sizeRun).reduce((a, b) => a + b, 0);
  const needsPlayers = products.some((p) => p!.orderUnit === "player");
  if (needsPlayers && !useRoster && sizeRunTotal === 0) throw new Error("Drop in your roster, or enter how many of each size you need.");

  // --- Order ---
  const order = await createDraft(orgId, userId, `${displayName} ${new Date().getFullYear()} uniforms`);
  await db.orderLine.createMany({
    data: products.map((p, i) => ({
      orderId: order.id,
      productId: p!.id,
      teamId: useRoster ? teamId : null,
      sortOrder: i,
      config: JSON.stringify(
        quickLineConfig(p!, {
          color: input.color,
          logoId,
          rosterCount: useRoster ? rosterCount : 0,
          personalize: input.personalize,
          sizeRun: input.sizeRun,
          teamQty: input.teamQty[p!.id],
        }),
      ),
    })),
  });

  // Straight to payment. If anything needs attention, open the full editor instead.
  let result;
  try {
    result = await submitOrder(order.id, { userId, role, organizationId: orgId }, {
      paymentMethod: "CARD",
      poNumber: null,
      shippingAddressId: null,
      notes: null,
      contactEmail: email,
    });
  } catch (e) {
    await db.orderEvent.create({ data: { orderId: order.id, type: "NOTE", message: `Needs attention before payment: ${(e as Error).message}`, visible: true } });
    redirect(`/app/orders/${order.id}?fix=1`);
  }
  if (result.status === "AWAITING_PAYMENT") redirect(result.checkoutUrl);
  redirect(`/app/orders/${order.id}?submitted=1`);
});

function typedPlayer(p: { name: string; number: string | null; size: string | null }): RosterRow {
  const number = p.number?.replace(/[^0-9]/g, "").slice(0, 3) || null;
  return { name: p.name.trim().slice(0, 80), number, size: normalizeSize(p.size), topSize: null, bottomSize: null, hatSize: null };
}

/** Two-click reorder: copy last order with today's prices and current roster, then go straight to payment. */
export async function reorderAndPay(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const source = await db.order.findFirst({
    where: { id: str(fd, "orderId"), organizationId: { in: user.memberships.map((m) => m.organizationId) } },
  });
  if (!source) redirect("/app/orders");
  const m = user.memberships.find((x) => x.organizationId === source.organizationId)!;
  if (!can(m.role, "build_orders")) redirect(`/app/orders/${source.id}`);

  const draft = await reorder(source.id, source.organizationId, user.id);
  // Invoice orders need a new PO number, so they stop at the checkout page.
  if (source.paymentMethod === "INVOICE") redirect(`/app/orders/${draft.id}/checkout`);
  let result;
  try {
    result = await submitOrder(draft.id, { userId: user.id, role: m.role as Role, organizationId: source.organizationId }, {
      paymentMethod: "CARD",
      poNumber: null,
      shippingAddressId: source.shippingAddressId,
      notes: null,
      contactEmail: user.email,
    });
  } catch {
    redirect(`/app/orders/${draft.id}?fix=1`);
  }
  if (result.status === "AWAITING_PAYMENT") redirect(result.checkoutUrl);
  redirect(`/app/orders/${draft.id}?submitted=1`);
}
