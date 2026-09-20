const DELIVERY_COUNTRIES = ["BE", "NL", "LU", "FR", "DE"];

export default async function handler(request) {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  if (!process.env.STRIPE_SECRET_KEY) return Response.json({ error: "Stripe is not connected yet." }, { status: 503 });
  try {
    const payload = await request.json();
    if (!Array.isArray(payload.items) || !payload.items.length || payload.items.length > 10) throw new Error("Invalid cart");
    const supabaseUrl = process.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
    const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !publishableKey) throw new Error("Shop database is not configured");
    const ids = payload.items.map(item => item.id);
    const response = await fetch(`${supabaseUrl}/rest/v1/shop_products?select=id,title,description,price_cents,shipping_cents,stock_quantity,image_url,active&id=in.(${ids.map(encodeURIComponent).join(",")})`, {
      headers: { apikey: publishableKey, Authorization: `Bearer ${publishableKey}` },
    });
    if (!response.ok) throw new Error("Could not validate products");
    const catalog = Object.fromEntries((await response.json()).map(product => [product.id, product]));
    const items = payload.items.map(item => {
      const product = catalog[item.id];
      const quantity = Number(item.quantity);
      if (!product?.active || !Number.isInteger(quantity) || quantity < 1 || quantity > product.stock_quantity) throw new Error("An object is sold or no longer available");
      return { product, quantity };
    });
    const shippingAmount = items.reduce((sum, { product, quantity }) => sum + product.shipping_cents * quantity, 0);
    const origin = new URL(request.url).origin;
    const params = new URLSearchParams({
      mode: "payment",
      locale: "auto",
      customer_creation: "always",
      billing_address_collection: "required",
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/shop`,
    });
    DELIVERY_COUNTRIES.forEach((country, index) => params.set(`shipping_address_collection[allowed_countries][${index}]`, country));
    if (shippingAmount > 0) {
      params.set("shipping_options[0][shipping_rate_data][type]", "fixed_amount");
      params.set("shipping_options[0][shipping_rate_data][fixed_amount][amount]", String(shippingAmount));
      params.set("shipping_options[0][shipping_rate_data][fixed_amount][currency]", "eur");
      params.set("shipping_options[0][shipping_rate_data][display_name]", "Tracked shipping");
    }
    params.set("metadata[inventory]", JSON.stringify(items.map(({ product, quantity }) => [product.id, quantity])));
    items.forEach(({ product, quantity }, index) => {
      params.set(`line_items[${index}][quantity]`, String(quantity));
      params.set(`line_items[${index}][price_data][currency]`, "eur");
      params.set(`line_items[${index}][price_data][unit_amount]`, String(product.price_cents));
      params.set(`line_items[${index}][price_data][product_data][name]`, product.title);
      if (product.description?.trim()) params.set(`line_items[${index}][price_data][product_data][description]`, product.description.trim().slice(0, 500));
      if (product.image_url?.startsWith("https://")) params.set(`line_items[${index}][price_data][product_data][images][0]`, product.image_url);
    });
    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const session = await stripeResponse.json();
    if (!stripeResponse.ok) throw new Error(session?.error?.message || "Stripe checkout failed");
    return Response.json({ url: session.url });
  } catch (error) {
    return Response.json({ error: error.message || "Checkout could not be started" }, { status: 400 });
  }
}
