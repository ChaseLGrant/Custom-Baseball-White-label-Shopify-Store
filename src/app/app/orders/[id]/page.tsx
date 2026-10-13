import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { getOrder, logoSetupsPaid } from "@/lib/server/orders";
import { can, formatOrderNumber, parseLineConfig } from "@/lib/domain";
import { OrderBuilder } from "./OrderBuilder";
import { OrderStatusView } from "./OrderStatusView";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const o = await db.order.findUnique({ where: { id: (await params).id }, select: { name: true } });
  return { title: o?.name ?? "Order" };
}

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ submitted?: string }> }) {
  const { id } = await params;
  const ctx = await requireOrg();
  const order = await getOrder(id, ctx.org.id);
  if (!order) notFound();

  if (order.status !== "DRAFT") return <OrderStatusView order={order} ctx={ctx} justSubmitted={!!(await searchParams).submitted} />;

  const [teams, logos, designs, setupsPaid, source] = await Promise.all([
    db.team.findMany({ where: { organizationId: ctx.org.id, archived: false }, include: { roster: { orderBy: { sortOrder: "asc" } } }, orderBy: { name: "asc" } }),
    db.logo.findMany({ where: { organizationId: ctx.org.id, archived: false }, orderBy: { createdAt: "asc" } }),
    db.savedDesign.findMany({ where: { organizationId: ctx.org.id }, orderBy: { createdAt: "asc" } }),
    logoSetupsPaid(ctx.org.id),
    order.reorderedFromId ? db.order.findUnique({ where: { id: order.reorderedFromId }, select: { number: true } }) : null,
  ]);

  return (
    <OrderBuilder
      order={{ id: order.id, name: order.name, number: order.number, reorderedFrom: source ? formatOrderNumber(source.number) : null }}
      initialLines={order.lines.map((l) => ({ id: l.id, productId: l.productId, teamId: l.teamId, config: parseLineConfig(l.config) }))}
      teams={teams.map((t) => ({ id: t.id, name: t.name, roster: t.roster.map((p) => ({ name: p.name, number: p.number, size: p.size, topSize: p.topSize, bottomSize: p.bottomSize, hatSize: p.hatSize })) }))}
      logos={logos.map((l) => ({ id: l.id, name: l.name, url: l.fileUrl }))}
      designs={designs.map((d) => ({ id: d.id, name: d.name, productId: d.productId, teamId: d.teamId, config: parseLineConfig(d.config) }))}
      setupsPaid={setupsPaid}
      canManageTeams={can(ctx.role, "manage_teams")}
    />
  );
}
