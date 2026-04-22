<!-- SPDX-License-Identifier: MIT -->

# Development — dependencies and security

## What EmPrivacy ships to npm

Runtime dependencies for the published package are **`zod`** only. **EmDash** is a **peer dependency** (your site installs it). The **`emdash`** package in this repo’s `devDependencies` exists so local `typecheck` and tests can resolve `import … from "emdash"`.

## `npm audit` and the Kysely override

The `emdash` dev dependency pulls in a SQL stack that historically resolved **`kysely@0.27.x`**, which is affected by advisories (for example [GHSA-wmrf-hv6w-mr66](https://github.com/advisories/GHSA-wmrf-hv6w-mr66) and [GHSA-8cpq-38p9-67gx](https://github.com/advisories/GHSA-8cpq-38p9-67gx)) until patched releases.

**This repository pins a safe Kysely** via `overrides` in the root `package.json` (currently `0.28.16`, which is at or above the patched range for those issues). Regenerate the lockfile with `npm install` after changing overrides.

- Full dev tree: `npm audit` should report **0 vulnerabilities** after a clean `npm ci`.
- Production install only: `npm audit --omit=dev` reflects **only** published runtime deps (currently `zod`).

## Deprecation warnings you may still see

`npm install` or `npm ci` can still print **npm deprecated** messages for **transitive** packages **not** maintained by this repo, for example:

- **`prebuild-install`** — pulled in by `better-sqlite3` (used by `emdash`). The [package is deprecated](https://www.npmjs.com/package/prebuild-install) pending upstream changes in native addons.
- **`node-domexception`** — used under the [libsql / fetch](https://www.npmjs.com/package/node-domexception) client stack; the package is deprecated in favor of native `DOMException` in newer Node.

Those warnings do not imply that EmPrivacy’s own source is outdated; they track **upstream** `emdash` and its dependencies. Re-run `npm audit` to confirm there are no known vulnerabilities for your install.
