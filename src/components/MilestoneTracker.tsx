import { MILESTONES, milestoneIndex } from "@/lib/domain";

export function MilestoneTracker({ status }: { status: string }) {
  const current = milestoneIndex(status);
  return (
    <ol className="grid grid-cols-3 gap-y-4 sm:grid-cols-6">
      {MILESTONES.map((m, i) => {
        const done = i < current || (i === current && ["DELIVERED"].includes(status));
        const active = i === current && !done;
        return (
          <li key={m.key} className="flex flex-col items-center text-center">
            <span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold ${done ? "bg-accent-500 text-black" : active ? "bg-accent-500 text-black ring-4 ring-accent-500/20" : "bg-slate-200 text-slate-500"}`}>
              {done ? "✓" : i + 1}
            </span>
            <span className={`mt-1.5 text-xs font-medium ${active ? "text-slate-900" : "text-slate-500"}`}>{m.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
