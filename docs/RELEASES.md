<!-- SPDX-License-Identifier: MIT -->

# Releases and versioning

Published **npm** versions of `emprivacy` follow **[Semantic Versioning 2.0.0](https://semver.org/)** (`MAJOR.MINOR.PATCH`).

## What each bump means

| Level | When to use it |
|--------|----------------|
| **PATCH** | Bug fixes and safe internal refactors; no intentional behavior or API contract change for integrators. |
| **MINOR** | New features, new optional admin fields, or additive exports; existing sites keep working without config changes unless they opt in. |
| **MAJOR** | Breaking changes for site authors or the plugin contract (e.g. renamed exports, changed hook shapes, cookie JSON shape, required EmDash peer range). |

**Pre-1.0 (`0.x.y`):** Per the semver spec, anything may change; in practice we still use **patch / minor / major** as above so upgrades are predictable. Treat **minor** bumps as the place we may ship breaking changes until `1.0.0`, and read the release notes before upgrading.

**Policy / consent version** (in the EmDash admin) is separate from package semver: it only re-prompts visitors when your legal text or choices change.

## Safe publishing (npm)

These guards keep published tarballs consistent with `package.json` and avoid shipping stale or missing `dist/` output.

- **`dist/` is not committed** — It is listed in `.gitignore`. Build artifacts are produced locally, in CI, and **immediately before publish** via lifecycle scripts.
- **`prepublishOnly` and `preversion`** — Run `sync:version` (keeps `src/version.ts` aligned with `package.json`), `typecheck`, `build`, `test`, and **`verify:exports`** (confirms every path in `main` / `exports` exists on disk after the build).
- **Install range** — Pin consumers with semver as needed, e.g. `emprivacy@^0.1.0`.

Before publishing, you can inspect the tarball:

```bash
npm run build
npm pack --dry-run
```

## Cutting a release (maintainers)

1. Ensure `main` (or your release branch) is green: `npm ci`, then `npm run typecheck`, `npm run build`, `npm test`.
2. Bump the package and create a git tag (the `preversion` script runs checks again):

   ```bash
   npm run release:patch   # 0.1.0 → 0.1.1
   # or
   npm run release:minor   # 0.1.0 → 0.2.0
   # or
   npm run release:major   # 0.1.0 → 1.0.0
   ```

   Alternatively: `npm version patch|minor|major` (same effect).

3. Publish to npm (requires registry login and publish rights):

   ```bash
   npm publish
   ```

4. Push the version commit and tag:

   ```bash
   git push --follow-tags
   ```

5. On GitHub, open **Releases → Draft a new release**, choose the new tag (e.g. `v0.1.1`), title it `v0.1.1`, and summarize user-facing changes.

## Tags

Release tags use the **`v` prefix** (e.g. `v0.1.0`) to match `npm version` defaults and common GitHub Release practice.

## Consumers

Pin with a range that matches your risk tolerance, for example:

```bash
npm install emprivacy@^0.1.0
```

`^0.1.0` allows newer **patch** and **minor** releases on the `0.1` line; adjust after `1.0.0` per your semver policy.
