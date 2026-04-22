<!-- SPDX-License-Identifier: MIT -->

# Getting started with EmPrivacy

This guide is for site builders who want cookie consent working on an **EmDash** site without reading plugin source.

## What you get

- A **banner** on first visit (or after you change **Policy / consent version**).
- Toggles for **Analytics** and **Marketing** (essential/theme cookies are not blocked by this plugin—see the main README).
- **Privacy and cookie policy links** you control: usually an EmDash **Page** via a short **path** (e.g. `/privacy`) or a full `https://` link. Paths are turned into full URLs using EmDash’s URL helper so they work in dev and production.
- **Third-party scripts** only from URLs you enter (one `https://` URL per line); they load **after** consent for that category.

## Before you begin

1. An EmDash site with `emdash` in `astro.config` ([plugins overview](https://docs.emdashcms.com/plugins/overview/)).
2. Ability to edit **`astro.config`** and redeploy (or run locally).

---

## Step 1 — Install the package

```bash
npm install emprivacy
```

---

## Step 2 — Add the plugin to Astro

Open `astro.config.mjs` (or `.ts`).

1. Import the plugin:

   ```ts
   import { emprivacyPlugin } from "emprivacy";
   ```

2. Add **`emprivacyPlugin()`** to **`emdash({ plugins: [...] })`**. Put **EmPrivacy first** if you use other plugins that inject scripts or metadata.

   ```ts
   emdash({
     plugins: [
       emprivacyPlugin(),
       // ...other plugins
     ],
   }),
   ```

3. Save and restart the dev server (or rebuild).

---

## Step 3 — Layout must include EmDash hooks

Your base layout must include EmDash’s head/body injection points (e.g. `<EmDashHead />`, `<EmDashBodyStart />`, `<EmDashBodyEnd />` or your theme’s equivalents). Otherwise the banner may not render. See [EmDash docs](https://docs.emdashcms.com/).

---

## Step 4 — Create or pick your Privacy Policy Page (EmDash)

If you already have a **Page** for your privacy policy:

1. Open that Page on the **public site** (or preview) and look at the **path** in the address bar — for example `https://yoursite.com/privacy` → use **`/privacy`**.  
2. In **EmPrivacy** settings, paste that path into **Privacy policy — EmDash Page path or https URL** (or paste a full `https://…` URL if the policy is not an EmDash Page).

If you still need a Page: create and publish a Page in EmDash, note its URL path, then enter that path in EmPrivacy as above.

Same idea for an optional **Cookie policy** field: path (e.g. `/cookies`) or `https://…`.

**Not accepted:** bare domains (`example.com`), `http://…` URLs, or protocol-relative links (`//…`). Use **`/your-path`** or **`https://…`**.

---

## Step 5 — Configure EmPrivacy in the admin

1. Log into the **site admin**.
2. Open **EmPrivacy** (shield icon).
3. Set:
   - **Privacy policy** — path or `https` (see Step 4).
   - **Cookie policy** — optional; same rules.
   - **Banner title** and **Short notice**.
   - **Policy / consent version** — bump when you change legal text so visitors see the banner again.
   - **Analytics** / **Marketing script URLs** — one **`https://`** URL per line, or leave blank.
4. Optional: **Strict defaults**, **Google Consent Mode v2**, **Log consent to server** (see main README).
5. **Save settings**.

---

## Step 6 — Verify on the public site

1. Use a **private/incognito** window (or clear site cookies).
2. Confirm the **banner** appears.
3. Click **Privacy policy** (and **Cookie policy** if set): they should open the EmDash Page or external URL you configured.
4. In **Developer tools → Network**: before accepting, listed third-party scripts should not load; after consent, they should load only for the categories you allowed.
5. Reload: the banner should stay dismissed if the cookie matches your **Policy / consent version**.

---

## Step 7 — Testing before go-live

Run automated checks if you develop the plugin or CI:

```bash
npm run typecheck && npm run build && npm test
```

For a full staging checklist (banner, strict mode, admin, optional logging, Google), see **[TESTING.md](./TESTING.md)**.

---

## Common problems

| Problem | What to check |
|--------|----------------|
| Nothing appears | EmDash layout missing head/body components; plugin not in `plugins: []`; dev server restarted after config change |
| Scripts load before consent | No hard-coded third-party scripts in the theme; EmPrivacy listed **before** those plugins in `plugins` |
| EmPrivacy missing in admin | Plugin not installed or `astro.config` wrong; check build errors |
| Save fails on privacy/cookie | Value must be a **root-relative path** (`/something`) or **`https://…`** (not `http://` or a bare hostname) |
| Privacy link 404 or wrong page | Path must match the live EmDash route (compare with the address bar when viewing that Page) |
| Link works on staging but path looks wrong | Paths are resolved with EmDash `ctx.url()`; ensure the Page is published and the path matches production routing |

---

## More reading

- Main **[README](../README.md)** — disclaimer, features table, registration order, full testing section  
- **[TESTING.md](./TESTING.md)** — pre-deploy QA and CI  
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** — how to contribute
