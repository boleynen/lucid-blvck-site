export default async function handler(request) {
  if (request.method !== "GET") return Response.json({ error: "Method not allowed" }, { status: 405 });
  const authorization = request.headers.get("authorization") || "";
  const supabaseUrl = process.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!authorization.startsWith("Bearer ")) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!supabaseUrl || !publishableKey || !stripeKey) return Response.json({ error: "Order service is not configured" }, { status: 503 });

  try {
    const orderResponse = await fetch(`${supabaseUrl}/rest/v1/shop_orders?select=*&order=created_at.desc`, {
      headers: { apikey: publishableKey, Authorization: authorization },
    });
    if (!orderResponse.ok) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const orders = await orderResponse.json();
    const enriched = await Promise.all(orders.map(async order => {
      const storedItems = Array.isArray(order.items) ? order.items : [];
      if (!storedItems.length || storedItems.every(item => item.title)) return order;
      const lineResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(order.stripe_session_id)}/line_items?limit=100`, {
        headers: { Authorization: `Bearer ${stripeKey}` },
      });
      if (!lineResponse.ok) return order;
      const lines = (await lineResponse.json()).data || [];
      return {
        ...order,
        items: storedItems.map((item, index) => ({
          ...item,
          title: lines[index]?.description || item.title || null,
        })),
      };
    }));
    return Response.json(enriched, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin orders failed", error);
    return Response.json({ error: "Orders could not be loaded" }, { status: 500 });
  }
}
