"use client";
// One-screen ordering: drop logo, drop roster, pick gear, pay.
import Link from "next/link";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { CATALOG, GROUPS, UNIFORM_KIT_PRODUCT_IDS, getProduct, lowestUnitCents, type Product } from "@/lib/catalog";
import { ORG_TYPES, formatMoney, lineConfigSchema } from "@/lib/domain";
import { priceOrder } from "@/lib/pricing";
import { buildLineItems, normalizeSize, sizeBreakdown, type RosterPlayerLike } from "@/lib/roster";
import { pickColor, quickLineConfig } from "@/lib/quick-config";
import { placeQuickOrder, previewRoster } from "@/lib/actions/quick";
import { ProductPreview } from "@/components/ProductPreview";
import { cx } from "@/components/ui";
import { SizeChart } from "@/components/SizeChart";
import { estimateDelivery, formatDateRange } from "@/lib/delivery";

interface Props {
  signedIn: boolean;
  orgId: string | null;
  orgName: string | null;
  logos: { id: string; name: string; url: string }[];
  teams: { id: string; name: string; roster: RosterPlayerLike[] }[];
  setupsPaid: Record<string, string[]>;
  initialAdd: string | null;
}

const COLORS = getProduct("jersey-full-button")!.colors;
const OPTIONS = CATALOG.products.filter((p) => p.pricing.status === "VERIFIED");
const ADULT_SIZES = ["YS", "YM", "YL", "YXL", "S", "M", "L", "XL", "2XL", "3XL"];
const NEW_LOGO = "new-logo";

export function QuickOrder({ signedIn, orgId, orgName, logos, teams, setupsPaid, initialAdd }: Props) {
  const added = initialAdd && OPTIONS.some((p) => p.id === initialAdd) ? initialAdd : null;

  // Logo: a saved one, or a newly dropped file.
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [savedLogoId, setSavedLogoId] = useState<string | null>(logos[0]?.id ?? null);

  // Roster: a saved team, a newly dropped file, or a plain size run.
  const [teamId, setTeamId] = useState<string | null>(teams.find((t) => t.roster.length)?.id ?? null);
  const [rosterFile, setRosterFile] = useState<File | null>(null);
  const [newPlayers, setNewPlayers] = useState<RosterPlayerLike[] | null>(null);
  const [rosterProblems, setRosterProblems] = useState<string[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [useSizes, setUseSizes] = useState(false);
  // Typed-in roster (null = not typing). editingTeam: the typed rows replace a saved team's roster.
  const [manual, setManual] = useState<ManualRow[] | null>(null);
  const [editingTeam, setEditingTeam] = useState(false);
  const [sizeRun, setSizeRun] = useState<Record<string, number>>({});
  const [teamName, setTeamName] = useState("");

  // Gear
  const [selected, setSelected] = useState<string[]>(added && !UNIFORM_KIT_PRODUCT_IDS.includes(added) ? [...UNIFORM_KIT_PRODUCT_IDS, added] : UNIFORM_KIT_PRODUCT_IDS);
  const [focus, setFocus] = useState<string>(added ?? UNIFORM_KIT_PRODUCT_IDS[0]);
  const [tab, setTab] = useState<Product["group"]>(added ? getProduct(added)!.group : "uniforms");
  const [teamQty, setTeamQty] = useState<Record<string, number>>({});
  const [color, setColor] = useState("navy");
  const [personalize, setPersonalize] = useState(true);

  const [state, formAction] = useActionState(placeQuickOrder, {});
  const [pending, startTransition] = useTransition();

  const savedTeam = teams.find((t) => t.id === teamId) ?? null;
  const manualPlayers = useMemo(() => (manual ?? []).filter((r) => r.name.trim() || r.number.trim() || r.size).map(toPlayer), [manual]);
  const players: RosterPlayerLike[] = useSizes ? [] : manual ? manualPlayers : newPlayers ?? savedTeam?.roster ?? [];
  const hasNames = players.some((p) => p.name);
  const logoId = logoFile ? NEW_LOGO : savedLogoId;
  const logoUrls = useMemo(
    () => ({ ...Object.fromEntries(logos.map((l) => [l.id, l.url])), ...(logoUrl ? { [NEW_LOGO]: logoUrl } : {}) }),
    [logos, logoUrl],
  );

  // Exactly what the server will build, priced live.
  const lines = useMemo(
    () =>
      selected.map((id) => {
        const p = getProduct(id)!;
        const config = quickLineConfig(p, { color, logoId, rosterCount: players.length, personalize: personalize && hasNames, sizeRun, teamQty: teamQty[id] });
        return { key: id, productId: id, config, items: buildLineItems(p, config, players) };
      }),
    [selected, color, logoId, players, personalize, hasNames, sizeRun, teamQty],
  );
  const price = useMemo(() => priceOrder({ lines, setupsPaid }), [lines, setupsPaid]);
  const headcount = players.length || Object.values(sizeRun).reduce((a, b) => a + (b || 0), 0);
  const perPlayer = headcount > 1 && price.totalCents > 0 ? Math.round(price.totalCents / headcount) : null;
  // Dates are computed after mount so the server and browser render the same HTML.
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => setToday(new Date()), []);
  const arrival = useMemo(() => (today ? estimateDelivery(selected.map((id) => getProduct(id)!.leadTimeDays), today) : null), [selected, today]);
  const errors = price.issues.filter((i) => i.level === "error" && !/Choose a logo/.test(i.message));
  const needsPlayers = selected.some((id) => getProduct(id)!.orderUnit === "player");

  const missing = !logoId
    ? "Add your logo"
    : needsPlayers && players.length === 0 && !Object.values(sizeRun).some(Boolean)
      ? "Add your roster"
      : selected.length === 0
        ? "Pick your gear"
        : errors[0]
          ? "Fix: " + errors[0].message
          : null;

  async function onRoster(file: File | undefined) {
    if (!file) return;
    setRosterLoading(true);
    setRosterFile(file);
    setUseSizes(false);
    const fd = new FormData();
    fd.set("file", file);
    try {
      const r = await previewRoster(fd);
      setNewPlayers(r.players.length ? r.players : null);
      setRosterProblems(r.problems);
      if (!r.players.length) setRosterFile(null);
    } finally {
      setRosterLoading(false);
    }
  }

  function onLogo(file: File | undefined) {
    if (!file) return;
    setLogoFile(file);
    setLogoUrl(URL.createObjectURL(file));
  }

  function submit(form: HTMLFormElement) {
    const fd = new FormData(form);
    if (logoFile) fd.set("logo", logoFile);
    if (rosterFile && !useSizes && !manual) fd.set("roster", rosterFile);
    if (orgId) fd.set("orgId", orgId);
    fd.set(
      "payload",
      JSON.stringify({
        productIds: selected,
        color,
        personalize: personalize && hasNames,
        existingLogoId: logoFile ? null : savedLogoId,
        existingTeamId: useSizes || (manual ? !editingTeam : rosterFile) ? null : teamId,
        manualRoster: manual && !useSizes ? manualPlayers.map((p) => ({ name: p.name, number: p.number, size: p.size })) : null,
        teamName: teamName || savedTeam?.name || orgName || "",
        sport: "BASEBALL",
        sizeRun: useSizes ? sizeRun : {},
        teamQty,
      }),
    );
    startTransition(() => formAction(fd));
  }

  function toggle(id: string) {
    setFocus(id);
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  const focusProduct = getProduct(focus)!;
  const focusConfig = lines.find((l) => l.key === focus)?.config;
  const sample = players.find((p) => p.name || p.number);
  const payLabel = pending ? "Opening checkout…" : missing ?? `Pay ${formatMoney(price.totalCents)}`;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
      className="mx-auto grid max-w-7xl gap-8 px-5 pb-36 pt-10 lg:grid-cols-[1fr_400px] lg:pb-16"
    >
      <div className="min-w-0 space-y-5">
        <div>
          <h1 className="font-display text-5xl sm:text-6xl">Order your team&apos;s gear</h1>
          <p className="mt-2 text-lg text-slate-500">Drop your logo and roster. We&apos;ll put them on everything.</p>
        </div>

        {/* 1. Logo */}
        <Step n={1} title="Your logo" done={!!logoId}>
          {logoFile ? (
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl!} alt="Your logo" className="h-20 w-20 rounded-2xl bg-surface object-contain p-2 ring-1 ring-slate-200" />
              <div>
                <p className="font-semibold">{logoFile.name}</p>
                <button type="button" className="text-sm font-medium text-slate-500 underline hover:text-slate-900" onClick={() => { setLogoFile(null); setLogoUrl(null); }}>Change</button>
              </div>
            </div>
          ) : logos.length > 0 ? (
            <div className="flex flex-wrap items-center gap-3">
              {logos.map((l) => (
                <button type="button" key={l.id} onClick={() => setSavedLogoId(l.id)} aria-label={`Use ${l.name}`} aria-pressed={savedLogoId === l.id}
                  className={cx("grid h-20 w-20 place-items-center rounded-2xl bg-surface p-2 transition", savedLogoId === l.id ? "ring-2 ring-accent-500" : "ring-1 ring-slate-200 hover:ring-slate-400")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.url} alt={l.name} className="max-h-full max-w-full object-contain" />
                </button>
              ))}
              <DropZone small accept=".svg,.png,.jpg,.jpeg" label="+ New logo" onFile={onLogo} />
            </div>
          ) : (
            <DropZone accept=".svg,.png,.jpg,.jpeg" label="Drop your logo here" hint="or tap to choose · PNG, JPG or SVG · saved for every future order" onFile={onLogo} />
          )}
        </Step>

        {/* 2. Roster */}
        <Step n={2} title="Your roster" done={players.length > 0 || (useSizes && Object.values(sizeRun).some(Boolean))} optional={!needsPlayers}>
          {manual && !useSizes ? (
            <ManualRoster
              rows={manual}
              onChange={setManual}
              onDone={() => { setManual(null); setEditingTeam(false); }}
              teamName={!editingTeam ? teamName : null}
              onTeamName={setTeamName}
            />
          ) : useSizes ? (
            <div>
              <p className="mb-2 text-sm text-slate-600">How many of each size?</p>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                {ADULT_SIZES.map((s) => (
                  <label key={s} className="text-center text-xs font-semibold text-slate-500">
                    {s}
                    <input type="number" min={0} inputMode="numeric" placeholder="0" value={sizeRun[s] || ""}
                      onChange={(e) => setSizeRun({ ...sizeRun, [s]: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                      className="mt-1 !px-1 !py-2 text-center" />
                  </label>
                ))}
              </div>
              <button type="button" className="mt-3 text-sm font-medium text-slate-500 underline hover:text-slate-900" onClick={() => setUseSizes(false)}>Use a roster spreadsheet instead</button>
            </div>
          ) : players.length > 0 ? (
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">✓ {players.length} players{newPlayers ? "" : ` · ${savedTeam?.name}`}</span>
                {teams.filter((t) => t.roster.length).length > 1 && !newPlayers && (
                  <select value={teamId ?? ""} onChange={(e) => setTeamId(e.target.value)} className="!w-auto !rounded-full !py-1.5" aria-label="Team">
                    {teams.filter((t) => t.roster.length).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                )}
                <button type="button" className="text-sm font-medium text-slate-500 underline hover:text-slate-900"
                  onClick={() => { setManual(players.map(fromPlayer)); setEditingTeam(!newPlayers && !!savedTeam); }}>
                  Edit players
                </button>
                <DropZone inline accept=".csv,.xlsx,.tsv,.txt" label="Upload a different roster" onFile={onRoster} />
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Sizes: {sizeBreakdown(getProduct("jersey-full-button")!, buildLineItems(getProduct("jersey-full-button")!, lineConfigSchema.parse({ color: "navy" }), players)).map(([s, q]) => `${s}×${q}`).join(" · ")}
              </p>
              {rosterProblems.length > 0 && <p className="mt-1 text-sm text-amber-700">Check: {rosterProblems.slice(0, 3).join(" ")}</p>}
              {savedTeam && !newPlayers && (
                <p className="mt-1 text-sm text-slate-500">
                  Still waiting on sizes? <Link href={`/app/teams/${savedTeam.id}`} className="font-semibold text-accent-600 underline">Send your team a size link</Link> and players fill them in themselves.
                </p>
              )}
              {newPlayers && !savedTeam && (
                <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Team name (optional) — e.g. Varsity" className="mt-3 sm:!w-80" aria-label="Team name" />
              )}
            </div>
          ) : (
            <>
              <DropZone accept=".csv,.xlsx,.tsv,.txt" label={rosterLoading ? "Reading your roster…" : "Drop your roster spreadsheet"}
                hint={<>Excel or CSV with names, numbers & sizes — any column names work · <a href="/samples/roster-template.csv" download className="underline" onClick={(e) => e.stopPropagation()}>template</a></>}
                onFile={onRoster} />
              {rosterProblems.length > 0 && <p className="mt-2 text-sm text-red-600">{rosterProblems.join(" ")}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                <button type="button" className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-200"
                  onClick={() => { setManual(Array.from({ length: 5 }, emptyRow)); setEditingTeam(false); }}>
                  ✎ Type in players instead
                </button>
                <button type="button" className="text-sm font-medium text-slate-500 underline hover:text-slate-900" onClick={() => setUseSizes(true)}>Just enter quantities by size</button>
              </div>
            </>
          )}
          {needsPlayers && <SizeChart className="mt-4" />}
        </Step>

        {/* 3. Gear */}
        <Step n={3} title="Pick your gear" done={selected.length > 0}>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {GROUPS.map((g) => {
              const count = selected.filter((id) => getProduct(id)!.group === g.id).length;
              return (
                <button type="button" key={g.id} onClick={() => setTab(g.id)}
                  className={cx("whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition", tab === g.id ? "bg-brand-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
                  {g.label}{count > 0 && <span className={cx("ml-1.5 rounded-full px-1.5 text-xs", tab === g.id ? "bg-accent-500" : "bg-surface text-slate-900")}>{count}</span>}
                </button>
              );
            })}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {OPTIONS.filter((p) => p.group === tab).map((p) => (
              <GearTile key={p.id} product={p} on={selected.includes(p.id)} onToggle={() => toggle(p.id)} color={color} logoId={logoId} logoUrls={logoUrls}
                priced={price.lines.find((l) => l.key === p.id)}
                qty={teamQty[p.id] ?? p.defaultTeamQty ?? p.minQty}
                onQty={(q) => setTeamQty({ ...teamQty, [p.id]: q })} />
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm font-semibold text-slate-700">Team color</span>
            {COLORS.map((c) => (
              <button key={c.id} type="button" title={c.name} aria-label={c.name} aria-pressed={color === c.id} onClick={() => setColor(c.id)}
                className={cx("h-8 w-8 rounded-full ring-offset-2 transition", color === c.id ? "ring-2 ring-accent-500" : "ring-1 ring-black/10 hover:scale-110")} style={{ background: c.hex }} />
            ))}
          </div>
          {hasNames && (
            <label className="mt-4 flex items-center gap-2 text-sm font-normal text-slate-700">
              <input type="checkbox" checked={personalize} onChange={(e) => setPersonalize(e.target.checked)} />
              Player names &amp; numbers on jerseys, numbers on helmets (from your roster)
            </label>
          )}
        </Step>

        {/* 4. Account (new coaches only) */}
        {!signedIn && (
          <Step n={4} title="Where should we send your proof?" done={false}>
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="name" placeholder="Your name" autoComplete="name" required aria-label="Your name" />
              <input name="email" type="email" placeholder="Email" autoComplete="email" required aria-label="Email" />
              <input name="orgName" placeholder="School or organization" required aria-label="School or organization" />
              <input name="password" type="password" placeholder="Create a password" autoComplete="new-password" minLength={8} required aria-label="Create a password" />
              <select name="orgType" defaultValue="HIGH_SCHOOL" aria-label="Organization type" className="sm:col-span-2">
                {Object.entries(ORG_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <p className="mt-3 text-xs text-slate-500">Ordered before? <Link href="/login?next=/order" className="font-semibold underline">Sign in</Link> and your logo & roster fill in automatically.</p>
          </Step>
        )}
        <p className="text-center text-xs text-slate-400">
          You approve a production proof before anything is made. Multiple teams, custom placements or a purchase order?{" "}
          <Link href={signedIn ? "/app" : "/signup"} className="underline">Use the full order builder</Link>.
        </p>
      </div>

      {/* Order summary (desktop) */}
      <aside className="hidden lg:block">
        <div className="sticky top-24 overflow-hidden rounded-3xl bg-surface ring-1 ring-slate-200/80 shadow-xl shadow-black/40">
          <div className="studio px-8 pb-4 pt-6">
            <ProductPreview product={focusProduct} colorId={focusConfig?.color ?? pickColor(focusProduct, color)} decorations={focusConfig?.decorations ?? []} logoUrls={logoUrls}
              names={focusConfig?.names} numbers={focusConfig?.numbers} sampleName={sample?.name.split(" ").at(-1) || undefined} sampleNumber={sample?.number || undefined} />
            <p className="mt-1 text-center text-sm font-semibold">{focusProduct.name}</p>
          </div>
          <div className="p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Your order</p>
            <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto text-sm">
              {price.lines.map((l) => {
                const p = getProduct(l.productId)!;
                return (
                  <li key={l.key}>
                    <button type="button" onClick={() => setFocus(l.key)} className="flex w-full justify-between gap-3 text-left hover:text-accent-600">
                      <span className="text-slate-600">{l.quantity ? `${l.quantity} × ` : ""}{l.productName}</span>
                      <span className={l.quantity ? "font-semibold" : "text-slate-400"}>{l.quantity ? formatMoney(l.lineTotalCents) : `from ${formatMoney(lowestUnitCents(p) ?? 0)}`}</span>
                    </button>
                  </li>
                );
              })}
              {price.totalQuantity === 0 && selected.length > 0 && <li className="pt-1 text-xs text-slate-400">Add your roster to see your exact total.</li>}
              {price.setupFees.filter((f) => f.cents > 0).map((f) => (
                <li key={f.logoId + f.method} className="flex justify-between gap-3"><span className="text-slate-600">{f.methodLabel} setup (one time)</span><span className="font-semibold">{formatMoney(f.cents)}</span></li>
              ))}
              {price.totalQuantity > 0 && (
                <li className="flex justify-between gap-3"><span className="text-slate-600">Shipping</span><span className="font-semibold">{price.shippingCents ? formatMoney(price.shippingCents) : "Free"}</span></li>
              )}
            </ul>
            <div className="mt-4 flex items-baseline justify-between border-t border-slate-100 pt-4">
              <span className="font-semibold">Total</span>
              <span className="font-display text-4xl">{formatMoney(price.totalCents)}</span>
            </div>
            <p className="text-right text-xs text-slate-400">+ sales tax unless tax-exempt</p>
            {(perPlayer || arrival) && (
              <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                {perPlayer && (
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="font-display text-2xl text-accent-600">{formatMoney(perPlayer)}</p>
                    <p className="text-[11px] text-slate-500">per player · {headcount} players</p>
                  </div>
                )}
                {arrival && (
                  <div className={`rounded-xl bg-slate-50 px-3 py-2 ${perPlayer ? "" : "col-span-2"}`}>
                    <p className="font-display text-2xl">{formatDateRange(arrival)}</p>
                    <p className="text-[11px] text-slate-500">estimated arrival if ordered today</p>
                  </div>
                )}
              </div>
            )}
            <button type="submit" disabled={!!missing || pending}
              className="mt-5 w-full rounded-full bg-accent-500 px-6 py-4 text-base font-bold text-black shadow-[0_8px_24px_-8px_rgba(43,255,136,.7)] transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none">
              {payLabel}{!missing && !pending && " →"}
            </button>
            {state.error && <p role="alert" className="mt-2 text-sm text-red-600">{state.error}</p>}
            <p className="mt-3 text-center text-xs text-slate-400">Secure checkout by Shopify</p>
          </div>
        </div>
      </aside>

      {/* Pay bar (phones & tablets) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-surface/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-3">
          <div>
            <p className="font-display text-3xl">{formatMoney(price.totalCents)}</p>
            <p className="text-xs text-slate-500">
              {perPlayer ? `${formatMoney(perPlayer)}/player` : `${price.totalQuantity} items`}{arrival ? ` · arrives ~${formatDateRange(arrival).split(" – ")[1]}` : " · + tax"}
            </p>
          </div>
          <div className="text-right">
            <button type="submit" disabled={!!missing || pending}
              className="rounded-full bg-accent-500 px-6 py-3 text-sm font-bold text-black transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">
              {payLabel}
            </button>
            {state.error && <p role="alert" className="mt-1 max-w-xs text-xs text-red-600">{state.error}</p>}
          </div>
        </div>
      </div>
    </form>
  );
}

function Step({ n, title, done, optional, children }: { n: number; title: string; done: boolean; optional?: boolean; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-surface p-6 ring-1 ring-slate-200/80 sm:p-7">
      <h2 className="mb-4 flex items-center gap-3 text-lg font-bold">
        <span className={cx("grid h-8 w-8 place-items-center rounded-full text-sm font-bold transition", done ? "bg-accent-500 text-black" : "bg-slate-200 text-slate-900")}>{done ? "✓" : n}</span>
        {title}
        {optional && <span className="text-sm font-normal text-slate-400">optional</span>}
      </h2>
      {children}
    </section>
  );
}

function DropZone({ label, hint, accept, onFile, small, inline }: { label: string; hint?: React.ReactNode; accept: string; onFile: (f: File | undefined) => void; small?: boolean; inline?: boolean }) {
  const [over, setOver] = useState(false);
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files[0]); }}
      className={cx(
        "flex cursor-pointer flex-col items-center justify-center text-center transition",
        inline ? "rounded-full px-3 py-1 text-sm font-medium text-slate-500 underline hover:text-slate-900"
          : cx("rounded-2xl border-2 border-dashed", small ? "h-20 px-4 text-sm" : "px-6 py-12", over ? "border-accent-500 bg-accent-500/5" : "border-slate-200 bg-slate-50/60 hover:border-slate-400 hover:bg-surface"),
      )}
    >
      <input type="file" accept={accept} className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
      {!inline && !small && <span className="mb-2 grid h-11 w-11 place-items-center rounded-full bg-surface text-xl shadow-sm ring-1 ring-slate-200">↑</span>}
      <span className={cx(!inline && "font-semibold text-slate-900", !small && !inline && "text-base")}>{label}</span>
      {hint && <span className="mt-1 text-xs font-normal text-slate-500">{hint}</span>}
    </label>
  );
}

function GearTile({ product, on, onToggle, color, logoId, logoUrls, priced, qty, onQty }: {
  product: Product; on: boolean; onToggle: () => void; color: string; logoId: string | null; logoUrls: Record<string, string>;
  priced?: { effectiveUnitCents: number; quantity: number }; qty: number; onQty: (q: number) => void;
}) {
  const loc = product.locations[0];
  const low = lowestUnitCents(product);
  const team = product.orderUnit === "team";
  // If the team color isn't offered for this item, say so instead of silently switching.
  // (Skip print-color items like eye black, whose color is the ink, not the item.)
  const shown = pickColor(product, color);
  const fallback = shown !== color && product.photo?.recolor !== false ? product.colors.find((c) => c.id === shown)?.name : null;
  const wanted = getProduct("jersey-full-button")!.colors.find((c) => c.id === color)?.name;
  return (
    <div className={cx("relative overflow-hidden rounded-2xl transition", on ? "bg-surface ring-2 ring-accent-500" : "bg-surface ring-1 ring-slate-200 hover:ring-slate-400")}>
      <button type="button" onClick={onToggle} aria-pressed={on} className="block w-full text-left">
        <div className="studio p-3">
          <ProductPreview product={product} colorId={shown} single decorations={logoId && loc ? [{ location: loc.id, logoId }] : []} logoUrls={logoUrls}
            className="mx-auto w-[88%]" />
        </div>
        <span className={cx("absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full text-sm font-bold transition", on ? "bg-accent-500 text-black" : "bg-surface text-slate-400 ring-1 ring-slate-200")}>{on ? "✓" : "+"}</span>
        <span className="block px-3 pt-2 text-sm font-semibold leading-tight">{product.name}</span>
        {fallback && <span className="block px-3 pt-1 text-xs text-amber-700">Shown in {fallback} · not offered in {wanted}</span>}
        <span className="block px-3 pb-3 text-xs text-slate-500">
          {on && priced?.quantity ? `${formatMoney(priced.effectiveUnitCents)} ${product.unitLabel ? "/ " + product.unitLabel : "each"}` : `from ${formatMoney(low ?? 0)} · min ${product.minQty}`}
        </span>
      </button>
      {on && team && (
        <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
          <button type="button" aria-label="Fewer" onClick={() => onQty(Math.max(product.minQty, qty - (product.minQty >= 12 ? 12 : 1)))} className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 font-bold hover:bg-slate-200">–</button>
          <span className="text-sm font-semibold">{qty} {product.unitLabel}s</span>
          <button type="button" aria-label="More" onClick={() => onQty(qty + (product.minQty >= 12 ? 12 : 1))} className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 font-bold hover:bg-slate-200">+</button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Type-in roster
// ---------------------------------------------------------------------------

interface ManualRow { name: string; number: string; size: string }
const emptyRow = (): ManualRow => ({ name: "", number: "", size: "" });
const toPlayer = (r: ManualRow): RosterPlayerLike => ({
  name: r.name.trim(),
  number: r.number.trim() || null,
  size: r.size || null,
  topSize: null,
  bottomSize: null,
  hatSize: null,
});
const fromPlayer = (p: RosterPlayerLike): ManualRow => ({ name: p.name, number: p.number ?? "", size: p.size || p.topSize || "" });

function ManualRoster({ rows, onChange, onDone, teamName, onTeamName }: {
  rows: ManualRow[];
  onChange: (rows: ManualRow[]) => void;
  onDone: () => void;
  teamName: string | null;
  onTeamName: (v: string) => void;
}) {
  const set = (i: number, patch: Partial<ManualRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const filled = rows.filter((r) => r.name.trim() || r.number.trim() || r.size);
  const missingSize = filled.filter((r) => !r.size).length;

  // Enter moves down a row (and adds one at the end) instead of submitting the order.
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>, i: number, field: keyof ManualRow) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (i === rows.length - 1) onChange([...rows, emptyRow()]);
    setTimeout(() => document.getElementById(`mr-${i + 1}-${field}`)?.focus(), 0);
  }

  // Pasting several rows copied from Excel or Google Sheets fills the table.
  function onPaste(e: React.ClipboardEvent<HTMLInputElement>, i: number) {
    const text = e.clipboardData.getData("text");
    if (!/\n/.test(text.trim())) return;
    e.preventDefault();
    const pasted = text.trim().split(/\r?\n/).map((line) => {
      const cells = line.split(/\t|,/).map((c) => c.trim());
      const [name = "", number = "", size = ""] = cells;
      return { name, number: number.replace(/^#/, "").slice(0, 3), size: normalizeSize(size) ?? "" };
    }).filter((r) => r.name || r.number || r.size);
    const next = [...rows.slice(0, i), ...pasted, ...rows.slice(i).filter((r) => r.name || r.number || r.size)];
    onChange(next.length ? next : [emptyRow()]);
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              <th className="w-8 pb-2" />
              <th className="pb-2">Name</th>
              <th className="w-20 pb-2">#</th>
              <th className="w-28 pb-2">Size</th>
              <th className="w-8 pb-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const needsSize = (r.name.trim() || r.number.trim()) && !r.size;
              return (
                <tr key={i}>
                  <td className="pr-2 text-xs text-slate-400 tabular-nums">{i + 1}</td>
                  <td className="py-1 pr-2">
                    <input id={`mr-${i}-name`} value={r.name} placeholder={i === 0 ? "Mason Rivera" : ""} aria-label={`Player ${i + 1} name`}
                      onChange={(e) => set(i, { name: e.target.value })} onKeyDown={(e) => onKeyDown(e, i, "name")} onPaste={(e) => onPaste(e, i)} className="!py-2" />
                  </td>
                  <td className="py-1 pr-2">
                    <input id={`mr-${i}-number`} value={r.number} placeholder={i === 0 ? "12" : ""} inputMode="numeric" maxLength={3} aria-label={`Player ${i + 1} number`}
                      onChange={(e) => set(i, { number: e.target.value.replace(/[^0-9]/g, "") })} onKeyDown={(e) => onKeyDown(e, i, "number")} className="!py-2 text-center" />
                  </td>
                  <td className="py-1 pr-2">
                    <select id={`mr-${i}-size`} value={r.size} aria-label={`Player ${i + 1} size`} onChange={(e) => set(i, { size: e.target.value })}
                      onKeyDown={(e) => onKeyDown(e, i, "size")} className={cx("!py-2", needsSize && "!border-amber-500")}>
                      <option value="">Size</option>
                      {ADULT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="py-1 text-center">
                    <button type="button" aria-label={`Remove player ${i + 1}`} onClick={() => onChange(rows.length > 1 ? rows.filter((_, j) => j !== i) : [emptyRow()])}
                      className="text-slate-400 hover:text-red-600">✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <button type="button" onClick={() => onChange([...rows, emptyRow()])} className="font-semibold text-accent-500 hover:text-accent-400">+ Add player</button>
        <button type="button" onClick={() => onChange([...rows, ...Array.from({ length: 5 }, emptyRow)])} className="font-medium text-slate-500 hover:text-slate-900">+ 5 more rows</button>
        <span className="text-slate-400">{filled.length} {filled.length === 1 ? "player" : "players"}{missingSize ? ` · ${missingSize} missing a size` : ""}</span>
        <button type="button" onClick={onDone} className="ml-auto font-medium text-slate-500 underline hover:text-slate-900">Use a spreadsheet instead</button>
      </div>
      <p className="mt-2 text-xs text-slate-500">Size is the player&apos;s shirt size. Caps, helmets, gloves, belts and socks are sized from it automatically. Tip: paste rows straight from Excel.</p>
      {teamName !== null && (
        <input value={teamName} onChange={(e) => onTeamName(e.target.value)} placeholder="Team name (optional) — e.g. Varsity" className="mt-3 sm:!w-80" aria-label="Team name" />
      )}
    </div>
  );
}
