<!-- SPDX-License-Identifier: MIT -->

# Testing EmPrivacy before deploy

Testing is split into **automated** checks (CI-friendly) and **manual** checks that require a running EmDash site, because the plugin integrates with EmDash’s runtime, KV, storage, admin Block Kit, and public page pipeline.

## Automated (in this repo)

| Command | What it verifies |
|--------|-------------------|
| `npm run typecheck` | TypeScript types against `emdash` APIs |
| `npm run build` | Bundles ESM + declarations (`dist/`) |
| `npm test` | Unit tests for **pure** helpers in `src/config.ts` (validation, normalization, URL list parsing, JSON escaping) |

These scripts do **not** start EmDash or exercise `page:fragments`, admin routes, or the consent cookie in a browser. They catch regressions in config/save validation and packaging early.

## Manual integration QA (required before production)

Use a **staging** EmDash Astro app with `emprivacyPlugin()` in `plugins: []`, layout wires (`EmDashHead` / body components), and the same EmDash version you plan to ship.

Work through the checklist from the main [README](../README.md) (also copied below). Record pass/fail and browser + EmDash versions.

### Core flows

1. **Banner** — Incognito window: banner appears when there is no `emprivacy_cc` cookie or when **Policy / consent version** in admin does not match the cookie’s `v` field.
2. **Re-open consent** — After dismissing the banner, confirm a **cookie button** appears (bottom-left). Click it: the same options appear; **Save choices** (or Accept/Reject) reloads the page. After reload, **Network** should list analytics scripts only if analytics is on; turn analytics off, save, reload, and those scripts should not run. If you use **Cloudflare Web Analytics** in admin, after consent confirm `beacon.min.js` loads and the tag includes `data-cf-beacon` with your token.
3. **Strict defaults** — With strict mode on, deny non-essential and confirm configured analytics/marketing URLs do **not** appear in Network until the user accepts (or enables those categories in Customize).
4. **Persistence** — After accept, reload: banner stays closed; scripts load according to saved choices (Network tab).
5. **Admin** — EmPrivacy settings page loads, **Save** persists; public banner text and links match what you saved (after refresh / new request).
6. **Optional server log** — Enable “Log consent…”; submit consent; confirm a row appears under recent records and `POST /_emdash/api/plugins/emprivacy/record` succeeds (200, `{ ok: true }`) in Network.
7. **Optional Google Consent Mode** — Enable in admin; verify a denied-default snippet exists in `<head>` before interaction, and updates after choice (see [Google’s Consent Mode docs](https://support.google.com/tagmanager/answer/13695607)).

### Regression triggers

- Bump EmDash minor: re-run manual QA (plugin APIs and admin routing can change).
- Bump this plugin’s **npm semver** after changing hooks or cookie shape: re-check banner and cookie JSON. Release numbering policy: [RELEASES.md](./RELEASES.md).

## CI suggestion

```bash
npm ci
npm run typecheck
npm run build
npm test
```

## Future improvements (not in v1)

- **Integration tests** against EmDash’s `adaptSandboxEntry` + mock `PluginContext` (heavy; depends on EmDash test utilities if exposed).
- **E2E** (Playwright) against a minimal EmDash fixture app in CI (slower, higher maintenance).

For most teams, **automated unit tests + staging manual QA** is the right balance.

