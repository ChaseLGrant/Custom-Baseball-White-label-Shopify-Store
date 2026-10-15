import type { Metadata } from "next";
import { AuthShell } from "@/components/AuthShell";
import { ActionForm } from "@/components/ActionForm";
import { SizeChart } from "@/components/SizeChart";
import { Field, Notice } from "@/components/ui";
import { submitSize } from "@/lib/actions/size";
import { APPAREL_SIZES, HAT_SIZES } from "@/lib/sizes";
import { db } from "@/lib/server/db";

export const metadata: Metadata = { title: "Team sizes", robots: { index: false } };

export default async function SizeLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const team = await db.team.findUnique({
    where: { sizeLinkToken: token },
    include: { organization: true, roster: { select: { number: true } } },
  });
  if (!team || team.archived)
    return <AuthShell title="Link not active"><Notice tone="amber">This size link was turned off or replaced. Ask your coach for the current one.</Notice></AuthShell>;

  const taken = team.roster.map((p) => p.number).filter((n): n is string => !!n).sort((a, b) => Number(a) - Number(b));
  return (
    <AuthShell
      title={team.name}
      subtitle={<>{team.organization.name} · Add your name, number and size for team gear. Takes 20 seconds, no account needed.</>}
      footer={<span>Already submitted? Enter the same name again to change it.</span>}
    >
      <ActionForm action={submitSize} submitLabel="Submit my size" submitVariant="accent" resetOnSuccess>
        <input type="hidden" name="token" value={token} />
        <Field label="Player name" htmlFor="sz-name"><input id="sz-name" name="name" required minLength={2} maxLength={60} autoComplete="name" placeholder="First and last name" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jersey #" htmlFor="sz-num" hint="Optional">
            <input id="sz-num" name="number" inputMode="numeric" pattern="#?[0-9]{1,3}" maxLength={4} placeholder="12" />
          </Field>
          <Field label="Shirt size" htmlFor="sz-size">
            <select id="sz-size" name="size" required defaultValue="">
              <option value="" disabled>Pick…</option>
              {APPAREL_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Pants size" htmlFor="sz-pants" hint="If different">
            <select id="sz-pants" name="bottomSize" defaultValue="">
              <option value="">Same</option>
              {APPAREL_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Cap size" htmlFor="sz-hat" hint="If you know it">
            <select id="sz-hat" name="hatSize" defaultValue="">
              <option value="">Not sure</option>
              {HAT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        {taken.length > 0 && (
          <p className="text-xs text-slate-500">Numbers already taken: <span className="font-semibold text-slate-700">{taken.join(", ")}</span></p>
        )}
      </ActionForm>
      <SizeChart className="mt-5" />
    </AuthShell>
  );
}
