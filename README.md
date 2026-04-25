<!-- SPDX-License-Identifier: MIT -->

# EmPrivacy

**EmPrivacy** is an open source [EmDash](https://github.com/emdash-cms/emdash) plugin that adds a cookie consent banner, category-based choices (essential / analytics / marketing), and **client-side** loading of third-party scripts only after consent. It aligns with common regulatory expectations when you configure it honestly and pair it with proper legal documents—but **this software is not legal advice** (see [Disclaimer](#legal-disclaimer)).

## Requirements

- **EmDash** `^0.5.0` (**tested with `0.7.0`**; re-test on your deployed minor when upgrading).
- Plugins registered in **`astro.config`** in **trusted** mode (the `plugins: []` array).  
  **Sandboxed** marketplace plugins **cannot** use `page:fragments`; EmPrivacy needs `page:inject` so the banner and scripts can be injected on public pages. See [Plugin System Overview](https://docs.emdashcms.com/plugins/overview/).

## Install

```bash
npm install emprivacy
```

Use a **semver range** if you want controlled upgrades, for example `emprivacy@^0.1.0`. Versioning policy and maintainer release steps: [docs/RELEASES.md](docs/RELEASES.md).

Or use a Git dependency / `npm link` while developing.

## Quick start

1. **Register the plugin** in `astro.config.mjs` (or `.ts`) **before** other plugins that inject marketing or analytics, so consent runs first:

   ```ts
   import { defineConfig } from "astro/config";
   import { emdash } from "emdash/astro";
   import { emprivacyPlugin } from "emprivacy";

   export default defineConfig({
     integrations: [
       emdash({
         plugins: [emprivacyPlugin()],
       }),
     ],
   });
   ```

2. **Use EmDash page integration** in your layout so fragments render: include `<EmDashHead />`, `<EmDashBodyStart />`, `<EmDashBodyEnd />` (or your theme’s equivalents). See [EmDash docs](https://docs.emdashcms.com/).

3. **Configure EmPrivacy in the admin** (shield → **EmPrivacy**):
   - **Privacy policy** — Point to your existing EmDash **Page** using its **public path** (what you see in the address bar when that Page is open, e.g. `/privacy`), **or** a full `https://…` URL if the policy is hosted elsewhere. Root-relative paths are resolved with EmDash `ctx.url()` so links stay correct across environments.
   - **Cookie policy** (optional) — Same rules: EmDash Page path or `https://…`.
   - Set banner copy, **Policy / consent version**, **Analytics** (Cloudflare site token, **None**, or **Custom** `https` URLs), and **Marketing** script URLs (`https`, one per line). See [GETTING_STARTED](docs/GETTING_STARTED.md#step-5--configure-emprivacy-in-the-admin).

See [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) for a step-by-step path from “create a Page” to “verify the link in the banner.”

Visitors see a banner on first visit (or when you bump **Policy / consent version**). Configured analytics (e.g. Cloudflare beacon) and marketing scripts load only **after** the user consents to the matching category.

## Features

| Feature | Description |
|--------|-------------|
| Categories | Essential (informational), **Analytics**, **Marketing** |
| Privacy / cookie links | EmDash **Page** as a root path (e.g. `/privacy`) or external `https://` URL; paths resolve via `ctx.url()` in hooks so public URLs stay correct when the site origin changes |
| Analytics platforms | **Cloudflare Web Analytics** — enter your site token; the beacon is injected with `data-cf-beacon` after consent. **None** / **Custom** (`https` URLs) also supported; more platforms can be added over time |
| Marketing scripts | Only **https** URLs you list are injected as `<script src>` after marketing consent—no arbitrary admin HTML |
| Re-open preferences | After the first choice, a **cookie button** (bottom-left) re-opens the same options; saving from that panel **reloads** the page so script loading matches the latest consent (including revoking) |
| Consent cookie | `emprivacy_cc` (`path=/`, `SameSite=Lax`, `Secure` on HTTPS), JSON `{ v, a, m }` (version, analytics, marketing) |
| Optional server log | POST consent snapshots to `/_emdash/api/plugins/emprivacy/record` + optional storage rows (no IP in v1) |
| Google Consent Mode v2 | Optional denied defaults in `<head>` + `gtag('consent','update',…)` — validate with [Google’s docs](https://support.google.com/tagmanager/answer/13695607) |

## Legal disclaimer

EmPrivacy helps you implement **technical** consent UX and script loading patterns used for regulations such as **GDPR** and **CCPA/CIPA**. **You** remain responsible for:

- Privacy notices, cookie policies, and lawful bases  
- What data your analytics/marketing vendors collect  
- Whether your configuration meets obligations in your jurisdictions  

**This project does not provide legal advice.** If you need certainty, consult a qualified attorney or privacy professional.

## Registration order

Put **`emprivacyPlugin()` early** in the `plugins` array so `page:metadata` / `page:fragments` run before other plugins that add trackers or metadata.

## Development

```bash
npm install
npm run typecheck   # TypeScript
npm run build       # ESM + types in dist/
npm test            # Unit tests (see Testing)
npm run test:watch  # Vitest in watch mode (optional)
```

Outputs ESM under `dist/` with typings, matching the [plugin layout](https://www.npmjs.com/package/@emdash-cms/plugin-audit-log) used by other EmDash packages.

Dependency, audit, and deprecation context (Kysely override, `npm audit`): [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Testing

### Automated (local or CI)

| Command | Purpose |
|---------|---------|
| `npm run typecheck` | Types against `emdash` and this package |
| `npm run build` | `tsdown` → `dist/` and `exports` |
| `npm test` | [Vitest](https://vitest.dev/) tests for `src/config.ts`: URL lists, `normalizeConfig`, policy **path vs https** validation, `resolvePolicyHref`, `jsonForHtmlScript` |

Automation does **not** start EmDash or a browser; it guards packaging and validation logic.

**Suggested CI:**

```bash
npm ci
npm run typecheck
npm run build
npm test
```

### Staging / manual (before production)

EmPrivacy uses EmDash KV, admin Block Kit, `page:fragments`, and plugin routes. Validate on a **real EmDash site** (staging) at the EmDash version you deploy.

- **[docs/TESTING.md](docs/TESTING.md)** — Full pre-deploy checklist, flows to exercise, limits of automation.  
- **No E2E in this repo** — nothing here launches EmDash or drives a browser.

### Acceptance checklist (manual QA)

Details: [docs/TESTING.md](docs/TESTING.md).

- [ ] `typecheck`, `build`, and `npm test` pass
- [ ] Banner when no cookie or **Policy / consent version** mismatch
- [ ] **Privacy (and cookie) links** open the right EmDash Page or external URL; paths match what you see in the browser for that Page
- [ ] Strict mode: no analytics/marketing scripts until consent (Network tab)
- [ ] Cookie persists; bumping policy version shows the banner again
- [ ] Admin save updates the public banner
- [ ] Optional: server logging + recent records in admin
- [ ] Optional: Google Consent Mode (Tag Assistant / [Google](https://support.google.com/tagmanager/answer/13695607))
- [ ] **Trusted** `plugins: []` (see [Requirements](#requirements))

## Releases

npm releases follow **[Semantic Versioning](https://semver.org/)** (`MAJOR.MINOR.PATCH`). Tags are `v`-prefixed (e.g. `v0.1.0`). See [docs/RELEASES.md](docs/RELEASES.md) for bump rules, `npm version` / `npm run release:*`, and publish checklist.

## License

MIT — see [LICENSE](LICENSE).
