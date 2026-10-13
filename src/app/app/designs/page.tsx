import { requireOrg } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { ProductPreview } from "@/components/ProductPreview";
import { deleteDesign } from "@/lib/actions/org";
import { getProduct } from "@/lib/catalog";
import { parseLineConfig } from "@/lib/domain";

export const metadata = { title: "Saved designs" };

export default async function DesignsPage() {
  const { org } = await requireOrg();
  const [designs, logos] = await Promise.all([
    db.savedDesign.findMany({ where: { organizationId: org.id }, include: { team: true }, orderBy: { createdAt: "desc" } }),
    db.logo.findMany({ where: { organizationId: org.id } }),
  ]);
  const logoUrls = Object.fromEntries(logos.map((l) => [l.id, l.fileUrl]));
  return (
    <>
      <PageHeader title="Saved designs" description="Your uniforms, saved exactly as configured. Add them to any order in one click from the order builder." />
      {designs.length === 0 ? (
        <EmptyState title="No saved designs yet" description="In the order builder, click “★ Save as design” on any product to save its color, logos and personalization." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {designs.map((d) => {
            const p = getProduct(d.productId);
            if (!p) return null;
            const c = parseLineConfig(d.config);
            return (
              <Card key={d.id} className="p-4">
                <div className="rounded-lg bg-slate-50 p-2">
                  <ProductPreview product={p} colorId={c.color} decorations={c.decorations} logoUrls={logoUrls} names={c.names} numbers={c.numbers} />
                </div>
                <p className="mt-3 font-semibold">{d.name}</p>
                <p className="text-sm text-slate-500">{p.name}{d.team ? ` · ${d.team.name}` : ""}</p>
                <form action={deleteDesign} className="mt-2">
                  <input type="hidden" name="designId" value={d.id} />
                  <button className="text-xs text-slate-500 hover:text-red-600">Delete</button>
                </form>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
