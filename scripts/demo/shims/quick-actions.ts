// Browser-only stand-ins for the order page's server actions.
import { parseCsv, parseRosterTable, type RosterRow } from "@/lib/roster";

export let lastRoster: RosterRow[] = [];
export let lastPayload: { productIds: string[]; color: string; personalize: boolean; sizeRun: Record<string, number>; teamQty: Record<string, number> } | null = null;
export let onPlaced: (() => void) | null = null;
export const setOnPlaced = (fn: () => void) => { onPlaced = fn; };

export async function previewRoster(fd: FormData): Promise<{ players: RosterRow[]; problems: string[] }> {
  const file = fd.get("file") as File;
  if (!/\.(csv|tsv|txt)$/i.test(file.name)) return { players: [], problems: ["In this preview, use a CSV file (Excel files work on the live site)."] };
  const r = parseRosterTable(parseCsv(await file.text()));
  lastRoster = r.players;
  return { players: r.players, problems: r.problems };
}

export async function placeQuickOrder(_prev: unknown, fd: FormData) {
  lastPayload = JSON.parse(String(fd.get("payload")));
  const typed = (lastPayload as { manualRoster?: { name: string; number: string | null; size: string | null }[] | null }).manualRoster;
  if (typed?.length) lastRoster = typed.map((p) => ({ name: p.name, number: p.number, size: p.size, topSize: null, bottomSize: null, hatSize: null }));
  onPlaced?.();
  return {};
}

export async function reorderAndPay() {}
