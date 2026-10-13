// Shared domain vocabulary: statuses, roles, permissions and the JSON shapes
// stored in string columns. Safe to import from client and server code.
import { z } from "zod";

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

export const ORG_TYPES = {
  HIGH_SCHOOL: "High school",
  COLLEGE: "College / university",
  TRAVEL: "Travel organization",
  CLUB: "Club sports",
  OTHER: "Other",
} as const;
export type OrgType = keyof typeof ORG_TYPES;

export const SPORTS = {
  BASEBALL: "Baseball",
  SOFTBALL: "Softball",
  FOOTBALL: "Football",
  BASKETBALL: "Basketball",
  SOCCER: "Soccer",
  VOLLEYBALL: "Volleyball",
  LACROSSE: "Lacrosse",
  TRACK: "Track & field",
  OTHER: "Other",
} as const;
export type Sport = keyof typeof SPORTS;

// ---------------------------------------------------------------------------
// Roles & permissions
// ---------------------------------------------------------------------------

export const ROLES = {
  OWNER: "Owner",
  ADMIN: "Admin",
  PURCHASER: "Purchaser",
  COACH: "Coach",
} as const;
export type Role = keyof typeof ROLES;

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  OWNER: "Full control, including members and purchasing settings.",
  ADMIN: "Everything except removing the owner.",
  PURCHASER: "Places, approves and pays for orders.",
  COACH: "Builds orders, manages teams, rosters and logos. Large orders may need approval.",
};

export type Action =
  | "manage_members"
  | "manage_purchasing" // tax-exempt certificate, terms, approval rules
  | "manage_addresses"
  | "manage_teams"
  | "manage_logos"
  | "build_orders"
  | "approve_orders"
  | "pay_orders"
  | "approve_proofs";

const PERMISSIONS: Record<Role, Action[]> = {
  OWNER: [
    "manage_members",
    "manage_purchasing",
    "manage_addresses",
    "manage_teams",
    "manage_logos",
    "build_orders",
    "approve_orders",
    "pay_orders",
    "approve_proofs",
  ],
  ADMIN: [
    "manage_members",
    "manage_purchasing",
    "manage_addresses",
    "manage_teams",
    "manage_logos",
    "build_orders",
    "approve_orders",
    "pay_orders",
    "approve_proofs",
  ],
  PURCHASER: ["manage_addresses", "build_orders", "approve_orders", "pay_orders", "approve_proofs"],
  COACH: ["manage_teams", "manage_logos", "build_orders", "pay_orders", "approve_proofs"],
};

export function can(role: string | null | undefined, action: Action): boolean {
  if (!role || !(role in PERMISSIONS)) return false;
  return PERMISSIONS[role as Role].includes(action);
}

// ---------------------------------------------------------------------------
// Verification statuses (tax exemption, invoice terms)
// ---------------------------------------------------------------------------

export type VerificationStatus = "NONE" | "PENDING" | "VERIFIED" | "APPROVED" | "REJECTED";

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export const ORDER_STATUSES = {
  DRAFT: {
    label: "Draft",
    customer: "You're still building this order.",
  },
  PENDING_APPROVAL: {
    label: "Waiting for internal approval",
    customer: "An admin or purchaser in your organization needs to approve this order before payment.",
  },
  QUOTE_REVIEW: {
    label: "Pricing review",
    customer:
      "Part of this order can't be priced automatically. Our team is confirming pricing with the manufacturer — you'll be able to pay online as soon as it's ready.",
  },
  AWAITING_PAYMENT: {
    label: "Ready for payment",
    customer: "Your order is priced and ready. Complete payment to send it to production.",
  },
  PAID: {
    label: "Paid — proof in preparation",
    customer: "Payment received. Our art team is preparing your production proof.",
  },
  INVOICED: {
    label: "Invoiced — proof in preparation",
    customer: "Order accepted on invoice terms. Our art team is preparing your production proof.",
  },
  PROOF_READY: {
    label: "Proof ready for your approval",
    customer: "Review and approve your production proof. Nothing is produced until you approve.",
  },
  PROOF_REVISION: {
    label: "Proof being revised",
    customer: "We received your requested changes and are revising the proof.",
  },
  IN_PRODUCTION: {
    label: "In production",
    customer: "Your proof is approved and your order is being produced.",
  },
  SHIPPED: {
    label: "Shipped",
    customer: "Your order is on the way.",
  },
  DELIVERED: {
    label: "Delivered",
    customer: "Your order was delivered.",
  },
  CANCELLED: {
    label: "Cancelled",
    customer: "This order was cancelled.",
  },
} as const;
export type OrderStatus = keyof typeof ORDER_STATUSES;

/** Customer-facing milestones shown as a progress tracker. */
export const MILESTONES: { key: string; label: string; statuses: OrderStatus[] }[] = [
  { key: "placed", label: "Order placed", statuses: ["PENDING_APPROVAL", "QUOTE_REVIEW", "AWAITING_PAYMENT"] },
  { key: "paid", label: "Payment", statuses: ["PAID", "INVOICED"] },
  { key: "proof", label: "Proof approval", statuses: ["PROOF_READY", "PROOF_REVISION"] },
  { key: "production", label: "Production", statuses: ["IN_PRODUCTION"] },
  { key: "shipped", label: "Shipped", statuses: ["SHIPPED"] },
  { key: "delivered", label: "Delivered", statuses: ["DELIVERED"] },
];

export function milestoneIndex(status: string): number {
  if (status === "DRAFT" || status === "CANCELLED") return -1;
  return MILESTONES.findIndex((m) => m.statuses.includes(status as OrderStatus));
}

export const isSubmitted = (status: string) => status !== "DRAFT";
export const isPaidOrInvoiced = (status: string) =>
  ["PAID", "INVOICED", "PROOF_READY", "PROOF_REVISION", "IN_PRODUCTION", "SHIPPED", "DELIVERED"].includes(status);

// ---------------------------------------------------------------------------
// Order line configuration (stored as JSON on OrderLine.config / SavedDesign.config)
// ---------------------------------------------------------------------------

export const decorationSchema = z.object({
  location: z.string(),
  method: z.string(),
  logoId: z.string().nullable(),
});
export type Decoration = z.infer<typeof decorationSchema>;

export const lineConfigSchema = z.object({
  color: z.string(),
  decorations: z.array(decorationSchema).default([]),
  names: z.boolean().default(false),
  numbers: z.boolean().default(false),
  // ROSTER: one item per player on the team roster (names/numbers/sizes from the roster).
  // SIZE_RUN: plain quantities per size (no roster needed).
  sizing: z.enum(["ROSTER", "SIZE_RUN"]).default("ROSTER"),
  sizeRun: z.record(z.string(), z.number().int().min(0)).default({}),
  // Extra unpersonalized pieces on top of the roster (coaches, spares).
  extras: z.record(z.string(), z.number().int().min(0)).default({}),
});
export type LineConfig = z.infer<typeof lineConfigSchema>;

export function parseLineConfig(json: string | null | undefined): LineConfig {
  try {
    return lineConfigSchema.parse(JSON.parse(json || "{}"));
  } catch {
    return lineConfigSchema.parse({ color: "" });
  }
}

export function parseJsonArray(json: string | null | undefined): string[] {
  try {
    const v = JSON.parse(json || "[]");
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function formatOrderNumber(n: number): string {
  return `CC-${n}`;
}
