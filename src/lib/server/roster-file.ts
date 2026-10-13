// Reads an uploaded roster spreadsheet (.csv, .tsv, .txt or .xlsx) into rows.
import ExcelJS from "exceljs";
import { parseCsv, parseRosterTable, type RosterParseResult } from "../roster";

export async function parseRosterFile(file: File): Promise<RosterParseResult> {
  if (!file || file.size === 0) return { players: [], problems: ["Choose a file to upload."], columns: {} };
  if (file.size > 5 * 1024 * 1024) return { players: [], problems: ["Roster files are limited to 5 MB."], columns: {} };
  const name = file.name.toLowerCase();
  const bytes = Buffer.from(await file.arrayBuffer());

  if (name.endsWith(".xlsx") || bytes.subarray(0, 2).toString() === "PK") {
    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.load(bytes as unknown as ArrayBuffer);
    } catch {
      return { players: [], problems: ["We couldn't read that Excel file. Try File > Save As > CSV."], columns: {} };
    }
    const sheet = wb.worksheets[0];
    if (!sheet) return { players: [], problems: ["The workbook has no sheets."], columns: {} };
    const table: unknown[][] = [];
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const values = (row.values as unknown[]).slice(1).map((v) => cellText(v));
      table.push(values);
    });
    return parseRosterTable(table);
  }
  if (name.endsWith(".xls"))
    return { players: [], problems: ["Old .xls files aren't supported. In Excel choose File > Save As > .xlsx or .csv."], columns: {} };
  return parseRosterTable(parseCsv(bytes.toString("utf8")));
}

function cellText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    const o = v as { text?: string; result?: unknown; richText?: { text: string }[] };
    if (o.richText) return o.richText.map((r) => r.text).join("");
    if (o.text !== undefined) return String(o.text);
    if (o.result !== undefined) return String(o.result);
  }
  return String(v);
}
