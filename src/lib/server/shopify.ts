// Shopify Admin API integration.
//
// Why Draft Orders? Every Club Custom order is custom-priced (volume tiers,
// decoration, personalization). Draft orders let us send Shopify exact custom
// line items, mark verified institutions tax-exempt, attach PO numbers, and use
// Shopify payment terms (Net 30 etc.) for approved invoice customers. Card
// payments happen on Shopify's secure invoice checkout page.
//
// When SHOPIFY_* env vars are not set the app runs in TEST CHECKOUT mode: the
// "pay" button goes to /test-checkout, which clearly says no money is charged.

import { createHmac, timingSafeEqual } from "node:crypto";
import type { CheckoutLineItem } from "../checkout-lines";

export function shopifyConfigured(): boolean {
  return Boolean(process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_ADMIN_ACCESS_TOKEN);
}

async function adminGraphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const version = process.env.SHOPIFY_API_VERSION || "2025-07";
  const res = await fetch(`https://${domain}/admin/api/${version}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as { data?: T; errors?: unknown } | null;
  if (!res.ok || !json || json.errors) {
    throw new Error(`Shopify API error (${res.status}): ${JSON.stringify(json?.errors ?? json).slice(0, 500)}`);
  }
  return json.data as T;
}

const money = (cents: number) => ({ amount: (cents / 100).toFixed(2), currencyCode: "USD" });

export interface DraftOrderParams {
  clubCustomOrderId: string;
  orderNumber: string;
  email: string;
  organizationName: string;
  poNumber: string | null;
  taxExempt: boolean;
  note: string;
  items: CheckoutLineItem[];
  shippingCents: number;
  shippingAddress: {
    company: string;
    attention: string | null;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string | null;
  } | null;
  /** Net terms in days, for approved invoice customers. */
  netTermsDays?: number | null;
}

const DRAFT_ORDER_CREATE = /* GraphQL */ `
  mutation DraftOrderCreate($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder { id invoiceUrl }
      userErrors { field message }
    }
  }
`;

function draftOrderInput(p: DraftOrderParams, paymentTermsTemplateId?: string) {
  const [firstName, ...rest] = (p.shippingAddress?.attention || "").split(" ");
  return {
    email: p.email,
    note: p.note,
    poNumber: p.poNumber || undefined,
    taxExempt: p.taxExempt,
    tags: ["club-custom", `cc-${p.orderNumber}`],
    customAttributes: [
      { key: "club_custom_order_id", value: p.clubCustomOrderId },
      { key: "club_custom_order_number", value: p.orderNumber },
      { key: "organization", value: p.organizationName },
    ],
    lineItems: p.items.map((i) => ({
      title: i.title,
      quantity: i.quantity,
      originalUnitPriceWithCurrency: money(i.unitCents),
      requiresShipping: true,
      taxable: true,
      customAttributes: i.attributes,
    })),
    shippingLine: { title: "Club Custom shipping", priceWithCurrency: money(p.shippingCents) },
    shippingAddress: p.shippingAddress
      ? {
          company: p.shippingAddress.company,
          firstName: firstName || undefined,
          lastName: rest.join(" ") || undefined,
          address1: p.shippingAddress.line1,
          address2: p.shippingAddress.line2 || undefined,
          city: p.shippingAddress.city,
          provinceCode: p.shippingAddress.state,
          zip: p.shippingAddress.postalCode,
          countryCode: p.shippingAddress.country,
          phone: p.shippingAddress.phone || undefined,
        }
      : undefined,
    ...(paymentTermsTemplateId
      ? { paymentTerms: { paymentTermsTemplateId, paymentSchedules: [{ issuedAt: new Date().toISOString() }] } }
      : {}),
  };
}

type DraftCreateResult = {
  draftOrderCreate: { draftOrder: { id: string; invoiceUrl: string } | null; userErrors: { message: string }[] };
};

/** Card payment: returns Shopify's secure checkout (invoice) URL. */
export async function createCardCheckout(p: DraftOrderParams) {
  const data = await adminGraphql<DraftCreateResult>(DRAFT_ORDER_CREATE, { input: draftOrderInput(p) });
  const { draftOrder, userErrors } = data.draftOrderCreate;
  if (!draftOrder) throw new Error(`Shopify rejected the order: ${userErrors.map((e) => e.message).join("; ")}`);
  return { draftOrderId: draftOrder.id, checkoutUrl: draftOrder.invoiceUrl };
}

/**
 * Invoice / purchase-order payment for organizations with approved terms:
 * creates the order in Shopify with payment terms (e.g. Net 30), payment pending.
 */
export async function createInvoiceOrder(p: DraftOrderParams) {
  const templates = await adminGraphql<{
    paymentTermsTemplates: { id: string; paymentTermsType: string; dueInDays: number | null }[];
  }>(`query { paymentTermsTemplates { id paymentTermsType dueInDays } }`, {});
  const template = templates.paymentTermsTemplates.find(
    (t) => t.paymentTermsType === "NET" && t.dueInDays === (p.netTermsDays ?? 30),
  );
  if (!template) throw new Error(`No Shopify payment terms template for Net ${p.netTermsDays ?? 30}.`);

  const created = await adminGraphql<DraftCreateResult>(DRAFT_ORDER_CREATE, { input: draftOrderInput(p, template.id) });
  const draft = created.draftOrderCreate.draftOrder;
  if (!draft) throw new Error(`Shopify rejected the order: ${created.draftOrderCreate.userErrors.map((e) => e.message).join("; ")}`);

  const completed = await adminGraphql<{
    draftOrderComplete: { draftOrder: { order: { id: string; name: string } | null } | null; userErrors: { message: string }[] };
  }>(
    `mutation Complete($id: ID!) {
      draftOrderComplete(id: $id) {
        draftOrder { order { id name } }
        userErrors { field message }
      }
    }`,
    { id: draft.id },
  );
  const order = completed.draftOrderComplete.draftOrder?.order;
  if (!order) throw new Error(`Couldn't complete invoice order: ${completed.draftOrderComplete.userErrors.map((e) => e.message).join("; ")}`);
  return { draftOrderId: draft.id, shopifyOrderId: order.id, shopifyOrderName: order.name };
}

/** Verify the X-Shopify-Hmac-Sha256 header of an incoming webhook. */
export function verifyShopifyWebhook(rawBody: string, hmacHeader: string | null): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret || !hmacHeader) return false;
  const digest = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  const given = Buffer.from(hmacHeader, "base64");
  return given.length === digest.length && timingSafeEqual(given, digest);
}

/** Invalidate a checkout link that should no longer be payable (order edited or cancelled). */
export async function deleteDraftOrder(draftOrderId: string) {
  if (!shopifyConfigured()) return;
  await adminGraphql(
    `mutation Delete($input: DraftOrderDeleteInput!) { draftOrderDelete(input: $input) { deletedId userErrors { message } } }`,
    { input: { id: draftOrderId } },
  );
}
