import { db } from "@/lib/server/db";
import { ActionForm } from "@/components/ActionForm";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { decideTerms, verifyTaxExemption } from "@/lib/actions/staff";
import { ORG_TYPES, type OrgType } from "@/lib/domain";

export const metadata = { title: "Verifications" };

export default async function VerificationsPage() {
  const [tax, terms] = await Promise.all([
    db.organization.findMany({ where: { taxExemptStatus: "PENDING" } }),
    db.organization.findMany({ where: { termsStatus: "PENDING" } }),
  ]);
  return (
    <>
      <PageHeader title="Verifications" description="Institutional purchasing requires a human check. Approve once; the organization is set for every future order." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={`Tax-exemption certificates (${tax.length})`} description="Check the certificate is valid for your state(s), current, and in the organization's legal name." />
          <div className="space-y-4 p-5">
            {tax.length === 0 && <EmptyState title="All caught up" />}
            {tax.map((o) => (
              <div key={o.id} className="rounded-lg border border-slate-200 p-4">
                <p className="font-semibold">{o.name} <span className="text-sm font-normal text-slate-500">· {ORG_TYPES[o.type as OrgType]}</span></p>
                {o.taxExemptCertificate && <a href={o.taxExemptCertificate} target="_blank" rel="noreferrer" className="text-sm text-brand-600 underline">View certificate</a>}
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <ActionForm action={verifyTaxExemption} submitLabel="Verify">
                    <input type="hidden" name="orgId" value={o.id} /><input type="hidden" name="decision" value="approve" />
                  </ActionForm>
                  <ActionForm action={verifyTaxExemption} submitLabel="Reject" submitVariant="danger">
                    <input type="hidden" name="orgId" value={o.id} /><input type="hidden" name="decision" value="reject" />
                    <input name="note" placeholder="Reason shown to customer" />
                  </ActionForm>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title={`Invoice terms applications (${terms.length})`} description="Confirm the institution and AP contact before extending credit." />
          <div className="space-y-4 p-5">
            {terms.length === 0 && <EmptyState title="All caught up" />}
            {terms.map((o) => (
              <div key={o.id} className="rounded-lg border border-slate-200 p-4">
                <p className="font-semibold">{o.name} <span className="text-sm font-normal text-slate-500">· {ORG_TYPES[o.type as OrgType]}</span></p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{o.termsApplicationNote}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <ActionForm action={decideTerms} submitLabel="Approve">
                    <input type="hidden" name="orgId" value={o.id} /><input type="hidden" name="decision" value="approve" />
                    <select name="netDays" defaultValue="30" aria-label="Terms"><option value="15">Net 15</option><option value="30">Net 30</option><option value="45">Net 45</option><option value="60">Net 60</option></select>
                  </ActionForm>
                  <ActionForm action={decideTerms} submitLabel="Decline" submitVariant="danger">
                    <input type="hidden" name="orgId" value={o.id} /><input type="hidden" name="decision" value="reject" />
                  </ActionForm>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
