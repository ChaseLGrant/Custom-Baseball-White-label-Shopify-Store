// Uploaded files (logos, proofs, tax certificates) are stored outside /public and
// served by src/app/files/[...path]/route.ts, which checks the viewer belongs to
// the organization. Swap this module for S3 / Supabase Storage / Vercel Blob in
// production; only saveUpload() and readUpload() need to change.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

const ROOT = path.join(process.cwd(), "storage");

export type UploadKind = "logos" | "proofs" | "certificates";

const TYPES: Record<string, { ext: string; magic?: number[] }> = {
  "image/png": { ext: "png", magic: [0x89, 0x50, 0x4e, 0x47] },
  "image/jpeg": { ext: "jpg", magic: [0xff, 0xd8, 0xff] },
  "application/pdf": { ext: "pdf", magic: [0x25, 0x50, 0x44, 0x46] },
  "image/svg+xml": { ext: "svg" },
};

export const LOGO_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];
export const DOCUMENT_TYPES = ["image/png", "image/jpeg", "application/pdf"];

export async function saveUpload(
  orgId: string,
  kind: UploadKind,
  file: File,
  allowed: string[],
  maxBytes = 10 * 1024 * 1024,
): Promise<{ url: string; mimeType: string }> {
  if (!file || file.size === 0) throw new Error("Choose a file to upload.");
  if (file.size > maxBytes) throw new Error(`File is too large (max ${Math.round(maxBytes / 1048576)} MB).`);
  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = sniffType(bytes, file.type);
  if (!mimeType || !allowed.includes(mimeType))
    throw new Error(`Unsupported file type. Allowed: ${allowed.map((t) => TYPES[t].ext.toUpperCase()).join(", ")}.`);

  const name = `${randomBytes(12).toString("hex")}.${TYPES[mimeType].ext}`;
  const dir = path.join(ROOT, safeSegment(orgId), kind);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), bytes);
  return { url: `/files/${safeSegment(orgId)}/${kind}/${name}`, mimeType };
}

/** Write a file we generated ourselves (seed data, etc). */
export async function saveGenerated(orgId: string, kind: UploadKind, ext: string, data: Buffer | string) {
  const name = `${randomBytes(12).toString("hex")}.${ext}`;
  const dir = path.join(ROOT, safeSegment(orgId), kind);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), data);
  return `/files/${safeSegment(orgId)}/${kind}/${name}`;
}

export async function readUpload(segments: string[]) {
  if (segments.length !== 3 || segments.some((s) => s !== safeSegment(s))) return null;
  const ext = segments[2].split(".").pop() ?? "";
  const mimeType = Object.entries(TYPES).find(([, t]) => t.ext === ext)?.[0];
  if (!mimeType) return null;
  try {
    return { data: await readFile(path.join(ROOT, ...segments)), mimeType };
  } catch {
    return null;
  }
}

function safeSegment(s: string) {
  return s.replace(/[^a-zA-Z0-9._-]/g, "").replace(/^\.+/, "");
}

function sniffType(bytes: Buffer, declared: string): string | null {
  for (const [type, { magic }] of Object.entries(TYPES)) {
    if (magic && magic.every((b, i) => bytes[i] === b)) return type;
  }
  const head = bytes.subarray(0, 2048).toString("utf8").trimStart().toLowerCase();
  if ((declared === "image/svg+xml" || head.startsWith("<?xml") || head.startsWith("<svg")) && head.includes("<svg")) {
    // SVGs are served with a sandboxing CSP, but reject obviously active content anyway.
    const full = bytes.toString("utf8").toLowerCase();
    if (/<script|javascript:|\son[a-z]+\s*=|<foreignobject/.test(full)) throw new Error("This SVG contains scripts, which aren't allowed.");
    return "image/svg+xml";
  }
  return null;
}
