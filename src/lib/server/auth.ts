// Email + password accounts with database sessions. The cookie holds a random
// token; only its SHA-256 hash is stored, so a database leak can't be replayed.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { can, type Action, type Role } from "../domain";

const SESSION_COOKIE = "cc_session";
const ORG_COOKIE = "cc_org";
const SESSION_DAYS = 30;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const hashPassword = (password: string) => bcrypt.hash(password, 10);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db.session.create({ data: { id: hashToken(token), userId, expiresAt } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
  jar.delete(ORG_COOKIE);
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: { include: { memberships: { include: { organization: true } } } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}
export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireStaff() {
  const user = await requireUser();
  if (!user.isStaff) redirect("/app");
  return user;
}

/** The signed-in user plus their active organization and role. */
export async function requireOrg() {
  const user = await requireUser();
  if (user.memberships.length === 0) redirect(user.isStaff ? "/staff" : "/signup/organization");
  const activeId = (await cookies()).get(ORG_COOKIE)?.value;
  const membership = user.memberships.find((m) => m.organizationId === activeId) ?? user.memberships[0];
  return { user, membership, org: membership.organization, role: membership.role as Role };
}
export type OrgContext = Awaited<ReturnType<typeof requireOrg>>;

export async function setActiveOrg(orgId: string) {
  (await cookies()).set(ORG_COOKIE, orgId, { httpOnly: true, sameSite: "lax", path: "/" });
}

/** Throws (rather than redirects) so server actions surface a clear message. */
export async function requirePermission(action: Action) {
  const ctx = await requireOrg();
  if (!can(ctx.role, action)) throw new Error("You don't have permission to do that. Ask an admin in your organization.");
  return ctx;
}
