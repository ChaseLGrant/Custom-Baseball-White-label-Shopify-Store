// Shopify webhooks keep order status in sync without anyone touching it:
//   orders/paid           -> PAID (card checkouts)
//   fulfillments/create   -> SHIPPED + tracking number/link
//   fulfillments/update   -> tracking updates, DELIVERED when the carrier confirms
// Register these in Shopify Admin > Settings > Notifications > Webhooks (JSON),
// pointing at {APP_URL}/api/webhooks/shopify.
import { db } from "@/lib/server/db";
import { verifyShopifyWebhook } from "@/lib/server/shopify";
import { addEvent, markPaid, setStatus } from "@/lib/server/orders";

type ShopifyOrder = { id: number; admin_graphql_api_id: string; name: string; note_attributes?: { name: string; value: string }[] };
type ShopifyFulfillment = {
  id: number;
  order_id: number;
  tracking_company?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  shipment_status?: string | null;
};

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyShopifyWebhook(raw, req.headers.get("x-shopify-hmac-sha256"))) return new Response("Unauthorized", { status: 401 });
  const topic = req.headers.get("x-shopify-topic");
  const body = JSON.parse(raw);

  if (topic === "orders/paid") {
    const o = body as ShopifyOrder;
    const ccId = o.note_attributes?.find((a) => a.name === "club_custom_order_id")?.value;
    if (ccId) await markPaid(ccId, { orderId: o.admin_graphql_api_id, name: o.name });
    else {
      // Invoice orders are already linked by Shopify order id.
      const order = await db.order.findFirst({ where: { shopifyOrderId: o.admin_graphql_api_id } });
      if (order) await addEvent(order.id, "PAYMENT", `Invoice ${o.name} paid.`);
    }
  }

  if (topic === "fulfillments/create" || topic === "fulfillments/update") {
    const f = body as ShopifyFulfillment;
    const order = await db.order.findFirst({ where: { shopifyOrderId: `gid://shopify/Order/${f.order_id}` } });
    if (order && f.tracking_number) {
      await db.shipment.upsert({
        where: { shopifyFulfillmentId: String(f.id) },
        create: { orderId: order.id, shopifyFulfillmentId: String(f.id), carrier: f.tracking_company ?? null, trackingNumber: f.tracking_number, trackingUrl: f.tracking_url ?? null },
        update: { carrier: f.tracking_company ?? null, trackingNumber: f.tracking_number, trackingUrl: f.tracking_url ?? null },
      });
      if (order.status === "IN_PRODUCTION") await setStatus(order.id, "SHIPPED", `Shipped via ${f.tracking_company ?? "carrier"} (${f.tracking_number}).`);
      if (f.shipment_status === "delivered" && order.status !== "DELIVERED") await setStatus(order.id, "DELIVERED", "Delivered.");
    }
  }

  return new Response("ok");
}
