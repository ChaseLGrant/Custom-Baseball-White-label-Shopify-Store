import Link from "next/link";
import { requireOrg } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { ActionForm } from "@/components/ActionForm";
import { Card, CardHeader, EmptyState, Field, PageHeader } from "@/components/ui";
import { createTeam } from "@/lib/actions/org";
import { SPORTS, can, type Sport } from "@/lib/domain";

export const metadata = { title: "Teams & rosters" };

export default async function TeamsPage() {
  const { org, role } = await requireOrg();
  const teams = await db.team.findMany({
    where: { organizationId: org.id, archived: false },
    include: { _count: { select: { roster: true } } },
    orderBy: [{ sport: "asc" }, { name: "asc" }],
  });
  return (
    <>
      <PageHeader title="Teams & rosters" description="Each team keeps its roster, so you import it once and every order picks up names, numbers and sizes automatically." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {teams.length === 0 ? (
            <EmptyState title="No teams yet" description="Add your first team — Varsity Baseball, 14U Softball, etc." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {teams.map((t) => (
                <Link key={t.id} href={`/app/teams/${t.id}`}>
                  <Card className="p-4 transition hover:border-brand-600">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{SPORTS[t.sport as Sport] ?? t.sport}{t.level ? ` · ${t.level}` : ""}</p>
                    <p className="mt-1 text-lg font-semibold">{t.name}</p>
                    <p className={`mt-1 text-sm ${t._count.roster ? "text-slate-600" : "font-medium text-amber-700"}`}>
                      {t._count.roster ? `${t._count.roster} players on roster` : "No roster yet — import one"}
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
        {can(role, "manage_teams") && (
          <Card>
            <CardHeader title="Add a team" />
            <div className="p-5">
              <ActionForm action={createTeam} submitLabel="Add team">
                <Field label="Team name" htmlFor="name"><input id="name" name="name" placeholder="Varsity Baseball" required /></Field>
                <Field label="Sport" htmlFor="sport">
                  <select id="sport" name="sport" defaultValue="BASEBALL">
                    {Object.entries(SPORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Level (optional)" htmlFor="level"><input id="level" name="level" placeholder="Varsity, JV, 14U…" /></Field>
              </ActionForm>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
