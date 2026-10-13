// Roster import + turning a roster into order line items. Pure functions;
// spreadsheet file reading lives in roster-file.ts (server only).

import type { Product } from "./catalog";
import type { LineConfig } from "./domain";
import type { PricedItem } from "./pricing";

export interface RosterRow {
  name: string;
  number: string | null;
  size: string | null;
  topSize: string | null;
  bottomSize: string | null;
  hatSize: string | null;
}

export interface RosterParseResult {
  players: RosterRow[];
  /** Human-readable problems the coach should fix (row numbers are 1-based, as in Excel). */
  problems: string[];
  /** Which spreadsheet column each field was read from. */
  columns: Partial<Record<keyof RosterRow | "firstName" | "lastName" | "quantity", string>>;
}

type Field = keyof RosterRow | "firstName" | "lastName" | "quantity";

const HEADER_ALIASES: Record<Field, string[]> = {
  name: ["name", "player", "player name", "full name", "athlete", "athlete name", "jersey name", "name on jersey", "back name"],
  firstName: ["first", "first name", "firstname", "given name"],
  lastName: ["last", "last name", "lastname", "surname", "family name"],
  number: ["number", "#", "no", "no.", "num", "jersey", "jersey #", "jersey number", "jersey no", "uniform number", "player number"],
  size: ["size", "shirt size", "apparel size", "uniform size", "t-shirt size", "tshirt size"],
  topSize: ["jersey size", "top size", "top", "shirt"],
  bottomSize: ["pant size", "pants size", "pant", "pants", "bottom size", "bottoms size", "short size", "shorts size"],
  hatSize: ["hat size", "hat", "cap size", "cap", "helmet/hat size"],
  quantity: ["qty", "quantity", "count"],
};

const normalizeHeader = (h: string) => h.toLowerCase().replace(/[_\-]+/g, " ").replace(/\s+/g, " ").trim();

export function detectColumns(headers: string[]): Map<Field, number> {
  const found = new Map<Field, number>();
  const norm = headers.map(normalizeHeader);
  // Exact alias matches first, in priority order (more specific fields first).
  const order: Field[] = ["firstName", "lastName", "topSize", "bottomSize", "hatSize", "number", "name", "size", "quantity"];
  for (const field of order) {
    const idx = norm.findIndex((h, i) => HEADER_ALIASES[field].includes(h) && ![...found.values()].includes(i));
    if (idx >= 0) found.set(field, idx);
  }
  return found;
}

const SIZE_ALIASES: Record<string, string> = {
  "youth small": "YS", "youth s": "YS", "y small": "YS", "ys": "YS", "y s": "YS", "yxs": "YS",
  "youth medium": "YM", "youth m": "YM", "y medium": "YM", "ym": "YM", "y m": "YM",
  "youth large": "YL", "youth l": "YL", "y large": "YL", "yl": "YL", "y l": "YL",
  "youth xl": "YXL", "youth x large": "YXL", "youth extra large": "YXL", "yxl": "YXL", "y xl": "YXL",
  "adult small": "S", "small": "S", "sm": "S", "s": "S", "as": "S",
  "adult medium": "M", "medium": "M", "med": "M", "m": "M", "am": "M",
  "adult large": "L", "large": "L", "lg": "L", "l": "L", "al": "L",
  "adult xl": "XL", "x large": "XL", "extra large": "XL", "xl": "XL", "axl": "XL", "adult x large": "XL",
  "2xl": "2XL", "xxl": "2XL", "2x": "2XL", "adult 2xl": "2XL", "adult xxl": "2XL", "xx large": "2XL",
  "3xl": "3XL", "xxxl": "3XL", "3x": "3XL", "adult 3xl": "3XL", "adult xxxl": "3XL",
  "xs/s": "XS/S", "xs s": "XS/S", "s/m": "S/M", "s m": "S/M", "m/l": "M/L", "m l": "M/L", "l/xl": "L/XL", "l xl": "L/XL",
  "os": "OS", "osfa": "OS", "one size": "OS",
};

export function normalizeSize(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).toLowerCase().replace(/[-_.]+/g, " ").replace(/\s+/g, " ").trim();
  if (!s) return null;
  if (SIZE_ALIASES[s]) return SIZE_ALIASES[s];
  const compact = s.replace(/\s+/g, "");
  if (SIZE_ALIASES[compact]) return SIZE_ALIASES[compact];
  return String(raw).trim().toUpperCase();
}

/** Best-guess stretch-fit cap size from a player's apparel size. */
export function hatSizeFromApparel(size: string | null): string | null {
  if (!size) return null;
  const map: Record<string, string> = {
    YS: "XS/S", YM: "XS/S", YL: "S/M", YXL: "S/M",
    S: "S/M", M: "M/L", L: "M/L", XL: "L/XL", "2XL": "L/XL", "3XL": "L/XL",
  };
  return map[size] ?? null;
}

const cell = (row: unknown[], idx: number | undefined) =>
  idx === undefined ? "" : String(row[idx] ?? "").trim();

/**
 * Parse a table (first row = headers) into roster players. Rows with a
 * quantity > 1 are expanded into that many unnamed players of that size,
 * which supports simple "size run" spreadsheets too.
 */
export function parseRosterTable(table: unknown[][]): RosterParseResult {
  const problems: string[] = [];
  const nonEmpty = table.filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
  if (nonEmpty.length === 0) return { players: [], problems: ["The file is empty."], columns: {} };

  const headers = nonEmpty[0].map((h) => String(h ?? ""));
  const cols = detectColumns(headers);
  const columns: RosterParseResult["columns"] = {};
  for (const [field, idx] of cols) columns[field] = headers[idx];

  const hasName = cols.has("name") || cols.has("firstName") || cols.has("lastName");
  const hasSize = cols.has("size") || cols.has("topSize") || cols.has("bottomSize") || cols.has("hatSize");
  if (!hasName && !cols.has("number") && !hasSize) {
    return {
      players: [],
      problems: [
        `We couldn't find roster columns. Use headers like "Name", "Number", "Size" (optional: "Pant Size", "Hat Size"). Found: ${headers.join(", ")}`,
      ],
      columns,
    };
  }

  const players: RosterRow[] = [];
  nonEmpty.slice(1).forEach((row, i) => {
    const rowNum = i + 2;
    const name =
      cell(row, cols.get("name")) ||
      [cell(row, cols.get("firstName")), cell(row, cols.get("lastName"))].filter(Boolean).join(" ");
    let number: string | null = cell(row, cols.get("number")).replace(/^#/, "") || null;
    if (number && !/^\d{1,3}$/.test(number)) {
      problems.push(`Row ${rowNum}: number "${number}" should be 0–999.`);
      number = number.slice(0, 3);
    }
    const size = normalizeSize(cell(row, cols.get("size")));
    const topSize = normalizeSize(cell(row, cols.get("topSize")));
    const bottomSize = normalizeSize(cell(row, cols.get("bottomSize")));
    const hatSize = normalizeSize(cell(row, cols.get("hatSize")));
    if (!size && !topSize && !bottomSize && !hatSize) problems.push(`Row ${rowNum}${name ? ` (${name})` : ""}: no size.`);

    const qtyRaw = cell(row, cols.get("quantity"));
    const qty = qtyRaw ? Math.max(0, Math.floor(Number(qtyRaw))) : 1;
    if (qtyRaw && !Number.isFinite(Number(qtyRaw))) problems.push(`Row ${rowNum}: quantity "${qtyRaw}" isn't a number.`);
    const copies = Number.isFinite(qty) ? Math.min(qty, 500) : 1;
    for (let c = 0; c < copies; c++)
      players.push({ name: copies > 1 ? "" : name, number: copies > 1 ? null : number, size, topSize, bottomSize, hatSize });
  });

  const numbers = players.map((p) => p.number).filter(Boolean) as string[];
  const dupes = [...new Set(numbers.filter((n, i) => numbers.indexOf(n) !== i))];
  if (dupes.length) problems.push(`Duplicate jersey numbers: ${dupes.join(", ")}.`);
  if (players.length > 1000) problems.push("Rosters are limited to 1,000 players per team.");

  return { players: players.slice(0, 1000), problems, columns };
}

/** Parse CSV text (works in the browser and on the server). */
export function parseCsv(text: string): unknown[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");
  // Detect the delimiter from the header line: comma, tab (pasted from Excel) or semicolon.
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = [",", "\t", ";"].reduce(
    (best, d) => (firstLine.split(d).length > firstLine.split(best).length ? d : best),
    ",",
  );
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delimiter) { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// ---------------------------------------------------------------------------
// Roster -> line items
// ---------------------------------------------------------------------------

export interface RosterPlayerLike {
  name: string;
  number: string | null;
  size: string | null;
  topSize: string | null;
  bottomSize: string | null;
  hatSize: string | null;
}

/** The size a player gets for a given product, falling back to their general size. */
export function playerSizeFor(product: Product, p: RosterPlayerLike): string {
  if (product.sizes.length === 1) return product.sizes[0];
  let size: string | null = null;
  switch (product.sizeField) {
    case "topSize":
      size = p.topSize || p.size;
      break;
    case "bottomSize":
      size = p.bottomSize || p.size;
      break;
    case "hatSize":
      size = p.hatSize || hatSizeFromApparel(p.size || p.topSize);
      break;
    case "none":
      size = product.sizes[0];
  }
  return size ?? "";
}

/** Expand a line's configuration + team roster into the concrete pieces to produce. */
export function buildLineItems(product: Product, config: LineConfig, roster: RosterPlayerLike[]): PricedItem[] {
  const items: PricedItem[] = [];
  if (config.sizing === "ROSTER") {
    for (const p of roster) {
      items.push({
        size: playerSizeFor(product, p),
        quantity: 1,
        name: config.names ? p.name : null,
        number: config.numbers ? p.number : null,
      });
    }
  } else {
    for (const size of product.sizes) {
      const q = config.sizeRun[size] ?? 0;
      if (q > 0) items.push({ size, quantity: q, name: null, number: null });
    }
  }
  for (const size of product.sizes) {
    const q = config.extras[size] ?? 0;
    if (q > 0) items.push({ size, quantity: q, name: null, number: null });
  }
  return items;
}

/** Summarize pieces by size, e.g. { S: 3, M: 10 } in catalog size order. */
export function sizeBreakdown(product: Product, items: PricedItem[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const i of items) counts.set(i.size || "?", (counts.get(i.size || "?") ?? 0) + i.quantity);
  const order = [...product.sizes, "?"];
  return [...counts.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
}
