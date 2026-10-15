"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { db } from "../server/db";
import { requirePermission } from "../server/auth";
import { DOCUMENT_TYPES, LOGO_TYPES, saveUpload } from "../server/storage";
import { parseRosterFile } from "../server/roster-file";
import { lineConfigSchema, ROLES, SPORTS } from "../domain";
import { getProduct } from "../catalog";
import { action, optStr, str } from "./util";

// ---------------------------------------------------------------------------
// Logos
// ---------------------------------------------------------------------------

export const uploadLogo = action(async (_prev: unknown, fd: FormData) => {
  const { org } = await requirePermission("manage_logos");
  const file = fd.get("file") as File;
  const { url, mimeType } = await saveUpload(org.id, "logos", file, LOGO_TYPES);
  const name = str(fd, "name") || file.name.replace(/\.[^.]+$/, "") || "Logo";
  await db.logo.create({ data: { organizationId: org.id, name, fileUrl: url, mimeType, isVector: mimeType === "image/svg+xml" } });
  revalidatePath("/app", "layout");
  return `"${name}" saved. It's now available on every order.`;
});

export async function archiveLogo(fd: FormData) {
  const { org } = await requirePermission("manage_logos");
  await db.logo.updateMany({ where: { id: str(fd, "logoId"), organizationId: org.id }, data: { archived: true } });
  revalidatePath("/app/logos");
}

// ---------------------------------------------------------------------------
// Teams & rosters
// ---------------------------------------------------------------------------

export const createTeam = action(async (_prev: unknown, fd: FormData) => {
  const { org } = await requirePermission("manage_teams");
  const name = str(fd, "name");
  const sport = str(fd, "sport");
  if (name.length < 2) throw new Error("Enter a team name, like “Varsity Baseball”.");
  if (!(sport in SPORTS)) throw new Error("Choose a sport.");
  const team = await db.team.create({ data: { organizationId: org.id, name, sport, level: optStr(fd, "level") } });
  const back = str(fd, "returnTo");
  redirect(back.startsWith("/app/") ? back : `/app/teams/${team.id}`);
});

export const updateTeam = action(async (_prev: unknown, fd: FormData) => {
  const { org } = await requirePermission("manage_teams");
  const name = str(fd, "name");
  if (name.length < 2) throw new Error("Enter a team name.");
  await db.team.updateMany({
    where: { id: str(fd, "teamId"), organizationId: org.id },
    data: { name, level: optStr(fd, "level"), sport: str(fd, "sport") },
  });
  revalidatePath("/app/teams");
  return "Team updated.";
});

async function ownedTeam(teamId: string) {
  const ctx = await requirePermission("manage_teams");
  const team = await db.team.findFirst({ where: { id: teamId, organizationId: ctx.org.id } });
  if (!team) throw new Error("Team not found.");
  return { ...ctx, team };
}

/** Import a roster spreadsheet, replacing (or appending to) the team roster. */
export const importRoster = action(async (_prev: unknown, fd: FormData) => {
  const { team } = await ownedTeam(str(fd, "teamId"));
  const result = await parseRosterFile(fd.get("file") as File);
  if (result.players.length === 0) throw new Error(result.problems.join(" ") || "No players found in that file.");
  const mode = str(fd, "mode") === "append" ? "append" : "replace";
  const startAt = mode === "append" ? await db.rosterPlayer.count({ where: { teamId: team.id } }) : 0;
  await db.$transaction([
    ...(mode === "replace" ? [db.rosterPlayer.deleteMany({ where: { teamId: team.id } })] : []),
    db.rosterPlayer.createMany({ data: result.players.map((p, i) => ({ ...p, teamId: team.id, sortOrder: startAt + i })) }),
  ]);
  revalidatePath("/app", "layout");
  const msg = `Imported ${result.players.length} players.`;
  return result.problems.length ? `${msg} Please check: ${result.problems.slice(0, 5).join(" ")}` : msg;
});

const SIZE_FIELDS = ["size", "topSize", "bottomSize", "hatSize"] as const;

/** Save the inline roster editor (all rows at once). */
export const saveRoster = action(async (_prev: unknown, fd: FormData) => {
  const { team } = await ownedTeam(str(fd, "teamId"));
  const rows: { name: string; number: string | null; size: string | null; topSize: string | null; bottomSize: string | null; hatSize: string | null }[] = [];
  const count = Number(fd.get("rowCount") ?? 0);
  for (let i = 0; i < Math.min(count, 1000); i++) {
    if (fd.get(`row${i}.delete`)) continue;
    const row = {
      name: str(fd, `row${i}.name`),
      number: optStr(fd, `row${i}.number`),
      ...Object.fromEntries(SIZE_FIELDS.map((f) => [f, optStr(fd, `row${i}.${f}`)?.toUpperCase() ?? null])),
    } as (typeof rows)[number];
    if (row.name || row.number || row.size) rows.push(row);
  }
  await db.$transaction([
    db.rosterPlayer.deleteMany({ where: { teamId: team.id } }),
    db.rosterPlayer.createMany({ data: rows.map((r, i) => ({ ...r, teamId: team.id, sortOrder: i })) }),
  ]);
  revalidatePath("/app", "layout");
  return `Roster saved (${rows.length} players).`;
});

// ---------------------------------------------------------------------------
// Saved designs
// ---------------------------------------------------------------------------

export async function saveDesign(input: { name: string; productId: string; teamId: string | null; config: unknown }) {
  const { org } = await requirePermission("build_orders");
  if (!getProduct(input.productId)) throw new Error("Unknown product.");
  const config = lineConfigSchema.parse(input.config);
  // Designs keep the look (color, logos, personalization) but not quantities.
  const look = { ...config, sizeRun: {}, extras: {} };
  const teamId = input.teamId && (await db.team.findFirst({ where: { id: input.teamId, organizationId: org.id } })) ? input.teamId : null;
  const d = await db.savedDesign.create({
    data: { organizationId: org.id, teamId, productId: input.productId, name: input.name.trim().slice(0, 80) || "Saved design", config: JSON.stringify(look) },
  });
  revalidatePath("/app", "layout");
  return { id: d.id, name: d.name };
}

export async function deleteDesign(fd: FormData) {
  const { org } = await requirePermission("build_orders");
  await db.savedDesign.deleteMany({ where: { id: str(fd, "designId"), organizationId: org.id } });
  revalidatePath("/app", "layout");
}

// ---------------------------------------------------------------------------
// Addresses
// ---------------------------------------------------------------------------

export const saveAddress = action(async (_prev: unknown, fd: FormData) => {
  const { org } = await requirePermission("manage_addresses");
  const data = {
    label: str(fd, "label") || "Main",
    attention: optStr(fd, "attention"),
    line1: str(fd, "line1"),
    line2: optStr(fd, "line2"),
    city: str(fd, "city"),
    state: str(fd, "state").toUpperCase().slice(0, 2),
    postalCode: str(fd, "postalCode"),
    phone: optStr(fd, "phone"),
  };
  if (!data.line1 || !data.city || data.state.length !== 2 || !/^\d{5}(-\d{4})?$/.test(data.postalCode))
    throw new Error("Enter a complete US address (street, city, 2-letter state, ZIP).");
  const count = await db.address.count({ where: { organizationId: org.id } });
  await db.address.create({ data: { ...data, organizationId: org.id, isDefault: count === 0 } });
  revalidatePath("/app", "layout");
  return "Address saved.";
});

export async function deleteAddress(fd: FormData) {
  const { org } = await requirePermission("manage_addresses");
  await db.address.deleteMany({ where: { id: str(fd, "addressId"), organizationId: org.id } });
  revalidatePath("/app/settings");
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export const inviteMember = action(async (_prev: unknown, fd: FormData) => {
  const { org } = await requirePermission("manage_members");
  const email = str(fd, "email").toLowerCase();
  const role = str(fd, "role");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Enter a valid email.");
  if (!(role in ROLES) || role === "OWNER") throw new Error("Choose a role.");
  const existing = await db.membership.findFirst({ where: { organizationId: org.id, user: { email } } });
  if (existing) throw new Error("That person is already a member.");
  const invite = await db.invite.create({ data: { organizationId: org.id, email, role, token: randomBytes(24).toString("base64url") } });
  revalidatePath("/app/settings");
  const link = `${process.env.APP_URL ?? ""}/invite/${invite.token}`;
  return `Invite created. Send this link to ${email}: ${link}`;
});

export async function removeMember(fd: FormData) {
  const { org, user } = await requirePermission("manage_members");
  const m = await db.membership.findFirst({ where: { id: str(fd, "membershipId"), organizationId: org.id } });
  if (!m || m.role === "OWNER" || m.userId === user.id) return;
  await db.membership.delete({ where: { id: m.id } });
  revalidatePath("/app/settings");
}

export async function changeMemberRole(fd: FormData) {
  const { org } = await requirePermission("manage_members");
  const role = str(fd, "role");
  if (!(role in ROLES) || role === "OWNER") return;
  await db.membership.updateMany({ where: { id: str(fd, "membershipId"), organizationId: org.id, NOT: { role: "OWNER" } }, data: { role } });
  revalidatePath("/app/settings");
}

export async function revokeInvite(fd: FormData) {
  const { org } = await requirePermission("manage_members");
  await db.invite.deleteMany({ where: { id: str(fd, "inviteId"), organizationId: org.id, acceptedAt: null } });
  revalidatePath("/app/settings");
}

// ---------------------------------------------------------------------------
// Purchasing: tax exemption, invoice terms, internal approvals
// ---------------------------------------------------------------------------

export const submitTaxExemption = action(async (_prev: unknown, fd: FormData) => {
  const { org } = await requirePermission("manage_purchasing");
  const { url } = await saveUpload(org.id, "certificates", fd.get("file") as File, DOCUMENT_TYPES);
  await db.organization.update({
    where: { id: org.id },
    data: { taxExemptStatus: "PENDING", taxExemptCertificate: url, taxExemptNote: null },
  });
  revalidatePath("/app/settings");
  return "Certificate received. We'll verify it (usually within one business day). Until then, orders include sales tax.";
});

export const applyForTerms = action(async (_prev: unknown, fd: FormData) => {
  const { org } = await requirePermission("manage_purchasing");
  const note = str(fd, "note");
  if (note.length < 10) throw new Error("Tell us your billing contact and accounts payable details.");
  await db.organization.update({ where: { id: org.id }, data: { termsStatus: "PENDING", termsApplicationNote: note } });
  revalidatePath("/app/settings");
  return "Application submitted. You can keep ordering with a card while we review it.";
});

export const saveApprovalRule = action(async (_prev: unknown, fd: FormData) => {
  const { org } = await requirePermission("manage_purchasing");
  const enabled = fd.get("enabled") === "on";
  const dollars = Number(str(fd, "threshold") || "0");
  if (enabled && (!Number.isFinite(dollars) || dollars < 0)) throw new Error("Enter a dollar amount.");
  await db.organization.update({
    where: { id: org.id },
    data: { approvalThresholdCents: enabled ? Math.round(dollars * 100) : null },
  });
  revalidatePath("/app/settings");
  return enabled ? "Coaches' orders at or above this amount will need approval." : "Order approvals turned off.";
});

export const updateOrganization = action(async (_prev: unknown, fd: FormData) => {
  const { org } = await requirePermission("manage_purchasing");
  const name = str(fd, "name");
  if (name.length < 2) throw new Error("Enter a name.");
  await db.organization.update({ where: { id: org.id }, data: { name } });
  revalidatePath("/app", "layout");
  return "Saved.";
});


/** Turn a team's public size-collection link on, off, or replace it with a new one. */
export async function setSizeLink(fd: FormData) {
  const { team } = await ownedTeam(str(fd, "teamId"));
  const mode = str(fd, "mode");
  const sizeLinkToken = mode === "off" ? null : randomBytes(9).toString("base64url");
  await db.team.update({ where: { id: team.id }, data: { sizeLinkToken } });
  revalidatePath(`/app/teams/${team.id}`);
}
