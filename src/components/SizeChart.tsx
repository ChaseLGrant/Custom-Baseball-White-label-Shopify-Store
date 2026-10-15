import { APPAREL_FIT, HAT_FIT } from "@/lib/sizes";

/** Collapsible fit guide so coaches and parents can pick sizes without guessing. */
export function SizeChart({ className = "" }: { className?: string }) {
  return (
    <details className={`group rounded-xl border border-slate-200 bg-surface text-sm ${className}`}>
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold">
        📏 Size &amp; fit guide
        <span className="text-slate-400 transition group-open:rotate-180">▾</span>
      </summary>
      <div className="grid gap-4 border-t border-slate-100 p-4 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Jerseys, tees, hoodies · chest (in)</p>
          <table className="w-full">
            <tbody>
              {APPAREL_FIT.map(([size, chest]) => (
                <tr key={size} className="border-b border-slate-100 last:border-0">
                  <td className="py-1 font-semibold">{size}</td>
                  <td className="py-1 text-right text-slate-600">{chest}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Stretch-fit caps · head</p>
          <table className="w-full">
            <tbody>
              {HAT_FIT.map(([size, fitted, inches]) => (
                <tr key={size} className="border-b border-slate-100 last:border-0">
                  <td className="py-1 font-semibold">{size}</td>
                  <td className="py-1 text-right text-slate-600">{fitted} <span className="text-slate-400">({inches}&quot;)</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-slate-500">
            Between sizes? Size up. Pants, gloves, helmets and belts use the player&apos;s shirt size unless you enter a separate one.
          </p>
        </div>
      </div>
    </details>
  );
}
