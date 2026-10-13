"use client";
import { ActionForm } from "./ActionForm";
import { Field } from "./ui";
import { importRoster } from "@/lib/actions/org";

export function RosterImport({ teamId, hasRoster, compact = false }: { teamId: string; hasRoster: boolean; compact?: boolean }) {
  return (
    <ActionForm action={importRoster} submitLabel="Import roster" resetOnSuccess>
      <input type="hidden" name="teamId" value={teamId} />
      <Field
        label={compact ? "Roster spreadsheet" : "Spreadsheet file"}
        htmlFor={`roster-${teamId}`}
        hint={
          <>
            Excel (.xlsx) or CSV. Columns like <em>Name, Number, Size</em> — optional <em>Pant Size, Hat Size</em>. Headers and sizes like
            “Adult Large” or “XXL” are recognized automatically. <a href="/samples/roster-template.csv" className="font-medium text-brand-600 underline" download>Download a template</a>.
          </>
        }
      >
        <input id={`roster-${teamId}`} name="file" type="file" accept=".csv,.xlsx,.tsv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required />
      </Field>
      {hasRoster && (
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1.5 font-normal"><input type="radio" name="mode" value="replace" defaultChecked /> Replace roster</label>
          <label className="flex items-center gap-1.5 font-normal"><input type="radio" name="mode" value="append" /> Add to roster</label>
        </div>
      )}
    </ActionForm>
  );
}
