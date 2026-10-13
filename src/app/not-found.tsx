import { AuthShell } from "@/components/AuthShell";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <AuthShell title="Page not found" subtitle="That page doesn't exist or you don't have access to it.">
      <ButtonLink href="/">Go home</ButtonLink>
    </AuthShell>
  );
}
