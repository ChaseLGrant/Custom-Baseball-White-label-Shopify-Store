"use client";
import { useState } from "react";
import { ActionForm, SubmitButton } from "./ActionForm";
import { saveRoster } from "@/lib/actions/org";

type Row = { name: string; number: string | null; size: string | null; topSize: string | null; bottomSize: string | null; hatSize: string | null };
const EMPTY: Row = { name: "", number: null, size: null, topSize: null, bottomSize: null, hatSize: null };

export function RosterEditor({ teamId, players, canEdit }: { teamId: string; players: Row[]; canEdit: boolean }) {
  const [rows, setRows] = useState<Row[]>(players.length ? players : [EMPTY]);
  // Show category-specific size columns only if any player uses them.
  const [showExtra, setShowExtra] = useState(players.some((p) => p.topSize || p.bottomSize || p.hatSize));
  const cols: [keyof Row, string, string][] = [
    ["name", "Name", "min-w-40"],
    ["number", "#", "w-16"],
    ["size", "Size", "w-20"],
    ...(showExtra ? ([["topSize", "Jersey/top", "w-24"], ["bottomSize", "Pants", "w-20"], ["hatSize", "Hat", "w-20"]] as [keyof Row, string, string][]) : []),
  ];
  return (
    <ActionForm action={saveRoster} className="p-0">
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="rowCount" value={rows.length} />
      {/* Hidden columns still post so their values aren't lost. */}
      {!showExtra && rows.map((r, i) => (["topSize", "bottomSize", "hatSize"] as const).map((f) => <input key={`${i}${f}`} type="hidden" name={`row${i}.${f}`} value={r[f] ?? ""} />))}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-8 px-3 py-2">#</th>
              {cols.map(([k, label]) => <th key={k} className="px-2 py-2">{label}</th>)}
              {canEdit && <th className="w-10" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-3 text-xs text-slate-400">{i + 1}</td>
                {cols.map(([k, , w]) => (
                  <td key={k} className={`px-1 py-1 ${w}`}>
                    <input
                      name={`row${i}.${k}`}
                      value={r[k] ?? ""}
                      disabled={!canEdit}
                      aria-label={`Row ${i + 1} ${k}`}
                      onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))}
                      className="!py-1"
                    />
                  </td>
                ))}
                {canEdit && (
                  <td className="text-center">
                    <button type="button" aria-label="Remove player" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-600">✕</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canEdit && (
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-4 py-3">
          <button type="button" className="text-sm font-semibold text-brand-600" onClick={() => setRows([...rows, EMPTY])}>+ Add player</button>
          <label className="flex items-center gap-1.5 text-sm font-normal">
            <input type="checkbox" checked={showExtra} onChange={(e) => setShowExtra(e.target.checked)} /> Different sizes for tops / pants / hats
          </label>
          <span className="ml-auto"><SubmitButton>Save roster</SubmitButton></span>
        </div>
      )}
    </ActionForm>
  );
}

