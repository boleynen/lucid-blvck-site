# Lucid Blvck website

Exportable React/Vite reconstruction of the published Lucid Blvck ChatGPT Site.

## Included

- Home, responsive navigation, about, Instagram embeds and booking links.
- Complete flash overview with all 15 recovered original images.
- Individual flash pages with hover zoom.
- A secured `/admin/flash` dashboard for flash, tattoo gallery and shop products.
- **Lucid Entom** shop at `/shop`, with a separate visual identity, cart and Stripe Checkout.
- Netlify, Vercel and GitHub Pages custom-domain files for `lucidblvck.be`.

## Run locally

```bash
npm install
npm run dev
```

Create a production build with `npm run build`.

## Reconstruction notes

The public layout, text and image assets were recovered from the published site. ChatGPT Sites does not expose its editable source project, database, authentication or upload storage as an export. The public pages were therefore reconstructed in React. Original flash images are local and no longer depend on ChatGPT Sites.

The admin page stores edits in the current browser only. Do not expose it as a real CMS without authentication, database storage and file storage. Some exact flash price/size values were not visible in the overview and are marked `On request`; the known Lady size is preserved. Instagram remains embedded from Instagram and booking remains hosted at Tally.

## Recommended hosting

Netlify is the simplest option: import the GitHub repository, accept the detected settings, add `lucidblvck.be` and `www.lucidblvck.be`, then enter only the DNS records Netlify provides at the domain registrar. Vercel is also supported. GitHub Pages can use the included `CNAME`, but SPA route handling is less convenient.

## Secure flash admin with Supabase

The `/admin/flash` page supports a real email/password login, database records and image uploads. Setup is intentionally locked to an allowlisted administrator.

1. Create a Supabase project.
2. Open SQL Editor and run `supabase/setup.sql` once.
3. In Authentication → Users, create your own user with email and password.
4. Copy that user's UUID. In SQL Editor run:

```sql
insert into public.admin_users(user_id) values('YOUR-USER-UUID');
```

5. In Project Settings → API, copy the Project URL and publishable key.
6. In Netlify → Project configuration → Environment variables, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
7. Trigger a new Netlify deploy, then sign in at `/admin/flash`.

Never expose a Supabase secret/service-role key through a variable beginning with `VITE_`: those variables are bundled into the browser. The SQL policies allow public reading of flash records but restrict uploads, edits and deletes to UUIDs present in `admin_users`.

## Lucid Entom shop setup

The shop treats each insect artwork as a physical product. Stock defaults to one, but can be changed in the admin dashboard.

1. In Supabase SQL Editor, run `supabase/shop-setup.sql` once.
2. In Netlify → Project configuration → Environment variables, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY` (server-only; a legacy `SUPABASE_SERVICE_ROLE_KEY` also works)
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
3. In Stripe Workbench → Webhooks, create an endpoint at:

```text
https://lucidblvck.be/.netlify/functions/lucid-stripe-webhook
```

Subscribe it to `checkout.session.completed` and `checkout.session.async_payment_succeeded`, then copy its signing secret into `STRIPE_WEBHOOK_SECRET` in Netlify.
4. Redeploy the site. Add products at `/admin/flash`; customers can then buy them at `/shop`.

Prices and stock are always read again on the server before Stripe Checkout is created. Stripe and Supabase secret keys are used only by the Netlify functions and must never be added to frontend code or committed to Git.

## Multiple photos and cover selection

Before deploying the multi-photo admin, run `supabase/multi-photo-setup.sql` in the Supabase SQL Editor (after `setup.sql` and `shop-setup.sql`). It adds photo albums to tattoo projects and shop products, retaining existing cover images. It can be rerun safely.

In `/admin`, use **Add photos** to select or append up to 12 JPG, PNG or WebP files (10 MB each). Choose **Cover photo** below a preview; you can remove photos before publishing. The selected cover appears in listings, the cart and checkout. Visitors can browse all photos in the tattoo lightbox and shop product detail. Existing single-photo records remain supported.
