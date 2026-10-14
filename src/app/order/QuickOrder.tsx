"use client";
// One-screen ordering: drop logo, drop roster, (pick products), pay.
import Link from "next/link";
import { useActionState, useMemo, useState, useTransition } from "react";
import { CATALOG, UNIFORM_KIT_PRODUCT_IDS, getProduct, type Product } from "@/lib/catalog";
import { ORG_TYPES, formatMoney, lineConfigSchema } from "@/lib/domain";
import { priceOrder } from "@/lib/pricing";
import { buildLineItems, sizeBreakdown, type RosterPlayerLike } from "@/lib/roster";
import { placeQuickOrder, previewRoster } from "@/lib/actions/quick";
import { ProductPreview } from "@/components/ProductPreview";
import { cx } from "@/components/ui";

interface Props {
  signedIn: boolean;
  orgId: string | null;
  orgName: string | null;
  logos: { id: string; name: string; url: string }[];
  teams: { id: string; name: string; roster: RosterPlayerLike[] }[];
  setupsPaid: Record<string, string[]>;
}

const COLORS = CATALOG.products.find((p) => p.id === "jersey-full-button")!.colors;
const OPTIONS = CATALOG.products.filter((p) => p.pricing.status === "VERIFIED");
const ADULT_SIZES = ["YS", "YM", "YL", "YXL", "S", "M", "L", "XL", "2XL", "3XL"];
const NEW_LOGO = "new-logo";

export function QuickOrder({ signedIn, orgId, orgName, logos, teams, setupsPaid }: Props) {
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
  const [sizeRun, setSizeRun] = useState<Record<string, number>>({});
  const [teamName, setTeamName] = useState("");

  const [selected, setSelected] = useState<string[]>(UNIFORM_KIT_PRODUCT_IDS);
  const [color, setColor] = useState("navy");
  const [personalize, setPersonalize] = useState(true);

  const [state, formAction] = useActionState(placeQuickOrder, {});
  const [pending, startTransition] = useTransition();

  const savedTeam = teams.find((t) => t.id === teamId) ?? null;
  const players: RosterPlayerLike[] = useSizes ? [] : newPlayers ?? savedTeam?.roster ?? [];
  const hasNames = players.some((p) => p.name);
  const logoId = logoFile ? NEW_LOGO : savedLogoId;
  const logoUrls = useMemo(
    () => ({ ...Object.fromEntries(logos.map((l) => [l.id, l.url])), ...(logoUrl ? { [NEW_LOGO]: logoUrl } : {}) }),
    [logos, logoUrl],
  );

  // Same configuration the server will build, priced live.
  const lines = useMemo(
    () =>
      selected.map((id) => {
        const p = getProduct(id)!;
        const oneSize = p.sizeField === "none";
        const runTotal = Object.values(sizeRun).reduce((a, b) => a + b, 0);
        const config = lineConfigSchema.parse({
          color: p.colors.some((c) => c.id === color) ? color : p.colors.some((c) => c.id === "gray") ? "gray" : p.colors[0].id,
          decorations: logoId && p.locations[0] ? [{ location: p.locations[0].id, method: p.locations[0].methods[0], logoId }] : [],
          names: players.length > 0 && p.category === "JERSEY" && personalize && hasNames && !!p.personalization.names,
          numbers: players.length > 0 && p.category === "JERSEY" && personalize && !!p.personalization.numbers,
          sizing: players.length > 0 && !oneSize ? "ROSTER" : "SIZE_RUN",
          sizeRun: oneSize ? { [p.sizes[0]]: players.length || runTotal } : players.length ? {} : sizeRun,
        });
        return { key: id, productId: id, config, items: buildLineItems(p, config, players) };
      }),
    [selected, color, logoId, players, personalize, hasNames, sizeRun],
  );
  const price = useMemo(() => priceOrder({ lines, setupsPaid }), [lines, setupsPaid]);
  const errors = price.issues.filter((i) => i.level === "error" && !/Choose a logo/.test(i.message));

  const missing = !logoId
    ? "Add your logo"
    : players.length === 0 && price.totalQuantity === 0
      ? "Add your roster or sizes"
      : selected.length === 0
        ? "Pick a product"
        : errors[0]?.message ?? null;

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
    if (rosterFile && !useSizes) fd.set("roster", rosterFile);
    if (orgId) fd.set("orgId", orgId);
    fd.set(
      "payload",
      JSON.stringify({
        productIds: selected,
        color,
        personalize: personalize && hasNames,
        existingLogoId: logoFile ? null : savedLogoId,
        existingTeamId: rosterFile || useSizes ? null : teamId,
        teamName: teamName || savedTeam?.name || orgName || "",
        sport: "BASEBALL",
        sizeRun: useSizes ? sizeRun : {},
      }),
    );
    startTransition(() => formAction(fd));
  }

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
      className="mx-auto max-w-3xl space-y-5 px-4 pb-40 pt-8"
    >
      <div className="text-center">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Order your team&apos;s uniforms</h1>
        <p className="mt-2 text-slate-600">Drop your logo and roster. We&apos;ll do the rest.</p>
      </div>

      {/* 1. Logo */}
      <Step n={1} title="Your logo" done={!!logoId}>
        {logoId && !logoFile && logos.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            {logos.map((l) => (
              <button
                type="button"
                key={l.id}
                onClick={() => setSavedLogoId(l.id)}
                className={cx("grid h-20 w-20 place-items-center rounded-lg border-2 bg-white p-1", savedLogoId === l.id ? "border-brand-600 ring-2 ring-brand-100" : "border-slate-200")}
                aria-label={`Use ${l.name}`}
                aria-pressed={savedLogoId === l.id}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.url} alt={l.name} className="max-h-full max-w-full object-contain" />
              </button>
            ))}
            <DropZone small accept=".svg,.png,.jpg,.jpeg" label="+ New logo" onFile={onLogo} />
          </div>
        ) : logoFile ? (
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl!} alt="Your logo" className="h-20 w-20 rounded-lg border border-slate-200 bg-white object-contain p-1" />
            <span className="text-sm text-slate-600">{logoFile.name}</span>
            <button type="button" className="text-sm font-medium text-brand-600" onClick={() => { setLogoFile(null); setLogoUrl(null); }}>Change</button>
          </div>
        ) : (
          <DropZone accept=".svg,.png,.jpg,.jpeg" label="Drop your logo here, or tap to choose" hint="PNG, JPG or SVG. Saved for every future order." onFile={onLogo} />
        )}
      </Step>

      {/* 2. Roster */}
      <Step n={2} title="Your roster" done={players.length > 0 || (useSizes && price.totalQuantity > 0)}>
        {useSizes ? (
          <div>
            <p className="mb-2 text-sm text-slate-600">How many of each size?</p>
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
              {ADULT_SIZES.map((s) => (
                <label key={s} className="text-center text-xs font-medium text-slate-600">
                  {s}
                  <input
                    type="number" min={0} inputMode="numeric" placeholder="0" value={sizeRun[s] || ""}
                    onChange={(e) => setSizeRun({ ...sizeRun, [s]: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                    className="mt-0.5 !px-1 !py-1 text-center"
                  />
                </label>
              ))}
            </div>
            <button type="button" className="mt-2 text-sm font-medium text-brand-600" onClick={() => setUseSizes(false)}>Use a roster spreadsheet instead</button>
          </div>
        ) : players.length > 0 ? (
          <div className="text-sm">
            <p className="font-semibold text-emerald-700">✓ {players.length} players{newPlayers ? "" : ` from ${savedTeam?.name}`}</p>
            <p className="mt-1 text-slate-600">
              Sizes: {sizeBreakdown(getProduct("jersey-full-button")!, buildLineItems(getProduct("jersey-full-button")!, lineConfigSchema.parse({ color: "navy" }), players)).map(([s, q]) => `${s}×${q}`).join(", ")}
            </p>
            {rosterProblems.length > 0 && <p className="mt-1 text-amber-700">Check: {rosterProblems.slice(0, 3).join(" ")}</p>}
            <div className="mt-2 flex flex-wrap gap-4">
              {teams.length > 1 && !newPlayers && (
                <select value={teamId ?? ""} onChange={(e) => setTeamId(e.target.value)} className="!w-auto !py-1" aria-label="Team">
                  {teams.filter((t) => t.roster.length).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              )}
              <DropZone small accept=".csv,.xlsx,.tsv,.txt" label="Upload a different roster" onFile={onRoster} />
            </div>
            {newPlayers && !savedTeam && (
              <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Team name (optional), e.g. Varsity" className="mt-3 sm:!w-72" aria-label="Team name" />
            )}
          </div>
        ) : (
          <>
            <DropZone
              accept=".csv,.xlsx,.tsv,.txt"
              label={rosterLoading ? "Reading your roster…" : "Drop your roster spreadsheet here, or tap to choose"}
              hint={<>Excel or CSV with names, numbers and sizes. Any column names work. <a href="/samples/roster-template.csv" download className="underline" onClick={(e) => e.stopPropagation()}>Template</a></>}
              onFile={onRoster}
            />
            {rosterProblems.length > 0 && <p className="mt-2 text-sm text-red-700">{rosterProblems.join(" ")}</p>}
            <button type="button" className="mt-2 text-sm font-medium text-brand-600" onClick={() => setUseSizes(true)}>No roster? Just enter sizes</button>
          </>
        )}
      </Step>

      {/* 3. Products */}
      <Step n={3} title="What you need" done={selected.length > 0}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {OPTIONS.map((p) => (
            <ProductTile key={p.id} product={p} on={selected.includes(p.id)} onClick={() => toggle(p.id)} color={color} logoId={logoId} logoUrls={logoUrls}
              priced={price.lines.find((l) => l.key === p.id)} />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Team color:</span>
          {COLORS.map((c) => (
            <button key={c.id} type="button" title={c.name} aria-label={c.name} aria-pressed={color === c.id} onClick={() => setColor(c.id)}
              className={cx("h-8 w-8 rounded-full border-2", color === c.id ? "border-brand-600 ring-2 ring-brand-100" : "border-slate-300")} style={{ background: c.hex }} />
          ))}
        </div>
        {hasNames && selected.some((id) => getProduct(id)?.category === "JERSEY") && (
          <label className="mt-3 flex items-center gap-2 text-sm font-normal">
            <input type="checkbox" checked={personalize} onChange={(e) => setPersonalize(e.target.checked)} />
            Put player names &amp; numbers on the jerseys (from your roster)
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
          <p className="mt-2 text-xs text-slate-500">Already ordered with us? <Link href="/login?next=/order" className="font-medium underline">Sign in</Link> and your logo and roster fill in automatically.</p>
        </Step>
      )}

      <p className="text-center text-xs text-slate-500">
        You&apos;ll approve a proof before anything is made. Want more control (placements, multiple teams, PO / invoice)?{" "}
        <Link href={signedIn ? "/app" : "/signup"} className="underline">Use the full order builder</Link>.
      </p>

      {/* Sticky pay bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-2xl font-black leading-tight">{formatMoney(price.totalCents)}</p>
            <p className="text-xs text-slate-500">
              {price.totalQuantity} pieces{price.shippingCents === 0 && price.totalQuantity > 0 ? " · free shipping" : ""} · + tax
            </p>
          </div>
          <div className="text-right">
            <button
              type="submit"
              disabled={!!missing || pending}
              className="rounded-lg bg-accent-500 px-6 py-3 text-base font-bold text-white shadow-sm hover:bg-accent-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {pending ? "Opening checkout…" : missing ? missing : `Pay ${formatMoney(price.totalCents)} →`}
            </button>
            {state.error && <p role="alert" className="mt-1 max-w-xs text-xs text-red-700">{state.error}</p>}
          </div>
        </div>
      </div>
    </form>
  );
}

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 flex items-center gap-3 text-lg font-bold">
        <span className={cx("grid h-7 w-7 place-items-center rounded-full text-sm", done ? "bg-emerald-500 text-white" : "bg-brand-50 text-brand-700")}>{done ? "✓" : n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function DropZone({ label, hint, accept, onFile, small }: { label: string; hint?: React.ReactNode; accept: string; onFile: (f: File | undefined) => void; small?: boolean }) {
  const [over, setOver] = useState(false);
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files[0]); }}
      className={cx(
        "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition",
        small ? "h-20 px-4 text-sm" : "px-6 py-10",
        over ? "border-brand-600 bg-brand-50" : "border-slate-300 hover:border-brand-600 hover:bg-slate-50",
      )}
    >
      <input type="file" accept={accept} className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
      <span className={cx("font-semibold text-brand-700", !small && "text-base")}>{label}</span>
      {hint && <span className="mt-1 text-xs font-normal text-slate-500">{hint}</span>}
    </label>
  );
}

function ProductTile({ product, on, onClick, color, logoId, logoUrls, priced }: {
  product: Product; on: boolean; onClick: () => void; color: string; logoId: string | null; logoUrls: Record<string, string>;
  priced?: { effectiveUnitCents: number; quantity: number };
}) {
  const c = product.colors.some((x) => x.id === color) ? color : product.colors.some((x) => x.id === "gray") ? "gray" : product.colors[0].id;
  const loc = product.locations[0];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cx("relative rounded-xl border-2 p-2 text-left transition", on ? "border-brand-600 bg-brand-50/60" : "border-slate-200 opacity-70 hover:opacity-100")}
    >
      <span className={cx("absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full text-xs font-bold", on ? "bg-brand-600 text-white" : "border-2 border-slate-300 bg-white")}>{on ? "✓" : ""}</span>
      <ProductPreview product={product} colorId={c} decorations={logoId && loc ? [{ location: loc.id, logoId }] : []} logoUrls={logoUrls} className="[&_figcaption]:hidden [&>figure:nth-child(2)]:hidden" />
      <span className="mt-1 block text-sm font-semibold leading-tight">{product.name}</span>
      <span className="block text-xs text-slate-500">
        {on && priced?.quantity ? `${formatMoney(priced.effectiveUnitCents)} each` : `min ${product.minQty}`}
      </span>
    </button>
  );
}
