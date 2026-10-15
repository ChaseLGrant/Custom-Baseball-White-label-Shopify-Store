"use client";
// The order builder. Everything a coach needs to build a full program order on
// one screen: products, colors, logos, placements, roster-driven sizing and a
// live price that updates on every change. Changes autosave as a draft.

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CATALOG, CATEGORY_LABELS, getProduct, lowestUnitCents, type Product } from "@/lib/catalog";
import { formatMoney, formatOrderNumber, type LineConfig } from "@/lib/domain";
import { priceOrder, type Issue, type LinePrice } from "@/lib/pricing";
import { buildLineItems, sizeBreakdown, type RosterPlayerLike } from "@/lib/roster";
import { defaultLineConfig } from "@/lib/line-defaults";
import { saveDraft } from "@/lib/actions/orders";
import { saveDesign } from "@/lib/actions/org";
import { ProductPreview } from "@/components/ProductPreview";
import { RosterImport } from "@/components/RosterImport";
import { Badge, Button, ButtonLink, Card, cx } from "@/components/ui";

export interface BuilderTeam { id: string; name: string; roster: RosterPlayerLike[] }
export interface BuilderLogo { id: string; name: string; url: string }
export interface BuilderDesign { id: string; name: string; productId: string; teamId: string | null; config: LineConfig }
interface Line { key: string; id?: string; productId: string; teamId: string | null; config: LineConfig }

interface Props {
  order: { id: string; name: string; number: number; reorderedFrom: string | null };
  initialLines: { id: string; productId: string; teamId: string | null; config: LineConfig }[];
  teams: BuilderTeam[];
  logos: BuilderLogo[];
  designs: BuilderDesign[];
  setupsPaid: Record<string, string[]>;
  canManageTeams: boolean;
}

let keySeq = 0;
const newKey = () => `l${Date.now().toString(36)}${keySeq++}`;

export function OrderBuilder({ order, initialLines, teams, logos, designs: initialDesigns, setupsPaid, canManageTeams }: Props) {
  const [name, setName] = useState(order.name);
  const [lines, setLines] = useState<Line[]>(() => initialLines.map((l) => ({ ...l, key: l.id })));
  const [open, setOpen] = useState<string | null>(initialLines[0]?.id ?? null);
  const [adding, setAdding] = useState(initialLines.length === 0);
  const [designs, setDesigns] = useState(initialDesigns);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const lastTeam = useRef<string | null>(initialLines.at(-1)?.teamId ?? teams[0]?.id ?? null);

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const logoUrls = useMemo(() => Object.fromEntries(logos.map((l) => [l.id, l.url])), [logos]);

  // ---- Live pricing (same engine the server uses) ----
  const pricingLines = useMemo(
    () =>
      lines.map((l) => {
        const product = getProduct(l.productId)!;
        const roster = l.teamId ? teamById.get(l.teamId)?.roster ?? [] : [];
        return { key: l.key, productId: l.productId, config: l.config, items: buildLineItems(product, l.config, roster) };
      }),
    [lines, teamById],
  );
  const price = useMemo(() => priceOrder({ lines: pricingLines, setupsPaid }), [pricingLines, setupsPaid]);

  // ---- Autosave (debounced) ----
  // Only save when the order's content changes (attaching database ids is not a change).
  const contentKey = (n: string, ls: Line[]) => JSON.stringify([n, ls.map(({ productId, teamId, config }) => [productId, teamId, config])]);
  const lastSaved = useRef(contentKey(order.name, lines));
  const latest = useRef(lastSaved.current);
  useEffect(() => {
    const key = contentKey(name, lines);
    latest.current = key;
    if (key === lastSaved.current) {
      setSaveState("saved");
      return;
    }
    setSaveState("saving");
    const snapshot = lines;
    const t = setTimeout(() => {
      startTransition(async () => {
        try {
          const res = await saveDraft(order.id, { name, lines: snapshot.map(({ id, productId, teamId, config }) => ({ id, productId, teamId, config })) });
          lastSaved.current = key;
          // Attach database ids (only creates a new array if an id actually changed).
          setLines((cur) => {
            let changed = false;
            const next = cur.map((l) => {
              const idx = snapshot.findIndex((x) => x.key === l.key);
              if (idx < 0 || l.id === res.lineIds[idx]) return l;
              changed = true;
              return { ...l, id: res.lineIds[idx] };
            });
            return changed ? next : cur;
          });
          // Still "saving" if the coach made more edits while this request was in flight.
          setSaveState(latest.current === key ? "saved" : "saving");
          setSaveError(null);
        } catch (e) {
          setSaveState("error");
          setSaveError((e as Error).message);
        }
      });
    }, 700);
    return () => clearTimeout(t);
  }, [lines, name, order.id]);

  const update = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const updateConfig = (key: string, patch: Partial<LineConfig>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, config: { ...l.config, ...patch } } : l)));

  function addProduct(productId: string, config?: LineConfig, teamId?: string | null) {
    const key = newKey();
    const team = teamId !== undefined ? teamId : lastTeam.current;
    setLines((ls) => [...ls, { key, productId, teamId: team, config: config ?? defaultLineConfig(productId, logos[0]?.id ?? null) }]);
    setOpen(key);
    setAdding(false);
  }

  const errors = price.issues.filter((i) => i.level === "error");
  const needsQuote = price.quoteReasons.length > 0;
  const canContinue = saveState === "saved" && price.totalQuantity > 0 && errors.length === 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Order name"
            className="min-w-0 sm:!w-auto sm:flex-1 !border-transparent !bg-transparent !px-1 !text-2xl !font-bold !shadow-none hover:!border-slate-200 focus:!border-brand-600"
          />
          <span className="text-sm text-slate-500">{formatOrderNumber(order.number)} · Draft</span>
          <SaveIndicator state={saveState} />
        </div>
        {saveError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Couldn&apos;t save: {saveError}</p>}
        {order.reorderedFrom && (
          <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-900">
            Reorder of {order.reorderedFrom}. Same products, colors and logos — sizes and names come from each team&apos;s <strong>current</strong> roster, and prices are today&apos;s.
            Update rosters for the new season before checking out.
          </p>
        )}

        {lines.map((line, idx) => (
          <LineCard
            key={line.key}
            index={idx}
            line={line}
            priced={price.lines.find((p) => p.key === line.key)!}
            items={pricingLines.find((p) => p.key === line.key)!.items}
            open={open === line.key}
            onToggle={() => setOpen(open === line.key ? null : line.key)}
            onTeam={(teamId) => { lastTeam.current = teamId; update(line.key, { teamId }); }}
            onConfig={(patch) => updateConfig(line.key, patch)}
            onRemove={() => setLines((ls) => ls.filter((l) => l.key !== line.key))}
            onDuplicate={() => {
              const key = newKey();
              setLines((ls) => [...ls.slice(0, idx + 1), { ...line, id: undefined, key }, ...ls.slice(idx + 1)]);
              setOpen(key);
            }}
            onSaveDesign={async (designName) => {
              const d = await saveDesign({ name: designName, productId: line.productId, teamId: line.teamId, config: line.config });
              setDesigns((ds) => [...ds, { id: d.id, name: d.name, productId: line.productId, teamId: line.teamId, config: line.config }]);
            }}
            teams={teams}
            team={line.teamId ? teamById.get(line.teamId) ?? null : null}
            logos={logos}
            logoUrls={logoUrls}
            canManageTeams={canManageTeams}
            orderId={order.id}
          />
        ))}

        {adding || lines.length === 0 ? (
          <ProductPicker designs={designs} onAdd={addProduct} onClose={lines.length ? () => setAdding(false) : undefined} />
        ) : (
          <button onClick={() => setAdding(true)} className="w-full rounded-xl border-2 border-dashed border-slate-300 py-4 font-semibold text-brand-700 hover:border-brand-600 hover:bg-brand-50">
            + Add a product
          </button>
        )}
      </div>

      {/* ---- Summary ---- */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card className="p-5">
          <h2 className="font-semibold">Order total</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {price.lines.map((l) => (
              <li key={l.key} className="flex justify-between gap-3">
                <span className="text-slate-600">{l.quantity} × {l.productName}</span>
                <span className="font-medium">{l.needsQuote ? "Quote" : formatMoney(l.lineTotalCents)}</span>
              </li>
            ))}
            {price.setupFees.map((f) => (
              <li key={f.logoId + f.method} className="flex justify-between gap-3">
                <span className="text-slate-600">{f.methodLabel} setup{f.waived ? " (on file)" : ""}</span>
                <span className={f.waived ? "text-emerald-700" : "font-medium"}>{f.waived ? "Free" : formatMoney(f.cents)}</span>
              </li>
            ))}
            {price.totalQuantity > 0 && (
              <li className="flex justify-between gap-3">
                <span className="text-slate-600">Shipping</span>
                <span className="font-medium">{price.shippingCents ? formatMoney(price.shippingCents) : "Free"}</span>
              </li>
            )}
          </ul>
          <div className="mt-4 flex items-baseline justify-between border-t border-slate-200 pt-4">
            <span className="font-semibold">{needsQuote ? "Priced items" : "Total"}</span>
            <span className="text-2xl font-black">{formatMoney(price.totalCents)}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{price.totalQuantity} pieces · plus sales tax unless tax-exempt</p>

          {errors.length > 0 && (
            <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
              <p className="font-semibold">To finish:</p>
              <ul className="mt-1 list-inside list-disc">{errors.slice(0, 6).map((e, i) => <li key={i}>{issueText(e, lines)}</li>)}</ul>
            </div>
          )}
          {needsQuote && errors.length === 0 && (
            <div className="mt-4 rounded-md bg-violet-50 p-3 text-sm text-violet-900">
              <p className="font-semibold">Pricing review needed</p>
              <p className="mt-1">{price.quoteReasons.join(" ")} Submit and we&apos;ll confirm the price — you&apos;ll pay online once it&apos;s ready.</p>
            </div>
          )}

          <ButtonLink
            href={`/app/orders/${order.id}/checkout`}
            variant="accent"
            className={cx("mt-4 w-full py-3 text-base", !canContinue && "pointer-events-none opacity-50")}
            aria-disabled={!canContinue}
          >
            {needsQuote ? "Review & submit for pricing" : "Review & checkout"}
          </ButtonLink>
          <p className="mt-3 text-center text-xs text-slate-500">You&apos;ll approve a production proof before anything is made.</p>
        </Card>
      </aside>

      {/* Phones: keep the total and the next step always in reach. */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-slate-200 bg-surface px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] lg:hidden">
        <div>
          <p className="text-lg font-black leading-tight">{formatMoney(price.totalCents)}</p>
          <p className="text-xs text-slate-500">{errors.length ? `${errors.length} to fix` : `${price.totalQuantity} pieces`}</p>
        </div>
        <ButtonLink
          href={`/app/orders/${order.id}/checkout`}
          variant="accent"
          className={cx(!canContinue && "pointer-events-none opacity-50")}
          aria-disabled={!canContinue}
        >
          {needsQuote ? "Submit for pricing" : "Checkout"}
        </ButtonLink>
      </div>
      <div className="h-16 lg:hidden" aria-hidden />
    </div>
  );
}

function issueText(i: Issue, lines: Line[]) {
  const line = lines.find((l) => l.key === i.lineKey);
  return line ? `${getProduct(line.productId)?.name}: ${i.message}` : i.message;
}

function SaveIndicator({ state }: { state: "saved" | "saving" | "error" }) {
  return (
    <span className={cx("text-xs", state === "error" ? "text-red-600" : "text-slate-400")}>
      {state === "saving" ? "Saving…" : state === "error" ? "Not saved" : "All changes saved"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Product picker
// ---------------------------------------------------------------------------

function ProductPicker({ designs, onAdd, onClose }: { designs: BuilderDesign[]; onAdd: (id: string, config?: LineConfig, teamId?: string | null) => void; onClose?: () => void }) {
  const categories = [...new Set(CATALOG.products.map((p) => p.category))];
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Add a product</h2>
        {onClose && <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-800">Cancel</button>}
      </div>
      {designs.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your saved designs</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {designs.map((d) => (
              <button key={d.id} onClick={() => onAdd(d.productId, d.config, d.teamId)} className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-800 hover:bg-brand-100">
                ★ {d.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {categories.map((cat) => (
        <div key={cat} className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{CATEGORY_LABELS[cat]}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {CATALOG.products.filter((p) => p.category === cat).map((p) => {
              const low = lowestUnitCents(p);
              return (
                <button key={p.id} onClick={() => onAdd(p.id)} className="flex items-center gap-3 rounded-lg border border-slate-200 p-2 text-left hover:border-brand-600 hover:bg-brand-50">
                  <div className="w-14 shrink-0"><ProductPreview product={p} colorId={p.colors.find((c) => c.id === "navy")?.id ?? p.colors[0].id} decorations={[]} logoUrls={{}} className="[&_figcaption]:hidden [&>figure:nth-child(2)]:hidden" /></div>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{p.name}</span>
                    <span className="block text-xs text-slate-500">
                      {low != null ? `from ${formatMoney(low)}` : "Priced per design"} · min {p.minQty}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// One product line
// ---------------------------------------------------------------------------

interface LineCardProps {
  index: number;
  line: Line;
  priced: LinePrice;
  items: ReturnType<typeof buildLineItems>;
  open: boolean;
  onToggle: () => void;
  onTeam: (teamId: string | null) => void;
  onConfig: (patch: Partial<LineConfig>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onSaveDesign: (name: string) => Promise<void>;
  teams: BuilderTeam[];
  team: BuilderTeam | null;
  logos: BuilderLogo[];
  logoUrls: Record<string, string>;
  canManageTeams: boolean;
  orderId: string;
}

function LineCard(props: LineCardProps) {
  const { line, priced, items, open, team, logos, logoUrls } = props;
  const product = getProduct(line.productId)!;
  const c = line.config;
  const color = product.colors.find((x) => x.id === c.color);
  const errorCount = priced.issues.filter((i) => i.level === "error").length;
  const sample = team?.roster.find((p) => p.name || p.number);

  return (
    <Card className={cx(errorCount > 0 && !open && "border-red-200")}>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <button onClick={props.onToggle} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={open}>
          <span className="h-6 w-6 shrink-0 rounded-full border border-slate-300" style={{ background: color?.hex }} />
          <span className="min-w-0">
            <span className="block truncate font-semibold">{product.name}</span>
            <span className="block truncate text-sm text-slate-500">
              {color?.name} · {priced.quantity} pcs{team ? ` · ${team.name}` : ""}
              {errorCount > 0 && <span className="text-red-600"> · {errorCount} to fix</span>}
            </span>
          </span>
        </button>
        <span className="text-right">
          <span className="block font-semibold">{priced.needsQuote ? <Badge tone="purple">Quote</Badge> : formatMoney(priced.lineTotalCents)}</span>
          {!priced.needsQuote && priced.quantity > 0 && <span className="block text-xs text-slate-500">{formatMoney(priced.effectiveUnitCents)}/pc all-in</span>}
        </span>
        <button onClick={props.onToggle} className="text-slate-400" aria-label={open ? "Collapse" : "Expand"}>{open ? "▲" : "▼"}</button>
      </div>

      {open && (
        <div className="border-t border-slate-100 p-4">
          <div className="grid gap-6 md:grid-cols-[minmax(0,260px)_1fr]">
            <div>
              <div className="rounded-lg bg-slate-50 p-3">
                <ProductPreview product={product} colorId={c.color} decorations={c.decorations} logoUrls={logoUrls} names={c.names} numbers={c.numbers} sampleName={sample?.name.split(" ").at(-1) || undefined} sampleNumber={sample?.number || undefined} />
              </div>
              <p className="mt-2 text-xs text-slate-500">Preview for reference. You&apos;ll approve an exact production proof.</p>
            </div>

            <div className="space-y-5">
              {/* Team */}
              <Section title="Team">
                <select value={line.teamId ?? ""} onChange={(e) => props.onTeam(e.target.value || null)} aria-label="Team">
                  <option value="">No team (enter sizes manually)</option>
                  {props.teams.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.roster.length} players)</option>)}
                </select>
                {props.teams.length === 0 && props.canManageTeams && (
                  <p className="mt-1 text-xs text-slate-500"><Link className="text-brand-600 underline" href="/app/teams">Add a team</Link> to use a roster for names, numbers and sizes.</p>
                )}
              </Section>

              {/* Color */}
              <Section title={`Color: ${color?.name ?? "choose"}`}>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((col) => (
                    <button
                      key={col.id}
                      title={col.name}
                      aria-label={col.name}
                      aria-pressed={c.color === col.id}
                      onClick={() => props.onConfig({ color: col.id })}
                      className={cx("h-8 w-8 rounded-full border-2", c.color === col.id ? "border-brand-600 ring-2 ring-brand-100" : "border-slate-300")}
                      style={{ background: col.hex }}
                    />
                  ))}
                </div>
              </Section>

              {/* Logos */}
              <Section title="Logos & placement">
                {logos.length === 0 && (
                  <p className="mb-2 text-sm text-amber-700">
                    <Link href="/app/logos" className="font-semibold underline">Upload your logo</Link> first — it&apos;s saved for every future order.
                  </p>
                )}
                <div className="space-y-2">
                  {product.locations.map((loc) => {
                    const d = c.decorations.find((x) => x.location === loc.id);
                    const setDeco = (patch: Partial<{ method: string; logoId: string | null }> | null) => {
                      const others = c.decorations.filter((x) => x.location !== loc.id);
                      props.onConfig({
                        decorations: patch === null ? others : [...others, { location: loc.id, method: d?.method ?? loc.methods[0], logoId: d?.logoId ?? logos[0]?.id ?? null, ...patch }],
                      });
                    };
                    return (
                      <div key={loc.id} className={cx("rounded-lg border p-2", d ? "border-brand-200 bg-brand-50/50" : "border-slate-200")}>
                        <label className="flex items-center gap-2 font-normal">
                          <input type="checkbox" checked={!!d} onChange={(e) => setDeco(e.target.checked ? {} : null)} />
                          <span className="text-sm font-medium">{loc.label}</span>
                          <span className="text-xs text-slate-500">up to {loc.maxSizeIn}</span>
                        </label>
                        {d && (
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            <select value={d.logoId ?? ""} onChange={(e) => setDeco({ logoId: e.target.value || null })} aria-label={`${loc.label} logo`}>
                              <option value="">Choose logo…</option>
                              {logos.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                            <select value={d.method} onChange={(e) => setDeco({ method: e.target.value })} aria-label={`${loc.label} method`}>
                              {loc.methods.map((m) => {
                                const method = CATALOG.decorationMethods[m];
                                return <option key={m} value={m}>{method.label} — from {formatMoney(Math.min(...method.tiers.map((t) => t.unitCents)))}/pc</option>;
                              })}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Section>

              {/* Personalization */}
              {(product.personalization.names || product.personalization.numbers) && (
                <Section title="Personalization from roster">
                  <div className="flex flex-wrap gap-4">
                    {product.personalization.names && (
                      <label className="flex items-center gap-2 font-normal">
                        <input type="checkbox" checked={c.names} onChange={(e) => props.onConfig({ names: e.target.checked })} />
                        {product.personalization.names.label} (+{formatMoney(product.personalization.names.unitCents)})
                      </label>
                    )}
                    {product.personalization.numbers && (
                      <label className="flex items-center gap-2 font-normal">
                        <input type="checkbox" checked={c.numbers} onChange={(e) => props.onConfig({ numbers: e.target.checked })} />
                        {product.personalization.numbers.label} (+{formatMoney(product.personalization.numbers.unitCents)})
                      </label>
                    )}
                  </div>
                  {(c.names || c.numbers) && c.sizing !== "ROSTER" && <p className="mt-1 text-xs text-amber-700">Names and numbers come from a team roster — switch sizing to “Team roster”.</p>}
                </Section>
              )}

              {/* Sizing */}
              <Section title="Sizes & quantities">
                {product.sizeField !== "none" && (
                  <div className="mb-3 flex flex-wrap gap-4 text-sm">
                    <label className="flex items-center gap-2 font-normal">
                      <input type="radio" checked={c.sizing === "ROSTER"} onChange={() => props.onConfig({ sizing: "ROSTER" })} /> Team roster (one per player)
                    </label>
                    <label className="flex items-center gap-2 font-normal">
                      <input type="radio" checked={c.sizing === "SIZE_RUN"} onChange={() => props.onConfig({ sizing: "SIZE_RUN" })} /> Enter quantities by size
                    </label>
                  </div>
                )}
                {c.sizing === "ROSTER" ? (
                  !team ? (
                    <p className="text-sm text-amber-700">Choose a team above to use its roster, or enter quantities by size.</p>
                  ) : team.roster.length === 0 ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="mb-2 text-sm font-medium text-amber-900">{team.name} has no roster yet. Import one now:</p>
                      {props.canManageTeams ? <RosterImport teamId={team.id} hasRoster={false} compact /> : <p className="text-sm">Ask your admin to import it.</p>}
                    </div>
                  ) : (
                    <div className="text-sm">
                      <p>
                        <strong>{team.roster.length} players</strong> from {team.name}:{" "}
                        {sizeBreakdown(product, buildLineItems(product, { ...c, extras: {} }, team.roster)).map(([s, q]) => `${s || "no size"}×${q}`).join(", ")}
                      </p>
                      {product.sizeField === "hatSize" && !team.roster.some((p) => p.hatSize) && (
                        <p className="mt-1 text-xs text-slate-500">Hat sizes estimated from each player&apos;s apparel size. Add a “Hat Size” column to your roster to set them exactly.</p>
                      )}
                      <Link href={`/app/teams/${team.id}`} className="mt-1 inline-block text-xs font-medium text-brand-600 underline">Edit roster</Link>
                    </div>
                  )
                ) : (
                  <SizeGrid sizes={product.sizes} values={c.sizeRun} onChange={(sizeRun) => props.onConfig({ sizeRun })} />
                )}
                {c.sizing === "ROSTER" && <ExtrasEditor product={product} values={c.extras} onChange={(extras) => props.onConfig({ extras })} />}
              </Section>

              {/* Price detail */}
              <PriceDetail product={product} priced={priced} />

              {priced.issues.length > 0 && (
                <ul className="space-y-1 text-sm">
                  {priced.issues.map((i, n) => (
                    <li key={n} className={i.level === "error" ? "text-red-700" : i.level === "quote" ? "text-violet-700" : "text-amber-700"}>
                      {i.level === "error" ? "✕" : i.level === "quote" ? "◆" : "!"} {i.message}
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                <SaveDesignButton onSave={props.onSaveDesign} defaultName={`${team?.name ? team.name + " " : ""}${color?.name ?? ""} ${product.name}`} />
                <Button variant="ghost" onClick={props.onDuplicate}>Duplicate for another team</Button>
                <Button variant="danger" onClick={props.onRemove} className="ml-auto">Remove</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-slate-800">{title}</p>
      {children}
    </div>
  );
}

function SizeGrid({ sizes, values, onChange }: { sizes: string[]; values: Record<string, number>; onChange: (v: Record<string, number>) => void }) {
  return (
    <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
      {sizes.map((s) => (
        <label key={s} className="text-center text-xs font-medium text-slate-600">
          {s}
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={values[s] || ""}
            placeholder="0"
            onChange={(e) => onChange({ ...values, [s]: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
            className="mt-0.5 !px-1 !py-1 text-center"
          />
        </label>
      ))}
    </div>
  );
}

function ExtrasEditor({ product, values, onChange }: { product: Product; values: Record<string, number>; onChange: (v: Record<string, number>) => void }) {
  const total = Object.values(values).reduce((a, b) => a + b, 0);
  const [show, setShow] = useState(total > 0);
  return (
    <div className="mt-3">
      {!show ? (
        <button onClick={() => setShow(true)} className="text-xs font-medium text-brand-600">+ Add extra pieces (coaches, spares)</button>
      ) : (
        <>
          <p className="mb-1 text-xs text-slate-500">Extra pieces without names/numbers:</p>
          <SizeGrid sizes={product.sizes} values={values} onChange={onChange} />
        </>
      )}
    </div>
  );
}

function PriceDetail({ product, priced }: { product: Product; priced: LinePrice }) {
  if (priced.needsQuote || priced.quantity === 0) return null;
  return (
    <div className="rounded-lg bg-slate-50 p-3 text-sm">
      <div className="flex justify-between"><span>{priced.quantity} × {formatMoney(priced.baseUnitCents)} garment</span><span>{formatMoney(priced.baseUnitCents * priced.quantity)}</span></div>
      {priced.sizeUpchargeCents > 0 && <div className="flex justify-between"><span>Large-size upcharges</span><span>{formatMoney(priced.sizeUpchargeCents)}</span></div>}
      {priced.decorationCents > 0 && <div className="flex justify-between"><span>Decoration ({formatMoney(priced.decorationUnitCents)}/pc)</span><span>{formatMoney(priced.decorationCents)}</span></div>}
      {priced.personalizationCents > 0 && <div className="flex justify-between"><span>Names & numbers</span><span>{formatMoney(priced.personalizationCents)}</span></div>}
      {priced.tierQuantity !== priced.quantity && (
        <p className="mt-1 text-xs text-slate-500">Volume price based on {priced.tierQuantity} {product.name}s across this order.</p>
      )}
      {priced.nextTier && (
        <p className="mt-1 text-xs font-medium text-emerald-700">
          Add {priced.nextTier.piecesNeeded} more to drop to {formatMoney(priced.nextTier.unitCents)}/pc.
        </p>
      )}
    </div>
  );
}

function SaveDesignButton({ onSave, defaultName }: { onSave: (name: string) => Promise<void>; defaultName: string }) {
  const [state, setState] = useState<"idle" | "naming" | "saving" | "done">("idle");
  const [name, setName] = useState(defaultName.trim());
  if (state === "done") return <span className="self-center text-sm text-emerald-700">★ Saved to designs</span>;
  if (state === "idle") return <Button variant="ghost" onClick={() => setState("naming")}>★ Save as design</Button>;
  return (
    <span className="flex items-center gap-2">
      <input value={name} onChange={(e) => setName(e.target.value)} className="!w-56 !py-1" aria-label="Design name" />
      <Button variant="secondary" disabled={state === "saving"} onClick={async () => { setState("saving"); await onSave(name); setState("done"); }}>Save</Button>
    </span>
  );
}
