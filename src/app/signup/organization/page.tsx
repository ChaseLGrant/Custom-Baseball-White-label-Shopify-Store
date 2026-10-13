import { AuthShell } from "@/components/AuthShell";
import { ActionForm } from "@/components/ActionForm";
import { Field } from "@/components/ui";
import { createOrganization } from "@/lib/actions/auth";
import { ORG_TYPES } from "@/lib/domain";
import { requireUser } from "@/lib/server/auth";

export default async function CreateOrgPage() {
  await requireUser();
  return (
    <AuthShell title="Set up your organization" subtitle="Your logos, teams, rosters and orders live here.">
      <ActionForm action={createOrganization} submitLabel="Continue">
        <Field label="School or organization" htmlFor="orgName"><input id="orgName" name="orgName" required /></Field>
        <Field label="Organization type" htmlFor="orgType">
          <select id="orgType" name="orgType" defaultValue="HIGH_SCHOOL">
            {Object.entries(ORG_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
      </ActionForm>
    </AuthShell>
  );
}
