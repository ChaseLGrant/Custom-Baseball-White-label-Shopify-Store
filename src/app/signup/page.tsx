import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { ActionForm } from "@/components/ActionForm";
import { Field } from "@/components/ui";
import { signup } from "@/lib/actions/auth";
import { ORG_TYPES } from "@/lib/domain";

export const metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your free account"
      subtitle="Takes 30 seconds. You'll set up your logo, teams and first order next."
      footer={<>Already have an account? <Link className="font-semibold text-brand-600" href="/login">Sign in</Link></>}
    >
      <ActionForm action={signup} submitLabel="Create account" submitVariant="accent">
        <Field label="Your name" htmlFor="name"><input id="name" name="name" autoComplete="name" required /></Field>
        <Field label="Work email" htmlFor="email"><input id="email" name="email" type="email" autoComplete="email" required /></Field>
        <Field label="Password" htmlFor="password" hint="At least 8 characters."><input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /></Field>
        <Field label="School or organization" htmlFor="orgName"><input id="orgName" name="orgName" placeholder="Lincoln High School Athletics" required /></Field>
        <Field label="Organization type" htmlFor="orgType">
          <select id="orgType" name="orgType" defaultValue="HIGH_SCHOOL">
            {Object.entries(ORG_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
      </ActionForm>
    </AuthShell>
  );
}
