import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ChevronLeft,
  Menu,
  X,
  Plus,
  Trash2,
  LogOut,
  Upload,
  ShoppingBag,
} from "lucide-react";
import "./styles.css";
import { CartDrawer, Shop, ShopProduct, ShopSuccess } from "./shop";
import {
  databaseConfigured,
  deleteFlash,
  deleteShopProduct,
  deleteTattoo,
  fetchFlash,
  fetchShopProducts,
  fetchTattoos,
  getSession,
  insertFlash,
  insertShopProduct,
  insertTattoo,
  removeImage,
  removeShopImage,
  removeTattooImage,
  signIn,
  signOut,
  uploadImage,
  uploadShopImage,
  uploadTattooImage,
} from "./supabase";
const BOOK = "https://tally.so/r/686Gdk",
  IG = "https://www.instagram.com/lucidblvck.ttt/";
const seed = [
  ["96e043e5-6142-44b7-8657-c4108d14adf7", "Necroform II"],
  ["52cd083b-05c0-4fde-9a67-2ed0d52e3ba2", "Necroform I"],
  ["f669516e-4ee0-4299-b777-43ba87b569d1", "Kitty"],
  ["01a8d64b-266d-45f4-8248-89bd70d310f3", "Lady"],
  ["a137cfc5-cf6f-43f9-8237-a408befac9f8", "Demon lady"],
  ["55a810c6-8da3-4d05-9c24-6f7a98a2722b", "Mask"],
  ["1a2c974e-28de-4253-95b1-75f8d4795147", "Parasite"],
  ["5acaf33d-9a9f-496c-b785-33a1f3c215a3", "All seeing"],
  ["3fbc759e-f759-4e60-ad23-cf0fd3098fa1", "Thorned soul"],
  ["674f8fa5-a58c-4203-aa70-269967d277da", "Flowers"],
  ["91f248ec-9ce1-4f74-91c7-b9866adbe9c4", "Blackwork flower"],
  ["ddf24868-0778-425b-b13b-4f33e60e38fa", "Small ornamental"],
  ["b573f0ac-583a-431f-8cca-f05e4919ef1c", "Small ornamental"],
  ["011617f6-6a85-487e-8564-18ecc0b7a353", "Ornament"],
  ["ee7944d1-80d9-4a0b-8e71-b6aaa04a1bd3", "Berries"],
].map(([id, title]) => ({
  id,
  title,
  price: "On request",
  size: id.startsWith("01a8") ? "min. 25cm x 20cm" : "On request",
  status: "Available",
  image: `/images/flash/${id}.webp`,
}));
async function loadRemote() {
  if (!databaseConfigured) return [];
  return (await fetchFlash()).map((x) => ({
    ...x,
    price: x.estimated_price,
    image: x.image_url,
    persisted: true,
  }));
}
async function loadGallery() {
  if (!databaseConfigured) return [];
  return fetchTattoos();
}
async function loadProducts() {
  if (!databaseConfigured) return [];
  return fetchShopProducts();
}
function go(path) {
  history.pushState({}, "", path);
  dispatchEvent(new PopStateEvent("popstate"));
  scrollTo(0, 0);
}
function Link({ to, children, className = "" }) {
  return (
    <a
      href={to}
      className={className}
      onClick={(e) => {
        if (to.startsWith("/")) {
          e.preventDefault();
          go(to);
        }
      }}
    >
      {children}
    </a>
  );
}
function Header({ cartCount = 0, onCartOpen }) {
  const [o, setO] = useState(false),
    onFlash = location.pathname.startsWith("/flash"),
    onGallery = location.pathname === "/tattoo-gallery",
    onShop = location.pathname.startsWith("/shop") || location.pathname.startsWith("/checkout");
  return (
    <header className={onShop ? "shop-site-header" : ""}>
      <Link to="/" className="wordmark">
        {onShop ? <>LUCID ENTOM</> : <>LUCID BLVCK<sup>®</sup></>}
      </Link>
      <button className="menu" onClick={() => setO(!o)} aria-label="Menu">
        {o ? <X /> : <Menu />}
      </button>
      <nav className={o ? "open" : ""}>
        {!onShop && <>
          <Link to="/flash" className={onFlash ? "active" : ""}>Flash</Link>
          <Link to="/tattoo-gallery" className={onGallery ? "active" : ""}>Tattoo gallery</Link>
          <Link to="/#about">About</Link>
          <Link to="/shop" className="shop-entry">Lucid Entom <ArrowUpRight /></Link>
        </>}
        <button type="button" className="shop-cart-trigger" onClick={onCartOpen}>
          <ShoppingBag /> Cart <span>{cartCount}</span>
        </button>
        {onShop ? (
          <Link to="/" className="shop-entry active">Lucid Blvck <ArrowUpRight /></Link>
        ) : <a
          className="nav-cta"
          href={BOOK}
          target="_blank"
          rel="noopener noreferrer"
        >
          Book a tattoo <ArrowUpRight />
        </a>}
      </nav>
    </header>
  );
}
function Footer({ flash = false }) {
  return (
    <footer>
      <span>© 2026 LUCID BLVCK</span>
      <img src="/images/lucid-blvck-mark-white.png" alt="Lucid Blvck" />
      <a href="#top">{flash ? "All flash" : "Back to top"} ↑</a>
    </footer>
  );
}
function Card({ x }) {
  return (
    <Link to={`/flash/${x.id}`} className="card">
      <div className="card-img">
        <img src={x.image} alt={`Flash design ${x.title}`} />
      </div>
      <div>
        <h2>{x.title}</h2>
        <span>{x.status}</span>
      </div>
    </Link>
  );
}
function Home({ items }) {
  return (
    <main id="top">
      <section className="hero">
        <div className="micro">
          <span>Kasterlee, Belgium</span>
          <span>Private studio · Appointment only</span>
        </div>
        <h1 className="hero-title">
          <span>Lucid Blvck</span>
          <i aria-hidden="true" />
          <em>custom tattooing</em>
        </h1>
        <p>
          Blackwork, illustrative
          <br />
          and ornamental tattooing.
        </p>
        <a href="#flash-preview" className="down">
          Available flash ↓
        </a>
      </section>
      <section id="about" className="about">
        <p className="eyebrow">About the artist</p>
        <div className="about-grid">
          <figure>
            <img
              src="/images/about-bo.webp"
              alt="Bo, tattoo artist behind Lucid Blvck"
            />
          </figure>
          <div>
            <h2>
              Intentional tattoos
              <br />
              with a <em>darker edge.</em>
            </h2>
            <p>
              Tattoo artist based in Kasterlee, Belgium, with a focus on
              blackwork, illustrative and ornamental work.
            </p>
            <p>My style is inspired by darker imagery and organic shapes.</p>
            <p>
              I work from a private studio in Kasterlee, by appointment only.
              This allows me to offer a calm, relaxed and personal setting, with
              plenty of time and attention dedicated to your tattoo experience.
            </p>
          </div>
        </div>
      </section>
      <section id="flash-preview" className="section">
        <div className="section-head">
          <p className="eyebrow">Available flash</p>
          <Link to="/flash">
            View all designs <ArrowUpRight />
          </Link>
        </div>
        <div className="grid preview">
          {items.slice(0, 3).map((x) => (
            <Card key={x.id} x={x} />
          ))}
        </div>
        <Link to="/flash" className="wide-link">
          View all available flash <ArrowUpRight />
        </Link>
      </section>
      <section className="instagram">
        <div>
          <p className="eyebrow">Latest on Instagram</p>
          <a href={IG}>
            @lucidblvck.ttt <ArrowUpRight />
          </a>
        </div>
        <div className="insta-grid">
  <div className="insta-frame">
    <iframe
      src="https://www.instagram.com/p/DcqdkFRDCka/embed"
      title="Instagram 1"
      scrolling="no"
    />
  </div>

  <div className="insta-frame">
    <iframe
      src="https://www.instagram.com/p/DbQmB57jNM-/embed"
      title="Instagram 2"
      scrolling="no"
    />
  </div>

  <div className="insta-frame">
    <iframe
      src="https://www.instagram.com/p/DbJVbl2jNeM/embed"
      title="Instagram 3"
      scrolling="no"
    />
  </div>
</div>
        <a href={IG} className="wide-link">
          Follow on Instagram <ArrowUpRight />
        </a>
      </section>
      <section className="cta">
        <p className="eyebrow">Have an idea?</p>
        <h2>
          Let’s make
          <br />
          <em>something yours.</em>
        </h2>
        <a href={BOOK} target="_blank" rel="noopener noreferrer">
          Start your booking <ArrowUpRight />
        </a>
        <p>Complete the booking form to share your tattoo idea.</p>
        <small>Appointments on selected days · Kasterlee, Belgium</small>
      </section>
      <Footer />
    </main>
  );
}
function Flash({ items }) {
  return (
    <main id="top">
      <section className="page-hero">
        <div className="micro">
          <span>Available designs</span>
          <span>Kasterlee, Belgium</span>
        </div>
        <h1>
          Available <em>flash.</em>
        </h1>
        <Link to="/" className="back">
          <ChevronLeft /> Back home
        </Link>
      </section>
      <section className="section">
        <div className="section-head">
          <p className="eyebrow">All flash</p>
          <span>{items.length} designs</span>
        </div>
        <div className="grid">
          {items.map((x) => (
            <Card key={x.id} x={x} />
          ))}
        </div>
      </section>
      <section className="claim">
        <p className="eyebrow">Found your piece?</p>
        <h2>
          Claim your <em>flash.</em>
        </h2>
        <a href={BOOK} target="_blank" rel="noopener noreferrer">
          Start your booking <ArrowUpRight />
        </a>
      </section>
      <Footer flash />
    </main>
  );
}
function TattooGallery({ items }) {
  const [selected, setSelected] = useState(null);
  return (
    <main id="top">
      <section className="page-hero gallery-hero">
        <div className="micro">
          <span>Healed &amp; fresh work</span>
          <span>Kasterlee, Belgium</span>
        </div>
        <h1>
          Tattoo <em>gallery.</em>
        </h1>
        <Link to="/" className="back">
          <ChevronLeft /> Back home
        </Link>
      </section>
      <section className="section gallery-section">
        <div className="section-head">
          <p className="eyebrow">Selected tattoos</p>
          <span>{items.length} photos</span>
        </div>
        {items.length ? (
          <div className="tattoo-grid">
            {items.map((item) => (
              <button
                type="button"
                className="tattoo-card"
                key={item.id}
                onClick={() => setSelected(item)}
              >
                <img src={item.image_url} alt={item.title} />
                <span>
                  <strong>{item.title}</strong>
                  {item.placement && <small>{item.placement}</small>}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="gallery-empty">New tattoo photographs are coming soon.</p>
        )}
      </section>
      <section className="claim">
        <p className="eyebrow">Inspired?</p>
        <h2>
          Let’s create <em>your tattoo.</em>
        </h2>
        <a href={BOOK} target="_blank" rel="noopener noreferrer">
          Start your booking <ArrowUpRight />
        </a>
      </section>
      <Footer />
      {selected && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={selected.title}>
          <button type="button" onClick={() => setSelected(null)} aria-label="Close photograph">
            <X />
          </button>
          <img src={selected.image_url} alt={selected.title} />
          <p>{selected.title}{selected.placement ? ` · ${selected.placement}` : ""}</p>
        </div>
      )}
    </main>
  );
}
function Detail({ item }) {
  if (!item) return <Missing />;
  return (
    <main id="top">
      <article className="detail">
        <div className="detail-image">
          <img src={item.image} alt={item.title} />
        </div>
        <div className="detail-copy">
          <Link to="/flash" className="back">
            <ChevronLeft /> All flash
          </Link>
          <p className="eyebrow">Lucid Blvck · Available design</p>
          <h1>{item.title}</h1>
          <dl>
            <div>
              <dt>Estimated price</dt>
              <dd>{item.price}</dd>
            </div>
            <div>
              <dt>Size</dt>
              <dd>{item.size}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{item.status}</dd>
            </div>
          </dl>
          <a href={BOOK} className="book" target="_blank" rel="noopener noreferrer">
            Book this flash <ArrowUpRight />
          </a>
        </div>
      </article>
      <Footer flash />
    </main>
  );
}
function Login({ onLogin }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [message, setMessage] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    setMessage("Signing in…");
    try {
      onLogin(await signIn(email, password));
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    }
  };
  return (
    <main className="admin auth">
      <section>
        <p className="eyebrow">Private studio access</p>
        <h1>Admin login.</h1>
        <form onSubmit={submit} className="login-form">
          <label>
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button type="submit">
            Sign in <ArrowUpRight />
          </button>
          {message && <p className="form-message">{message}</p>}
        </form>
      </section>
    </main>
  );
}
function Admin({ remote, gallery, products, onChanged, onGalleryChanged, onProductsChanged }) {
  const [session, setSession] = useState(getSession()),
    [form, setForm] = useState({
      title: "",
      price: "On request",
      size: "On request",
      status: "Available",
    }),
    [file, setFile] = useState(null),
    [message, setMessage] = useState(""),
    [galleryForm, setGalleryForm] = useState({ title: "", placement: "" }),
    [galleryFile, setGalleryFile] = useState(null),
    [galleryMessage, setGalleryMessage] = useState(""),
    [shopForm, setShopForm] = useState({ title: "", description: "", price: "", dimensions: "", shipping: "", stock: "1" }),
    [shopFile, setShopFile] = useState(null),
    [shopMessage, setShopMessage] = useState("");
  if (!databaseConfigured)
    return (
      <main className="admin">
        <section>
          <p className="eyebrow">Setup required</p>
          <h1>Connect database.</h1>
          <p className="notice">
            Add the two Supabase environment variables in Netlify to activate
            secure login and uploads.
          </p>
        </section>
      </main>
    );
  if (!session) return <Login onLogin={setSession} />;
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const add = async (e) => {
    e.preventDefault();
    const formElement = e.currentTarget;
    if (!file) return setMessage("Choose an image first.");
    setMessage("Uploading…");
    const ext = file.name.split(".").pop().toLowerCase();
    const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`;
    try {
      const imageUrl = await uploadImage(file, path);
      await insertFlash({
        title: form.title,
        estimated_price: form.price,
        size: form.size,
        status: form.status,
        image_url: imageUrl,
        storage_path: path,
      });
      setForm({
        title: "",
        price: "On request",
        size: "On request",
        status: "Available",
      });
      setFile(null);
      formElement.reset();
      setMessage("Flash published.");
      await onChanged();
    } catch (error) {
      await removeImage(path).catch(() => {});
      setMessage(error.message);
    }
  };
  const remove = async (x) => {
    if (!confirm(`Delete ${x.title}?`)) return;
    setMessage("Deleting…");
    try {
      await deleteFlash(x.id);
      await removeImage(x.storage_path);
      setMessage("Flash deleted.");
      await onChanged();
    } catch (error) {
      setMessage(error.message);
    }
  };
  const addGallery = async (e) => {
    e.preventDefault();
    const formElement = e.currentTarget;
    if (!galleryFile) return setGalleryMessage("Choose an image first.");
    setGalleryMessage("Uploading…");
    const ext = galleryFile.name.split(".").pop().toLowerCase();
    const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`;
    try {
      const imageUrl = await uploadTattooImage(galleryFile, path);
      await insertTattoo({
        title: galleryForm.title || "Tattoo",
        placement: galleryForm.placement,
        image_url: imageUrl,
        storage_path: path,
      });
      setGalleryForm({ title: "", placement: "" });
      setGalleryFile(null);
      formElement.reset();
      setGalleryMessage("Tattoo photograph published.");
      await onGalleryChanged();
    } catch (error) {
      await removeTattooImage(path).catch(() => {});
      setGalleryMessage(error.message);
    }
  };
  const removeGallery = async (item) => {
    if (!confirm(`Delete ${item.title}?`)) return;
    setGalleryMessage("Deleting…");
    try {
      await deleteTattoo(item.id);
      await removeTattooImage(item.storage_path);
      setGalleryMessage("Tattoo photograph deleted.");
      await onGalleryChanged();
    } catch (error) {
      setGalleryMessage(error.message);
    }
  };
  const addShopProduct = async (e) => {
    e.preventDefault();
    const formElement = e.currentTarget;
    if (!shopFile) return setShopMessage("Choose an image first.");
    const priceCents = Math.round(Number(shopForm.price.replace(",", ".")) * 100);
    const shippingCents = Math.round(Number(shopForm.shipping.replace(",", ".")) * 100);
    if (!Number.isInteger(priceCents) || priceCents < 50) return setShopMessage("Enter a valid price.");
    if (!Number.isInteger(shippingCents) || shippingCents < 0) return setShopMessage("Enter valid shipping costs.");
    setShopMessage("Uploading…");
    const ext = shopFile.name.split(".").pop().toLowerCase();
    const storagePath = `${session.user.id}/${crypto.randomUUID()}.${ext}`;
    try {
      const imageUrl = await uploadShopImage(shopFile, storagePath);
      await insertShopProduct({ title: shopForm.title, description: shopForm.description, price_cents: priceCents, dimensions: shopForm.dimensions, shipping_cents: shippingCents, stock_quantity: Math.max(0, Number(shopForm.stock) || 0), image_url: imageUrl, storage_path: storagePath, active: true });
      setShopForm({ title: "", description: "", price: "", dimensions: "", shipping: "", stock: "1" });
      setShopFile(null);
      formElement.reset();
      setShopMessage("Object published.");
      await onProductsChanged();
    } catch (error) {
      await removeShopImage(storagePath).catch(() => {});
      setShopMessage(error.message);
    }
  };
  const removeShopProduct = async (item) => {
    if (!confirm(`Delete ${item.title}?`)) return;
    setShopMessage("Deleting…");
    try {
      await deleteShopProduct(item.id);
      await removeShopImage(item.storage_path);
      setShopMessage("Object deleted.");
      await onProductsChanged();
    } catch (error) {
      setShopMessage(error.message);
    }
  };
  const logout = () => {
    signOut();
    setSession(null);
  };
  return (
    <main className="admin">
      <section>
        <div className="admin-heading">
          <div>
            <p className="eyebrow">Secure studio access</p>
            <h1>Upload flash</h1>
          </div>
          <button onClick={logout}>
            <LogOut /> Sign out
          </button>
        </div>
        <form onSubmit={add} className="flash-form">
          <label>
            Title
            <input
              name="title"
              required
              value={form.title}
              onChange={change}
              placeholder="Design title"
            />
          </label>
          <label>
            Estimated price
            <input name="price" required value={form.price} onChange={change} />
          </label>
          <label>
            Size
            <input name="size" required value={form.size} onChange={change} />
          </label>
          <label>
            Status
            <select name="status" value={form.status} onChange={change}>
              <option>Available</option>
              <option>Reserved</option>
              <option>Tattooed</option>
            </select>
          </label>
          <label className="file-field">
            Image
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              onChange={(e) => setFile(e.target.files[0])}
            />
          </label>
          <button type="submit">
            <Upload /> Upload flash
          </button>
          {message && <p className="form-message">{message}</p>}
        </form>
        <div className="admin-list">
          {remote.map((x) => (
            <div key={x.id}>
              <img src={x.image} alt="" />
              <span>{x.title}</span>
              <button
                aria-label={`Delete ${x.title}`}
                onClick={() => remove(x)}
              >
                <Trash2 />
              </button>
            </div>
          ))}
          {!remote.length && (
            <p className="empty">
              No uploaded flash yet. The original designs remain available as
              static website content.
            </p>
          )}
        </div>
        <div className="admin-divider" />
        <div className="admin-section-title">
          <p className="eyebrow">Tattoo gallery</p>
          <h2>Upload finished work.</h2>
        </div>
        <form onSubmit={addGallery} className="gallery-form">
          <label>
            Title
            <input
              name="title"
              required
              value={galleryForm.title}
              onChange={(e) => setGalleryForm({ ...galleryForm, title: e.target.value })}
              placeholder="Tattoo title"
            />
          </label>
          <label>
            Placement
            <input
              name="placement"
              value={galleryForm.placement}
              onChange={(e) => setGalleryForm({ ...galleryForm, placement: e.target.value })}
              placeholder="For example: upper arm"
            />
          </label>
          <label className="file-field">
            Photograph
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              onChange={(e) => setGalleryFile(e.target.files[0])}
            />
          </label>
          <button type="submit">
            <Upload /> Upload tattoo
          </button>
          {galleryMessage && <p className="form-message">{galleryMessage}</p>}
        </form>
        <div className="admin-list">
          {gallery.map((item) => (
            <div key={item.id}>
              <img src={item.image_url} alt="" />
              <span>{item.title}{item.placement ? ` · ${item.placement}` : ""}</span>
              <button aria-label={`Delete ${item.title}`} onClick={() => removeGallery(item)}>
                <Trash2 />
              </button>
            </div>
          ))}
          {!gallery.length && <p className="empty">No tattoo photographs uploaded yet.</p>}
        </div>
        <div className="admin-divider" />
        <div className="admin-section-title">
          <p className="eyebrow">Lucid Entom shop</p>
          <h2>Publish an insect work.</h2>
        </div>
        <form onSubmit={addShopProduct} className="flash-form shop-admin-form">
          <label>Title<input required value={shopForm.title} onChange={(e) => setShopForm({ ...shopForm, title: e.target.value })} placeholder="Object title" /></label>
          <label>Price (€)<input required inputMode="decimal" value={shopForm.price} onChange={(e) => setShopForm({ ...shopForm, price: e.target.value })} placeholder="125,00" /></label>
          <label>Stock<input required type="number" min="0" max="20" value={shopForm.stock} onChange={(e) => setShopForm({ ...shopForm, stock: e.target.value })} /></label>
          <label>Dimensions<input required value={shopForm.dimensions} onChange={(e) => setShopForm({ ...shopForm, dimensions: e.target.value })} placeholder="30 × 40 cm" /></label>
          <label>Shipping (€)<input required inputMode="decimal" value={shopForm.shipping} onChange={(e) => setShopForm({ ...shopForm, shipping: e.target.value })} placeholder="9,50" /></label>
          <label className="wide">Description<textarea required rows="4" value={shopForm.description} onChange={(e) => setShopForm({ ...shopForm, description: e.target.value })} placeholder="Materials, process and story…" /></label>
          <label className="file-field">Product image<input type="file" accept="image/jpeg,image/png,image/webp" required onChange={(e) => setShopFile(e.target.files[0])} /></label>
          <button type="submit"><Upload /> Publish object</button>
          {shopMessage && <p className="form-message">{shopMessage}</p>}
        </form>
        <div className="admin-list">
          {products.map((item) => <div key={item.id}><img src={item.image_url} alt="" /><span>{item.title} · €{(item.price_cents / 100).toFixed(2)} · Stock {item.stock_quantity}</span><button aria-label={`Delete ${item.title}`} onClick={() => removeShopProduct(item)}><Trash2 /></button></div>)}
          {!products.length && <p className="empty">No shop objects published yet.</p>}
        </div>
      </section>
    </main>
  );
}
function Missing() {
  return (
    <main className="missing">
      <h1>Page not found.</h1>
      <Link to="/">Back home</Link>
    </main>
  );
}
function App() {
  const [path, setPath] = useState(location.pathname),
    [remote, setRemote] = useState([]),
    [gallery, setGallery] = useState([]),
    [products, setProducts] = useState([]),
    [cartOpen, setCartOpen] = useState(false),
    [cart, setCart] = useState(() => { try { return JSON.parse(localStorage.getItem("lucid-entom-cart")) || []; } catch { return []; } });
  const refresh = async () => {
    try {
      setRemote(await loadRemote());
    } catch (e) {
      console.error(e);
    }
  };
  const refreshGallery = async () => {
    try {
      setGallery(await loadGallery());
    } catch (e) {
      console.error(e);
    }
  };
  const refreshProducts = async () => {
    try {
      setProducts(await loadProducts());
    } catch (e) {
      console.error(e);
    }
  };
  useEffect(() => {
    const f = () => setPath(location.pathname);
    addEventListener("popstate", f);
    refresh();
    refreshGallery();
    refreshProducts();
    return () => removeEventListener("popstate", f);
  }, []);
  useEffect(() => { localStorage.setItem("lucid-entom-cart", JSON.stringify(cart)); }, [cart]);
  function addToCart(product) {
    if (product.stock_quantity < 1) return;
    setCart((current) => current.some((item) => item.id === product.id)
      ? current.map((item) => item.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock_quantity) } : item)
      : [...current, { ...product, quantity: 1 }]);
    setCartOpen(true);
  }
  const items = [...remote, ...seed];
  const page = useMemo(
    () =>
      path === "/" ? (
        <Home items={items} />
      ) : path === "/flash" ? (
        <Flash items={items} />
      ) : path === "/tattoo-gallery" ? (
        <TattooGallery items={gallery} />
      ) : path === "/shop" ? (
        <Shop products={products} Link={Link} onAdd={addToCart} />
      ) : path === "/checkout/success" ? (
        <ShopSuccess Link={Link} onClear={() => setCart([])} />
      ) : path === "/admin/flash" ? (
        <Admin
          remote={remote}
          gallery={gallery}
          products={products}
          onChanged={refresh}
          onGalleryChanged={refreshGallery}
          onProductsChanged={refreshProducts}
        />
      ) : path.startsWith("/shop/") ? (
        <ShopProduct product={products.find((x) => x.id === path.split("/").pop())} Link={Link} onAdd={addToCart} />
      ) : path.startsWith("/flash/") ? (
        <Detail item={items.find((x) => x.id === path.split("/").pop())} />
      ) : (
        <Missing />
      ),
    [path, remote, gallery, products, cart],
  );
  return (
    <>
      <Header cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} onCartOpen={() => setCartOpen(true)} />
      {page}
      <CartDrawer open={cartOpen} items={cart} onClose={() => setCartOpen(false)} onChange={(id, quantity) => setCart((current) => quantity < 1 ? current.filter((item) => item.id !== id) : current.map((item) => item.id === id ? { ...item, quantity: Math.min(quantity, item.stock_quantity) } : item))} onRemove={(id) => setCart((current) => current.filter((item) => item.id !== id))} />
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
