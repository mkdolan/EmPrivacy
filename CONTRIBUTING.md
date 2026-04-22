<!-- SPDX-License-Identifier: MIT -->

# Contributing to EmPrivacy

Thanks for helping improve EmPrivacy.

## Principles

- Scope: trusted `page:fragments` CMP, KV-backed admin (Block Kit), no arbitrary admin HTML execution on the public site (see the main [README](./README.md#requirements) and [docs/TESTING.md](./docs/TESTING.md)).
- Match patterns from [`@emdash-cms/plugin-audit-log`](https://www.npmjs.com/package/@emdash-cms/plugin-audit-log): `tsdown`, `PluginDescriptor` + `sandbox-entry`, `definePlugin`.
- Keep the default surface small: do not add `network:fetch` unless a feature truly needs it.

## Local setup

```bash
npm install
npm run typecheck
npm run build
```

## Pull requests

1. Describe the behavior change and how you tested it (EmDash version, trusted `plugins: []`).
2. Run `npm run typecheck`, `npm run build`, and `npm test` before pushing.
3. Keep commits focused; avoid unrelated formatting changes.

## Security

- Never inject unsanitized admin strings into `innerHTML` in the public bootstrap; use `textContent` / JSON config as we do now.
- Script URLs must remain **https-only** and validated on save.
