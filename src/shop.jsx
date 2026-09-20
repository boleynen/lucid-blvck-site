import React, { useState } from "react";
import { ArrowUpRight, ChevronLeft, Minus, Plus, ShoppingBag, X } from "lucide-react";

export const euro = (cents = 0) => new Intl.NumberFormat("en-BE", {
  style: "currency",
  currency: "EUR",
}).format(cents / 100);

export function Shop({ products, Link, onAdd }) {
  return (
    <main className="objects-shop" id="top">
      <section className="shop-hero">
        <div className="shop-kicker">
          <span>Entomological art</span>
          <span>By Lucid Blvck</span>
        </div>
        <p className="shop-edition">One of one · Made by hand</p>
        <h1>Lucid <em>Entom</em></h1>
        <p className="shop-intro">Original insect works—drawn, cut and assembled as individual pieces. Once gone, they are gone.</p>
        <a href="#collection" className="shop-scroll">Enter the collection ↓</a>
      </section>

      <section className="shop-collection" id="collection">
        <div className="shop-section-head">
          <div><span>01</span><p>Available specimens</p></div>
          <p>{products.length} unique {products.length === 1 ? "work" : "works"}</p>
        </div>
        {products.length ? (
          <div className="shop-grid">
            {products.map((product, index) => (
              <article className="shop-card" key={product.id}>
                <Link to={`/shop/${product.id}`} className="shop-card-image">
                  <img src={product.image_url} alt={product.title} />
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </Link>
                <div className="shop-card-copy">
                  <div>
                    <p>{product.dimensions || "Original artwork"}</p>
                    <h2><Link to={`/shop/${product.id}`}>{product.title}</Link></h2>
                  </div>
                  <strong>{euro(product.price_cents)}</strong>
                </div>
                <button type="button" disabled={product.stock_quantity < 1} onClick={() => onAdd(product)}>
                  {product.stock_quantity < 1 ? "Sold" : "Add to collection"} <Plus />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="shop-empty">
            <p>Collection in preparation</p>
            <h2>The first specimens are coming soon.</h2>
          </div>
        )}
      </section>
      <section className="shop-note">
        <p>Made slowly. Released irregularly.</p>
        <h2>Art for people drawn<br />to stranger things.</h2>
        <Link to="/" className="shop-back"><ChevronLeft /> Return to Lucid Blvck</Link>
      </section>
    </main>
  );
}

export function ShopProduct({ product, Link, onAdd }) {
  if (!product) return <main className="shop-missing"><p>Specimen unavailable.</p><Link to="/shop">Return to the collection</Link></main>;
  return (
    <main className="objects-shop shop-product-page">
      <div className="shop-product-image"><img src={product.image_url} alt={product.title} /></div>
      <article className="shop-product-copy">
        <Link to="/shop" className="shop-back"><ChevronLeft /> All specimens</Link>
        <p className="shop-edition">Unique work · 1 of 1</p>
        <h1>{product.title}</h1>
        <p className="shop-description">{product.description}</p>
        <dl>
          <div><dt>Dimensions</dt><dd>{product.dimensions || "Not specified"}</dd></div>
          <div><dt>Edition</dt><dd>Original · One of one</dd></div>
          <div><dt>Availability</dt><dd>{product.stock_quantity > 0 ? "Available" : "Sold"}</dd></div>
          <div><dt>Price</dt><dd>{euro(product.price_cents)}</dd></div>
        </dl>
        <button className="shop-buy" type="button" disabled={product.stock_quantity < 1} onClick={() => onAdd(product)}>
          {product.stock_quantity > 0 ? "Add to cart" : "Sold"} <ShoppingBag />
        </button>
        <small>Secure payment through Stripe · Shipping calculated for this work</small>
      </article>
    </main>
  );
}

export function CartDrawer({ open, items, onClose, onChange, onRemove }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const total = items.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);
  async function checkout() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/.netlify/functions/create-shop-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.map(({ id, quantity }) => ({ id, quantity })) }),
      });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "Checkout could not be started.");
      location.href = data.url;
    } catch (checkoutError) {
      setError(checkoutError.message);
      setLoading(false);
    }
  }
  return (
    <div className={`shop-cart-layer ${open ? "open" : ""}`} aria-hidden={!open}>
      <button className="shop-cart-backdrop" type="button" onClick={onClose} aria-label="Close cart" />
      <aside className="shop-cart" aria-label="Shopping cart">
        <header><div><p>Lucid Entom</p><h2>Your collection</h2></div><button type="button" onClick={onClose} aria-label="Close cart"><X /></button></header>
        {!items.length ? <div className="shop-cart-empty"><p>Your cart is empty.</p></div> : <>
          <div className="shop-cart-items">{items.map(item => <article key={item.id}>
            <img src={item.image_url} alt="" />
            <div><h3>{item.title}</h3><p>{item.dimensions}</p><div className="shop-quantity"><button onClick={() => onChange(item.id, item.quantity - 1)}><Minus /></button><span>{item.quantity}</span><button onClick={() => onChange(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock_quantity}><Plus /></button></div></div>
            <div><strong>{euro(item.price_cents * item.quantity)}</strong><button onClick={() => onRemove(item.id)}>Remove</button></div>
          </article>)}</div>
          <footer className="shop-cart-summary"><div><span>Subtotal</span><strong>{euro(total)}</strong></div><p>Shipping is added securely at checkout.</p>{error && <p className="shop-checkout-error">{error}</p>}<button onClick={checkout} disabled={loading}>{loading ? "Opening checkout…" : "Secure checkout"} <ArrowUpRight /></button></footer>
        </>}
      </aside>
    </div>
  );
}

export function ShopSuccess({ Link, onClear }) {
  React.useEffect(() => onClear(), []);
  return <main className="shop-success"><p>Payment complete</p><h1>Thank you.</h1><span>Your order has been received. A confirmation will follow by email.</span><Link to="/shop">Back to Lucid Entom <ArrowUpRight /></Link></main>;
}
