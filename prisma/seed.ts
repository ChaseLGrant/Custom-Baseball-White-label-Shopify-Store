// Demo data for local development. Run with `npm run db:seed` (wipes the local DB).
//
//   Coach / owner:  coach@lincoln.test  / clubcustom123
//   Club staff:     staff@clubcustom.test / clubcustom123

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { saveGenerated } from "../src/lib/server/storage";
import { priceOrder } from "../src/lib/pricing";
import { buildLineItems } from "../src/lib/roster";
import { getProduct } from "../src/lib/catalog";
import { defaultLineConfig } from "../src/lib/line-defaults";
import type { LineConfig } from "../src/lib/domain";

const db = new PrismaClient();

const FIRST = ["Mason", "Eli", "Jordan", "Caleb", "Luke", "Owen", "Ryan", "Tyler", "Gavin", "Nolan", "Cole", "Brady", "Isaac", "Wyatt", "Chase", "Logan", "Dylan", "Carter", "Evan", "Blake", "Hunter", "Jace", "Reid", "Miles", "Grant"];
const LAST = ["Rivera", "Turner", "Brooks", "Hayes", "Price", "Bennett", "Coleman", "Foster", "Reyes", "Hughes", "Myers", "Perry", "Long", "Ward", "Ross", "Jenkins", "Powell", "Sanders", "Patel", "Kim", "Russell", "Griffin", "Diaz", "Hayes", "Stone"];
const SIZES = ["S", "M", "M", "L", "L", "L", "XL", "XL", "2XL", "M", "L", "S", "XL", "L", "M", "L", "XL", "M", "L", "2XL", "M", "L", "XL", "L", "M"];

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <circle cx="100" cy="100" r="94" fill="#c8102e" stroke="#ffffff" stroke-width="8"/>
  <text x="100" y="138" text-anchor="middle" font-family="Georgia, serif" font-size="120" font-weight="700" fill="#ffffff">L</text>
</svg>`;

const PROOF_SVG = (orderNo: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520" font-family="Arial, sans-serif">
  <rect width="800" height="520" fill="#ffffff"/>
  <rect x="0" y="0" width="800" height="56" fill="#0b2545"/>
  <text x="24" y="36" fill="#fff" font-size="22" font-weight="700">CLUB CUSTOM · PRODUCTION PROOF · ${orderNo} · v1</text>
  <path d="M140 110 L190 95 Q220 120 250 95 L300 110 L380 160 L350 220 L310 200 L310 470 L130 470 L130 200 L90 220 L60 160 Z" fill="#13294b" stroke="#0a1730" stroke-width="3"/>
  <circle cx="245" cy="215" r="34" fill="#c8102e" stroke="#fff" stroke-width="4"/><text x="245" y="231" text-anchor="middle" fill="#fff" font-size="44" font-family="Georgia" font-weight="700">L</text>
  <text x="430" y="120" font-size="18" font-weight="700" fill="#0b2545">Pro Full-Button Jersey — Navy</text>
  <text x="430" y="150" font-size="15" fill="#334155">Left chest: Primary L logo, embroidery, 3.5" wide</text>
  <text x="430" y="175" font-size="15" fill="#334155">Thread: Scarlet (PMS 186) / White</text>
  <text x="430" y="215" font-size="18" font-weight="700" fill="#0b2545">Structured Stretch-Fit Cap — Navy</text>
  <text x="430" y="245" font-size="15" fill="#334155">Front: Primary L logo, 3D embroidery, 2.25" tall</text>
  <text x="430" y="300" font-size="14" fill="#64748b">Please verify colors, placement and sizes.</text>
  <text x="430" y="322" font-size="14" fill="#64748b">Production begins only after you approve this proof.</text>
</svg>`;

async function main() {
  // Wipe (dev only)
  for (const t of ["orderEvent", "shipment", "proof", "orderLineItem", "orderLine", "order", "savedDesign", "rosterPlayer", "team", "logo", "address", "invite", "membership", "session", "organization", "user", "counter"] as const) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db[t] as any).deleteMany();
  }

  const passwordHash = await bcrypt.hash("clubcustom123", 10);
  await db.user.create({ data: { email: "staff@clubcustom.test", name: "Casey (Club Custom)", passwordHash, isStaff: true } });

  const org = await db.organization.create({ data: { name: "Lincoln High School Athletics", type: "HIGH_SCHOOL" } });
  const coach = await db.user.create({ data: { email: "coach@lincoln.test", name: "Coach Dana Miller", passwordHash } });
  await db.membership.create({ data: { userId: coach.id, organizationId: org.id, role: "OWNER" } });

  const logo = await db.logo.create({
    data: { organizationId: org.id, name: "Primary L", fileUrl: await saveGenerated(org.id, "logos", "svg", LOGO_SVG), mimeType: "image/svg+xml", isVector: true },
  });
  await db.address.create({
    data: { organizationId: org.id, label: "Athletic office", attention: "Dana Miller", line1: "1200 Lincoln Ave", city: "Columbus", state: "OH", postalCode: "43215", isDefault: true },
  });

  const varsity = await db.team.create({ data: { organizationId: org.id, name: "Varsity Baseball", sport: "BASEBALL", level: "Varsity" } });
  await db.rosterPlayer.createMany({
    data: FIRST.map((f, i) => ({ teamId: varsity.id, name: `${f} ${LAST[i]}`, number: String([1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 27][i]), size: SIZES[i], sortOrder: i })),
  });
  const jv = await db.team.create({ data: { organizationId: org.id, name: "JV Baseball", sport: "BASEBALL", level: "JV" } });
  await db.rosterPlayer.createMany({
    data: FIRST.slice(0, 16).map((f, i) => ({ teamId: jv.id, name: `${f} ${LAST[(i + 7) % LAST.length]}`, number: String(30 + i), size: ["S", "M", "YL", "M", "L"][i % 5], sortOrder: i })),
  });

  const roster = await db.rosterPlayer.findMany({ where: { teamId: varsity.id }, orderBy: { sortOrder: "asc" } });
  await db.counter.create({ data: { id: "order", value: 1000 } });

  // A delivered order from last season (try "Reorder" on it).
  const jersey: LineConfig = { ...defaultLineConfig("jersey-full-button", logo.id), names: true, numbers: true };
  const hat = defaultLineConfig("hat-stretch-fit", logo.id);
  await createSubmittedOrder({
    orgId: org.id, userId: coach.id, name: "2026 Spring Varsity", status: "DELIVERED",
    lines: [["jersey-full-button", jersey], ["hat-stretch-fit", hat]], teamId: varsity.id, roster, logoId: logo.id,
    events: ["Order submitted.", "Payment received.", "Proof v1 approved.", "Sent to production.", "Shipped via UPS (1Z999AA10123456784).", "Delivered."],
    shipped: true,
  });
  // Digitizing from that order is on file: future embroidery setup is free.
  await db.logo.update({ where: { id: logo.id }, data: { setupsPaid: JSON.stringify(["EMBROIDERY"]) } });

  // An order with a proof waiting for the coach.
  const proofOrder = await createSubmittedOrder({
    orgId: org.id, userId: coach.id, name: "Summer Camp Tees", status: "PROOF_READY",
    lines: [["bp-tee", { ...defaultLineConfig("bp-tee", logo.id, "gray"), decorations: [{ location: "front-center", method: "SCREEN_PRINT", logoId: logo.id }] }]],
    teamId: varsity.id, roster, logoId: logo.id,
    events: ["Order submitted.", "Payment received. Our art team is preparing your proof.", "Proof v1 is ready for your approval."],
  });
  await db.proof.create({
    data: { orderId: proofOrder.id, version: 1, fileUrl: await saveGenerated(org.id, "proofs", "svg", PROOF_SVG(`CC-${proofOrder.number}`)), staffNote: "Logo centered 3\" below the collar." },
  });

  await db.savedDesign.create({ data: { organizationId: org.id, teamId: varsity.id, name: "Varsity home jersey", productId: "jersey-full-button", config: JSON.stringify(jersey) } });

  console.log("Seeded. Sign in as coach@lincoln.test or staff@clubcustom.test (password: clubcustom123)");
}

async function createSubmittedOrder(o: {
  orgId: string; userId: string; name: string; status: string;
  lines: [string, LineConfig][]; teamId: string; roster: { name: string; number: string | null; size: string | null; topSize: string | null; bottomSize: string | null; hatSize: string | null }[];
  logoId: string; events: string[]; shipped?: boolean;
}) {
  const counter = await db.counter.update({ where: { id: "order" }, data: { value: { increment: 1 } } });
  const inputs = o.lines.map(([productId, config], i) => ({ key: String(i), productId, config, items: buildLineItems(getProduct(productId)!, config, o.roster) }));
  const price = priceOrder({ lines: inputs });
  const created = await db.order.create({
    data: {
      organizationId: o.orgId, createdById: o.userId, name: o.name, number: counter.value, status: o.status,
      catalogVersion: price.catalogVersion, subtotalCents: price.productCents, decorationCents: price.decorationCents,
      personalizationCents: price.personalizationCents, setupCents: price.setupCents, shippingCents: price.shippingCents,
      totalCents: price.totalCents, quoteReasons: "[]", submittedAt: new Date(Date.now() - 30 * 864e5), paidAt: new Date(Date.now() - 29 * 864e5),
      shippingSnapshot: JSON.stringify({ company: "Lincoln High School Athletics", attention: "Dana Miller", line1: "1200 Lincoln Ave", line2: null, city: "Columbus", state: "OH", postalCode: "43215", country: "US", phone: null }),
      lines: {
        create: inputs.map((l, i) => {
          const p = price.lines[i];
          return {
            productId: l.productId, teamId: o.teamId, config: JSON.stringify(l.config), sortOrder: i, quantity: p.quantity,
            unitPriceCents: p.baseUnitCents, decorationUnitCents: p.decorationUnitCents, lineTotalCents: p.lineTotalCents,
            items: { create: l.items.map((it, n) => ({ name: it.name || null, number: it.number || null, size: it.size, quantity: it.quantity, sortOrder: n })) },
          };
        }),
      },
      events: { create: o.events.map((message, i) => ({ type: "STATUS", message, createdAt: new Date(Date.now() - (30 - i * 3) * 864e5) })) },
      ...(o.shipped ? { shipments: { create: { carrier: "UPS", trackingNumber: "1Z999AA10123456784", trackingUrl: "https://www.ups.com/track?tracknum=1Z999AA10123456784" } } } : {}),
    },
  });
  return created;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
