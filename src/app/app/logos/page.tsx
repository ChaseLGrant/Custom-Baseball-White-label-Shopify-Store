import { requireOrg } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { ActionForm } from "@/components/ActionForm";
import { Badge, Card, CardHeader, EmptyState, Field, PageHeader } from "@/components/ui";
import { archiveLogo, uploadLogo } from "@/lib/actions/org";
import { CATALOG } from "@/lib/catalog";
import { can, parseJsonArray } from "@/lib/domain";

export const metadata = { title: "Logos" };

export default async function LogosPage() {
  const { org, role } = await requireOrg();
  const logos = await db.logo.findMany({ where: { organizationId: org.id, archived: false }, orderBy: { createdAt: "asc" } });
  const canEdit = can(role, "manage_logos");
  return (
    <>
      <PageHeader title="Logos" description="Upload each logo once. It's saved to your organization and available on every order, for every team, every season." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {logos.length === 0 ? (
            <EmptyState title="No logos yet" description="Upload your primary logo to start customizing products." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {logos.map((l) => {
                const setups = parseJsonArray(l.setupsPaid);
                return (
                  <Card key={l.id} className="p-4">
                    <div className="grid h-36 place-items-center rounded-lg bg-[conic-gradient(#f1f5f9_25%,#fff_0_50%,#f1f5f9_0_75%,#fff_0)] bg-[length:16px_16px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={l.fileUrl} alt={l.name} className="max-h-32 max-w-[90%] object-contain" />
                    </div>
                    <p className="mt-3 font-semibold">{l.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge tone={l.isVector ? "green" : "gray"}>{l.isVector ? "Vector" : l.mimeType === "image/png" ? "PNG" : "JPG"}</Badge>
                      {setups.map((s) => (
                        <Badge key={s} tone="blue">{CATALOG.decorationMethods[s as keyof typeof CATALOG.decorationMethods]?.label ?? s} setup on file</Badge>
                      ))}
                    </div>
                    {canEdit && (
                      <form action={archiveLogo} className="mt-2">
                        <input type="hidden" name="logoId" value={l.id} />
                        <button className="text-xs text-slate-500 hover:text-red-600">Remove</button>
                      </form>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
        {canEdit && (
          <Card>
            <CardHeader title="Upload a logo" />
            <div className="p-5">
              <ActionForm action={uploadLogo} submitLabel="Upload logo" resetOnSuccess>
                <Field label="Logo file" htmlFor="file" hint="SVG (best), PNG with transparent background, or JPG. Max 10 MB.">
                  <input id="file" name="file" type="file" accept=".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg" required />
                </Field>
                <Field label="Name" htmlFor="name" hint="e.g. Primary 'L', Script wordmark, Mascot"><input id="name" name="name" /></Field>
              </ActionForm>
              <p className="mt-4 text-xs text-slate-500">
                Don&apos;t worry about perfect files — our art team prepares production-ready artwork and you approve a proof before anything is made.
              </p>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
