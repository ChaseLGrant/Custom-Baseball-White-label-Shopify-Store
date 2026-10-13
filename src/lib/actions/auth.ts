"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "../server/db";
import { createSession, destroySession, hashPassword, requireUser, setActiveOrg, verifyPassword } from "../server/auth";
import { ORG_TYPES } from "../domain";
import { action, str } from "./util";

const signupSchema = z.object({
  name: z.string().min(2, "Enter your name."),
  email: z.string().email("Enter a valid email."),
  password: z.string().min(8, "Use at least 8 characters for your password."),
  orgName: z.string().min(2, "Enter your school or organization name."),
  orgType: z.enum(Object.keys(ORG_TYPES) as [keyof typeof ORG_TYPES]),
});

export const signup = action(async (_prev: unknown, fd: FormData) => {
  const parsed = signupSchema.safeParse({
    name: str(fd, "name"),
    email: str(fd, "email").toLowerCase(),
    password: String(fd.get("password") ?? ""),
    orgName: str(fd, "orgName"),
    orgType: str(fd, "orgType"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const d = parsed.data;
  if (await db.user.findUnique({ where: { email: d.email } })) throw new Error("An account with that email already exists. Sign in instead.");
  const user = await db.user.create({
    data: {
      name: d.name,
      email: d.email,
      passwordHash: await hashPassword(d.password),
      memberships: { create: { role: "OWNER", organization: { create: { name: d.orgName, type: d.orgType } } } },
    },
    include: { memberships: true },
  });
  await createSession(user.id);
  await setActiveOrg(user.memberships[0].organizationId);
  redirect("/app?welcome=1");
});

export const login = action(async (_prev: unknown, fd: FormData) => {
  const email = str(fd, "email").toLowerCase();
  const user = await db.user.findUnique({ where: { email }, include: { memberships: true } });
  if (!user || !(await verifyPassword(String(fd.get("password") ?? ""), user.passwordHash)))
    throw new Error("That email and password don't match.");
  await createSession(user.id);
  const next = str(fd, "next");
  redirect(/^\/(?![\/\\])/.test(next) ? next : user.memberships.length ? "/app" : user.isStaff ? "/staff" : "/signup/organization");
});

export async function logout() {
  await destroySession();
  redirect("/");
}

export const createOrganization = action(async (_prev: unknown, fd: FormData) => {
  const user = await requireUser();
  const name = str(fd, "orgName");
  const type = str(fd, "orgType");
  if (name.length < 2) throw new Error("Enter your organization name.");
  if (!(type in ORG_TYPES)) throw new Error("Choose an organization type.");
  const m = await db.membership.create({ data: { user: { connect: { id: user.id } }, role: "OWNER", organization: { create: { name, type } } } });
  await setActiveOrg(m.organizationId);
  redirect("/app?welcome=1");
});

export async function switchOrganization(fd: FormData) {
  const user = await requireUser();
  const orgId = str(fd, "orgId");
  if (user.memberships.some((m) => m.organizationId === orgId)) await setActiveOrg(orgId);
  redirect("/app");
}

export const acceptInvite = action(async (_prev: unknown, fd: FormData) => {
  const token = str(fd, "token");
  const invite = await db.invite.findUnique({ where: { token } });
  if (!invite || invite.acceptedAt) throw new Error("This invite link is no longer valid.");
  let user = await db.user.findUnique({ where: { email: invite.email } });
  if (user) {
    if (!(await verifyPassword(String(fd.get("password") ?? ""), user.passwordHash))) throw new Error("Incorrect password for this account.");
  } else {
    const name = str(fd, "name");
    const password = String(fd.get("password") ?? "");
    if (name.length < 2) throw new Error("Enter your name.");
    if (password.length < 8) throw new Error("Use at least 8 characters for your password.");
    user = await db.user.create({ data: { name, email: invite.email, passwordHash: await hashPassword(password) } });
  }
  await db.membership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: invite.organizationId } },
    create: { userId: user.id, organizationId: invite.organizationId, role: invite.role },
    update: {},
  });
  await db.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
  await createSession(user.id);
  await setActiveOrg(invite.organizationId);
  redirect("/app");
});
