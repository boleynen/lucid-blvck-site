import { createHmac, timingSafeEqual } from "node:crypto";

function verifySignature(payload, signature, secret) {
  const timestamp = signature.match(/(?:^|,)t=([^,]+)/)?.[1];
  const signatures = [...signature.matchAll(/(?:^|,)v1=([^,]+)/g)].map(match => match[1]);
  if (!timestamp || !signatures.length || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex"), "hex");
  return signatures.some(value => {
    const actual = Buffer.from(value, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
}

export default async function handler(request) {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") || "";
  if (!process.env.STRIPE_WEBHOOK_SECRET || !verifySignature(payload, signature, process.env.STRIPE_WEBHOOK_SECRET)) return new Response("Invalid signature", { status: 400 });
  try {
    const event = JSON.parse(payload);
    const session = event.data?.object;
    if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type) && session?.payment_status === "paid") {
      const items = JSON.parse(session.metadata?.inventory || "[]").map(([id, quantity]) => ({ id, quantity }));
      if (!items.length) throw new Error("Checkout session contains no inventory");
      const supabaseUrl = process.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
      const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !secretKey) throw new Error("Supabase server access is not configured");
      const shipping = session.collected_information?.shipping_details || session.shipping_details || null;
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/process_lucid_paid_order`, {
        method: "POST",
        headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          p_event_id: event.id,
          p_session_id: session.id,
          p_items: items,
          p_customer_email: session.customer_details?.email || null,
          p_customer_name: shipping?.name || session.customer_details?.name || null,
          p_shipping_address: shipping?.address || session.customer_details?.address || null,
          p_amount_total: session.amount_total,
          p_currency: session.currency || "eur",
        }),
      });
      if (!response.ok) throw new Error(await response.text());
    }
    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("Lucid Entom Stripe webhook failed", error);
    return new Response("Webhook processing failed", { status: 500 });
  }
}
