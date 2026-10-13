// Serves uploaded files only to members of the owning organization (or staff).
import { getCurrentUser } from "@/lib/server/auth";
import { readUpload } from "@/lib/server/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response("Not found", { status: 404 });
  const orgId = path[0];
  if (!user.isStaff && !user.memberships.some((m) => m.organizationId === orgId)) return new Response("Not found", { status: 404 });
  const file = await readUpload(path);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mimeType,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      // Uploaded SVGs/PDFs can never run scripts in our origin.
      "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
    },
  });
}
