import { requireOrg } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { ActionForm } from "@/components/ActionForm";
import { AddressForm } from "@/components/AddressForm";
import { Badge, Card, CardHeader, Field, Notice, PageHeader } from "@/components/ui";
import {
  applyForTerms, changeMemberRole, deleteAddress, inviteMember, removeMember, revokeInvite,
  saveApprovalRule, submitTaxExemption, updateOrganization,
} from "@/lib/actions/org";
import { ROLES, ROLE_DESCRIPTIONS, can, formatMoney, type Role } from "@/lib/domain";

export const metadata = { title: "Organization" };

export default async function SettingsPage() {
  const { org, role, user } = await requireOrg();
  const [members, invites, addresses] = await Promise.all([
    db.membership.findMany({ where: { organizationId: org.id }, include: { user: true }, orderBy: { createdAt: "asc" } }),
    db.invite.findMany({ where: { organizationId: org.id, acceptedAt: null } }),
    db.address.findMany({ where: { organizationId: org.id }, orderBy: { label: "asc" } }),
  ]);
  const manageMembers = can(role, "manage_members");
  const managePurchasing = can(role, "manage_purchasing");

  return (
    <>
      <PageHeader title={org.name} description="People, shipping addresses and purchasing options. Everything here is optional — use what your program needs." />
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Members */}
        <Card className="lg:col-span-2">
          <CardHeader title="People" description="Coaches, athletic directors, equipment managers and business office staff can share one account." />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-t border-slate-100">
                    <td className="px-5 py-3"><p className="font-medium">{m.user.name}{m.userId === user.id && " (you)"}</p><p className="text-slate-500">{m.user.email}</p></td>
                    <td className="px-5 py-3">
                      {manageMembers && m.role !== "OWNER" && m.userId !== user.id ? (
                        <form action={changeMemberRole} className="flex items-center gap-2">
                          <input type="hidden" name="membershipId" value={m.id} />
                          <select name="role" defaultValue={m.role} className="!w-auto !py-1">
                            {Object.entries(ROLES).filter(([k]) => k !== "OWNER").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                          <button className="text-brand-600 hover:underline">Update</button>
                        </form>
                      ) : (
                        <Badge tone="blue">{ROLES[m.role as Role]}</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {manageMembers && m.role !== "OWNER" && m.userId !== user.id && (
                        <form action={removeMember}><input type="hidden" name="membershipId" value={m.id} /><button className="text-slate-500 hover:text-red-600">Remove</button></form>
                      )}
                    </td>
                  </tr>
                ))}
                {invites.map((i) => (
                  <tr key={i.id} className="border-t border-slate-100 text-slate-500">
                    <td className="px-5 py-3">{i.email} <Badge>Invited</Badge><p className="break-all text-xs">Link: /invite/{i.token}</p></td>
                    <td className="px-5 py-3">{ROLES[i.role as Role]}</td>
                    <td className="px-5 py-3 text-right">{manageMembers && <form action={revokeInvite}><input type="hidden" name="inviteId" value={i.id} /><button className="hover:text-red-600">Revoke</button></form>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {manageMembers && (
            <div className="border-t border-slate-100 p-5">
              <ActionForm action={inviteMember} submitLabel="Create invite link" submitVariant="secondary" className="grid gap-3 sm:grid-cols-[1fr_200px_auto] sm:items-end">
                <Field label="Email" htmlFor="inv-email"><input id="inv-email" name="email" type="email" required /></Field>
                <Field label="Role" htmlFor="inv-role">
                  <select id="inv-role" name="role" defaultValue="COACH">
                    {Object.entries(ROLES).filter(([k]) => k !== "OWNER").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
              </ActionForm>
              <ul className="mt-3 grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
                {Object.entries(ROLE_DESCRIPTIONS).map(([k, v]) => <li key={k}><strong>{ROLES[k as Role]}:</strong> {v}</li>)}
              </ul>
            </div>
          )}
        </Card>

        {/* Addresses */}
        <Card id="addresses">
          <CardHeader title="Shipping addresses" description="Ship different orders to the field house, athletic office or a coach's school." />
          <ul className="divide-y divide-slate-100">
            {addresses.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 px-5 py-3 text-sm">
                <span><strong>{a.label}</strong>{a.isDefault && <> <Badge>Default</Badge></>}<br />{a.attention && <>{a.attention} · </>}{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.postalCode}</span>
                {can(role, "manage_addresses") && <form action={deleteAddress}><input type="hidden" name="addressId" value={a.id} /><button className="text-slate-500 hover:text-red-600">Remove</button></form>}
              </li>
            ))}
          </ul>
          {can(role, "manage_addresses") && <div className="border-t border-slate-100 p-5"><AddressForm /></div>}
        </Card>

        {/* Purchasing */}
        <Card id="purchasing">
          <CardHeader title="School & institutional purchasing" description="Optional. Set these up once; every future order uses them automatically." />
          <div className="space-y-6 p-5">
            <section>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Tax exemption</h3>
                <VerificationBadge status={org.taxExemptStatus} />
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {org.taxExemptStatus === "VERIFIED"
                  ? "Verified. Orders are placed tax-exempt automatically."
                  : org.taxExemptStatus === "PENDING"
                    ? "We're reviewing your certificate. Orders placed before verification include sales tax."
                    : "Upload your state sales-tax exemption certificate. Our team verifies it before orders are placed tax-free."}
              </p>
              {org.taxExemptStatus === "REJECTED" && org.taxExemptNote && <Notice tone="red">{org.taxExemptNote}</Notice>}
              {managePurchasing && org.taxExemptStatus !== "VERIFIED" && (
                <ActionForm action={submitTaxExemption} submitLabel="Upload certificate" submitVariant="secondary" className="mt-3">
                  <input name="file" type="file" accept=".pdf,.png,.jpg,.jpeg" required aria-label="Exemption certificate" />
                </ActionForm>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Purchase orders & invoice terms</h3>
                <VerificationBadge status={org.termsStatus} />
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {org.termsStatus === "APPROVED"
                  ? `Approved for Net ${org.termsNetDays ?? 30}. Choose “Purchase order / invoice” at checkout and enter your PO number.`
                  : org.termsStatus === "PENDING"
                    ? "Application under review. You can still pay by card meanwhile."
                    : "Schools and colleges can apply to pay by purchase order on invoice terms. Card payment is always available."}
              </p>
              {managePurchasing && ["NONE", "REJECTED"].includes(org.termsStatus) && (
                <ActionForm action={applyForTerms} submitLabel="Apply for invoice terms" submitVariant="secondary" className="mt-3">
                  <Field label="Billing details" htmlFor="terms-note" hint="Accounts payable contact, email, phone, and your district or institution's legal name.">
                    <textarea id="terms-note" name="note" rows={3} required />
                  </Field>
                </ActionForm>
              )}
            </section>

            <section>
              <h3 className="font-semibold">Order approvals</h3>
              <p className="mt-1 text-sm text-slate-600">
                {org.approvalThresholdCents != null
                  ? `On: coaches' orders of ${formatMoney(org.approvalThresholdCents)} or more wait for an admin or purchaser to approve.`
                  : "Off: anyone who can build orders can pay for them."}
              </p>
              {managePurchasing && (
                <ActionForm action={saveApprovalRule} submitLabel="Save" submitVariant="secondary" className="mt-3">
                  <label className="flex items-center gap-2 font-normal"><input type="checkbox" name="enabled" defaultChecked={org.approvalThresholdCents != null} /> Require approval for coaches&apos; orders</label>
                  <Field label="At or above ($)" htmlFor="threshold"><input id="threshold" name="threshold" type="number" min={0} step={50} defaultValue={org.approvalThresholdCents != null ? org.approvalThresholdCents / 100 : 1000} /></Field>
                </ActionForm>
              )}
            </section>

            {managePurchasing && (
              <section>
                <h3 className="font-semibold">Organization name</h3>
                <ActionForm action={updateOrganization} submitLabel="Save" submitVariant="secondary" className="mt-2">
                  <input name="name" defaultValue={org.name} aria-label="Organization name" />
                </ActionForm>
              </section>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

function VerificationBadge({ status }: { status: string }) {
  const map: Record<string, ["gray" | "amber" | "green" | "red", string]> = {
    NONE: ["gray", "Not set up"],
    PENDING: ["amber", "Under review"],
    VERIFIED: ["green", "Verified"],
    APPROVED: ["green", "Approved"],
    REJECTED: ["red", "Not approved"],
  };
  const [tone, label] = map[status] ?? ["gray", status];
  return <Badge tone={tone}>{label}</Badge>;
}
