import { AuthShell } from "@/components/AuthShell";
import { ActionForm } from "@/components/ActionForm";
import { Field, Notice } from "@/components/ui";
import { acceptInvite } from "@/lib/actions/auth";
import { ROLES, type Role } from "@/lib/domain";
import { db } from "@/lib/server/db";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await db.invite.findUnique({ where: { token }, include: { organization: true } });
  if (!invite || invite.acceptedAt)
    return <AuthShell title="Invite not found"><Notice tone="amber">This invite has expired or was already used. Ask your admin to send a new one.</Notice></AuthShell>;
  const existing = await db.user.findUnique({ where: { email: invite.email } });
  return (
    <AuthShell title={`Join ${invite.organization.name}`} subtitle={<>You&apos;ve been invited as <strong>{ROLES[invite.role as Role]}</strong> ({invite.email}).</>}>
      <ActionForm action={acceptInvite} submitLabel="Accept invite">
        <input type="hidden" name="token" value={token} />
        {!existing && <Field label="Your name" htmlFor="name"><input id="name" name="name" required /></Field>}
        <Field label={existing ? "Your password" : "Choose a password"} htmlFor="password">
          <input id="password" name="password" type="password" minLength={8} required />
        </Field>
      </ActionForm>
    </AuthShell>
  );
}
