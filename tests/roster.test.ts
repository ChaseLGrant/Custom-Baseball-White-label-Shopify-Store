import { describe, expect, it } from "vitest";
import { normalizeSize, parseCsv, parseRosterTable } from "@/lib/roster";

describe("parseCsv", () => {
  it("handles quotes, BOM and CRLF", () => {
    const rows = parseCsv('﻿Name,Number\r\n"Smith, Jr.",7\r\n');
    expect(rows).toEqual([["Name", "Number"], ["Smith, Jr.", "7"]]);
  });
  it("handles tab-separated data pasted from Excel", () => {
    expect(parseCsv("Name\tSize\nAva\tM")).toEqual([["Name", "Size"], ["Ava", "M"]]);
  });
});

describe("normalizeSize", () => {
  it.each([
    ["Adult Large", "L"],
    ["xxl", "2XL"],
    ["Youth M", "YM"],
    ["y-l", "YL"],
    ["XL", "XL"],
    ["s/m", "S/M"],
    ["", null],
  ])("%s -> %s", (input, out) => expect(normalizeSize(input)).toBe(out));
});

describe("parseRosterTable", () => {
  it("reads typical coach spreadsheets", () => {
    const r = parseRosterTable(
      parseCsv(
        [
          "First Name,Last Name,Jersey #,Jersey Size,Pant Size,Hat Size",
          "Mason,Rivera,#12,Adult Large,L,M/L",
          "Eli,Turner,4,ym,yl,",
        ].join("\n"),
      ),
    );
    expect(r.problems).toEqual([]);
    expect(r.players).toEqual([
      { name: "Mason Rivera", number: "12", size: null, topSize: "L", bottomSize: "L", hatSize: "M/L" },
      { name: "Eli Turner", number: "4", size: null, topSize: "YM", bottomSize: "YL", hatSize: null },
    ]);
  });

  it("expands quantity rows into unnamed pieces", () => {
    const r = parseRosterTable([["Size", "Qty"], ["M", "3"], ["L", "2"]]);
    expect(r.players.length).toBe(5);
    expect(r.players.filter((p) => p.size === "M").length).toBe(3);
  });

  it("reports duplicates, missing sizes and unknown layouts", () => {
    const r = parseRosterTable([["Player", "No", "Size"], ["A", "7", "M"], ["B", "7", ""]]);
    expect(r.problems).toContain("Row 3 (B): no size.");
    expect(r.problems).toContain("Duplicate jersey numbers: 7.");
    expect(parseRosterTable([["foo", "bar"], ["1", "2"]]).problems[0]).toMatch(/couldn't find roster columns/);
  });
});
