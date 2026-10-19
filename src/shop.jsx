import React, { useMemo, useState } from "react";
import { PhotoGallery } from "./photos.jsx";
import { ArrowUpRight, ChevronLeft, Minus, Plus, ShoppingBag, X } from "lucide-react";

export const euro = (cents = 0) => new Intl.NumberFormat("en-BE", {
  style: "currency",
  currency: "EUR",
}).format(cents / 100);

function ShopFooter({ Link }) {
  return <footer className="shop-footer">
    <div className="shop-footer-main">
      <Link to="/shop" className="shop-footer-brand">Lucid Entom</Link>
      <div className="shop-footer-column">
        <p>Collection</p>
        <Link to="/shop">Available specimens</Link>
        <Link to="/shop/shipping">Shipping & pickup</Link>
        <a href="#top">Back to top ↑</a>
      </div>
      <div className="shop-footer-column">
        <p>Contact</p>
        <a href="mailto:lb.tattoo@icloud.com">lb.tattoo@icloud.com</a>
        <span>Kasterlee, Belgium</span>
      </div>
      <div className="shop-footer-column">
        <p>Follow</p>
        <a href="https://instagram.com/lucidblvck.ttt" target="_blank" rel="noopener noreferrer">Instagram <ArrowUpRight /></a>
        <Link to="/">Lucid Blvck <ArrowUpRight /></Link>
      </div>
    </div>
    <div className="shop-footer-bottom"><span>© 2026 Lucid Entom</span><span>Original artwork by Lucid Blvck · Kasterlee, Belgium.</span></div>
  </footer>;
}

export function Shop({ products, loading, error, onRetry, Link, onAdd }) {
  const [sort, setSort] = useState("featured");
  const sortedProducts = useMemo(() => {
    const sorted = [...products];
    if (sort === "price-asc") sorted.sort((a, b) => a.price_cents - b.price_cents);
    if (sort === "price-desc") sorted.sort((a, b) => b.price_cents - a.price_cents);
    if (sort === "name") sorted.sort((a, b) => a.title.localeCompare(b.title, "en", { sensitivity: "base" }));
    return sorted;
  }, [products, sort]);
  return (
    <>
    <main className="objects-shop" id="top">
      <section className="shop-collection" id="collection">
        <div className="shop-section-head">
          <div><span>01</span><p>Available specimens</p></div>
          <div className="shop-section-tools">
            <p>{products.length} unique {products.length === 1 ? "work" : "works"}</p>
            <label className="shop-sort">
              <span>Sort</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort shop items">
                <option value="featured">Featured</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="name">Name: A–Z</option>
              </select>
            </label>
          </div>
        </div>
        <p className="shop-shipping-notice">Currently accepting orders within Belgium only. <Link to="/shop/shipping">Shipping info →</Link></p>
        {loading && !products.length ? (
          <div className="shop-loading" role="status" aria-live="polite">
            <span>Loading collection</span>
            <div><i /><i /><i /></div>
          </div>
        ) : error && !products.length ? (
          <div className="shop-empty shop-load-error">
            <p>Connection interrupted</p>
            <h2>The collection could not be loaded.</h2>
            <button type="button" onClick={onRetry}>Try again</button>
          </div>
        ) : products.length ? (
          <div className="shop-grid">
            {sortedProducts.map((product, index) => (
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
        <Link to="/" className="shop-back"><ChevronLeft /> Return to Lucid Blvck</Link>
      </section>
    </main>
    <ShopFooter Link={Link} />
    </>
  );
}

export function ShopProduct({ product, loading, Link, onAdd }) {
  if (loading && !product) return <><main className="shop-missing shop-product-loading"><p>Loading artwork…</p></main><ShopFooter Link={Link} /></>;
  if (!product) return <><main className="shop-missing"><p>Specimen unavailable.</p><Link to="/shop">Return to the collection</Link></main><ShopFooter Link={Link} /></>;
  return (
    <>
    <main className="objects-shop shop-product-page" id="top">
      <div className="shop-product-image"><PhotoGallery key={product.id} record={product} /></div>
      <article className="shop-product-copy">
        <Link to="/shop" className="shop-back"><ChevronLeft /> All specimens</Link>
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
        <small>Secure online payment · Shipping calculated for this work</small>
        <small className="shop-product-shipping-note">Delivery within Belgium only · <Link to="/shop/shipping">Shipping info</Link></small>
      </article>
    </main>
    <ShopFooter Link={Link} />
    </>
  );
}

export function CartDrawer({ open, items, onClose, onChange, onRemove, Link }) {
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
          <footer className="shop-cart-summary"><div><span>Subtotal</span><strong>{euro(total)}</strong></div><p>Choose tracked shipping or free local pickup at checkout. <Link to="/shop/shipping" onClick={onClose}>Shipping info →</Link></p>{error && <p className="shop-checkout-error">{error}</p>}<button onClick={checkout} disabled={loading}>{loading ? "Opening checkout…" : "Secure checkout"} <ArrowUpRight /></button></footer>
        </>}
      </aside>
    </div>
  );
}

export function ShippingInfo({ Link }) {
  return <>
    <main className="shop-policy-page" id="top">
      <div className="shop-policy-heading">
        <Link to="/shop" className="shop-back"><ChevronLeft /> Back to the collection</Link>
        <p>Shipping & pickup</p>
        <h1>Delivery of your artwork.</h1>
        <p className="shop-policy-intro">Lucid Entom currently accepts orders within Belgium only. Choose your preferred option during secure checkout.</p>
      </div>

      <div className="shop-policy-options">
        <section>
          <span>01</span>
          <h2>Tracked shipping in Belgium</h2>
          <p>Tracked shipping is available to Belgian addresses. The exact shipping cost is displayed during checkout before payment.</p>
          <p>The estimated delivery time is <strong>5–10 business days from the moment you place your order</strong>. This includes careful preparation, packaging and transit.</p>
          <p>You will receive a confirmation email when your order has been shipped, including tracking information when available.</p>
        </section>
        <section>
          <span>02</span>
          <h2>Local pickup in Kasterlee</h2>
          <p>Local pickup is free and available by appointment only.</p>
          <p>After payment, you will receive an email to arrange a suitable pickup time. The exact pickup details will be shared privately once your artwork is ready.</p>
        </section>
      </div>

      <div className="shop-policy-details">
        <section>
          <p>Packaging & responsibility</p>
          <h2>Prepared with care.</h2>
          <p>Each artwork is unique and may contain delicate natural elements. Every piece is carefully packaged to protect it during transport. Lucid Entom remains responsible for shipped orders until they have been delivered.</p>
        </section>
        <section>
          <p>Damage or delivery issues</p>
          <h2>Let me know quickly.</h2>
          <p>If your parcel arrives damaged, photograph the artwork, parcel and all packaging and contact <a href="mailto:lb.tattoo@icloud.com">lb.tattoo@icloud.com</a> as soon as possible.</p>
          <p>Please verify your delivery address before payment. Additional shipping costs may apply if an order must be sent again because an incorrect or incomplete address was provided.</p>
        </section>
      </div>
    </main>
    <ShopFooter Link={Link} />
  </>;
}

export function ShopSuccess({ Link, onClear }) {
  React.useEffect(() => onClear(), []);
  return <>
    <main className="shop-success" id="top"><p>Payment complete</p><h1>Thank you for supporting independent artists</h1><span>Your order has been received. A confirmation will follow by email.</span><Link to="/shop">Back to Lucid Entom <ArrowUpRight /></Link></main>
    <ShopFooter Link={Link} />
  </>;
}
