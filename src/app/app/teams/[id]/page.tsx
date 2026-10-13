import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { ActionForm } from "@/components/ActionForm";
import { Card, CardHeader, Field, PageHeader } from "@/components/ui";
import { RosterImport } from "@/components/RosterImport";
import { RosterEditor } from "@/components/RosterEditor";
import { updateTeam } from "@/lib/actions/org";
import { SPORTS, can, type Sport } from "@/lib/domain";

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org, role } = await requireOrg();
  const team = await db.team.findFirst({
    where: { id, organizationId: org.id },
    include: { roster: { orderBy: { sortOrder: "asc" } } },
  });
  if (!team) notFound();
  const canEdit = can(role, "manage_teams");
  return (
    <>
      <PageHeader
        back={{ href: "/app/teams", label: "Teams" }}
        title={team.name}
        description={`${SPORTS[team.sport as Sport] ?? team.sport}${team.level ? ` · ${team.level}` : ""} · ${team.roster.length} players`}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Roster" description="Names, numbers and sizes used for personalization and sizing on every order. Edit directly or import a spreadsheet." />
            <RosterEditor
              // Remount when the saved roster changes (e.g. after an import) so edits start fresh.
              key={team.roster.map((p) => p.id).join(",")}
              teamId={team.id}
              canEdit={canEdit}
              players={team.roster.map((p) => ({ name: p.name, number: p.number, size: p.size, topSize: p.topSize, bottomSize: p.bottomSize, hatSize: p.hatSize }))}
            />
          </Card>
        </div>
        <div className="space-y-6">
          {canEdit && (
            <Card>
              <CardHeader title="Import roster from a spreadsheet" />
              <div className="p-5"><RosterImport teamId={team.id} hasRoster={team.roster.length > 0} /></div>
            </Card>
          )}
          {canEdit && (
            <Card>
              <CardHeader title="Team details" />
              <div className="p-5">
                <ActionForm action={updateTeam} submitLabel="Save" submitVariant="secondary">
                  <input type="hidden" name="teamId" value={team.id} />
                  <Field label="Name" htmlFor="tname"><input id="tname" name="name" defaultValue={team.name} /></Field>
                  <Field label="Sport" htmlFor="tsport">
                    <select id="tsport" name="sport" defaultValue={team.sport}>
                      {Object.entries(SPORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="Level" htmlFor="tlevel"><input id="tlevel" name="level" defaultValue={team.level ?? ""} /></Field>
                </ActionForm>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
