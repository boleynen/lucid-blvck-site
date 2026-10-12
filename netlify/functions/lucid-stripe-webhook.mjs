import { createHmac, timingSafeEqual } from "node:crypto";

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
}[character]));

const money = (amount = 0, currency = "eur") => new Intl.NumberFormat("en-BE", {
  style: "currency",
  currency: currency.toUpperCase(),
}).format(amount / 100);

function addressLines(shipping) {
  const address = shipping?.address || {};
  return [
    shipping?.name,
    address.line1,
    address.line2,
    [address.postal_code, address.city].filter(Boolean).join(" "),
    address.country,
  ].filter(Boolean);
}

async function sendEmail({ to, subject, html, idempotencyKey }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ from: process.env.ORDER_EMAIL_FROM, to: [to], subject, html }),
  });
  if (!response.ok) throw new Error(`Resend email failed: ${await response.text()}`);
}

async function sendOrderEmails(session, shipping) {
  const customerEmail = session.customer_details?.email;
  if (!process.env.RESEND_API_KEY || !process.env.ORDER_EMAIL_FROM || !process.env.ORDER_NOTIFICATION_EMAIL || !customerEmail) return;

  const lineResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(session.id)}/line_items?limit=100`, {
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
  });
  if (!lineResponse.ok) throw new Error("Could not load Stripe order items for confirmation email");
  const lineItems = (await lineResponse.json()).data || [];
  const reference = session.id.slice(-10).toUpperCase();
  const rows = lineItems.map(item => `<tr><td style="padding:10px 0;border-bottom:1px solid #d8d4ca">${escapeHtml(item.description)} × ${item.quantity}</td><td style="padding:10px 0;border-bottom:1px solid #d8d4ca;text-align:right">${escapeHtml(money(item.amount_total, session.currency))}</td></tr>`).join("");
  const address = addressLines(shipping).map(escapeHtml).join("<br>");
  const frameStart = `<div style="margin:0;background:#ebe7de;color:#0d0d0c;font-family:Arial,sans-serif"><div style="max-width:620px;margin:auto;padding:46px 28px"><p style="margin:0 0 34px;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Lucid Entom · By Lucid Blvck</p>`;
  const orderDetails = `<table style="width:100%;border-collapse:collapse;margin:28px 0">${rows}<tr><td style="padding:18px 0;font-weight:700">Total</td><td style="padding:18px 0;text-align:right;font-weight:700">${escapeHtml(money(session.amount_total, session.currency))}</td></tr></table><p style="font-size:12px;line-height:1.7"><strong>Delivery address</strong><br>${address}</p><p style="margin-top:28px;font-size:11px;color:#625e57">Order reference: ${escapeHtml(reference)}</p>`;
  const frameEnd = `<p style="margin-top:42px;padding-top:20px;border-top:1px solid #b9b5aa;font-size:11px;line-height:1.6">Questions about your order? Contact <a style="color:#0d0d0c" href="mailto:lb.tatoo@icloud.com">lb.tatoo@icloud.com</a>.</p></div></div>`;
  const customerName = shipping?.name || session.customer_details?.name || "there";

  await Promise.all([
    sendEmail({
      to: customerEmail,
      subject: `Order confirmed · Lucid Entom · ${reference}`,
      idempotencyKey: `lucid-entom-customer/${session.id}`,
      html: `${frameStart}<p style="margin:0;color:#8a526a;font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase">Payment complete</p><h1 style="margin:12px 0 18px;font-family:Georgia,serif;font-size:42px;line-height:1">Thank you for supporting independent artists.</h1><p style="font-size:15px;line-height:1.7">Hi ${escapeHtml(customerName)}, your order has been received successfully. I’ll contact you when it is ready to ship.</p>${orderDetails}${frameEnd}`,
    }),
    sendEmail({
      to: process.env.ORDER_NOTIFICATION_EMAIL,
      subject: `New Lucid Entom order · ${reference}`,
      idempotencyKey: `lucid-entom-owner/${session.id}`,
      html: `${frameStart}<p style="margin:0;color:#8a526a;font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase">New paid order</p><h1 style="margin:12px 0 18px;font-family:Georgia,serif;font-size:42px;line-height:1">An artwork has been ordered.</h1><p style="font-size:15px;line-height:1.7"><strong>Customer:</strong> ${escapeHtml(customerName)}<br><strong>Email:</strong> ${escapeHtml(customerEmail)}</p>${orderDetails}${frameEnd}`,
    }),
  ]);
}

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
      await sendOrderEmails(session, shipping);
    }
    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("Lucid Entom Stripe webhook failed", error);
    return new Response("Webhook processing failed", { status: 500 });
  }
}
