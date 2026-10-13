import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { ActionForm } from "@/components/ActionForm";
import { Field } from "@/components/ui";
import { login } from "@/lib/actions/auth";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthShell title="Sign in" footer={<>New to Club Custom? <Link className="font-semibold text-brand-600" href="/signup">Create a free account</Link></>}>
      <ActionForm action={login} submitLabel="Sign in">
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label="Email" htmlFor="email"><input id="email" name="email" type="email" autoComplete="email" required /></Field>
        <Field label="Password" htmlFor="password"><input id="password" name="password" type="password" autoComplete="current-password" required /></Field>
      </ActionForm>
    </AuthShell>
  );
}
