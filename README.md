# Lucid Blvck website

Exportable React/Vite reconstruction of the published Lucid Blvck ChatGPT Site.

## Included

- Home, responsive navigation, about, Instagram embeds and booking links.
- Complete flash overview with all 15 recovered original images.
- Individual flash pages with hover zoom.
- A clearly labelled local `/admin/flash` prototype.
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
