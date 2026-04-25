<!-- SPDX-License-Identifier: MIT -->

# EmPrivacy — Maintainer security review prompt (reusable)

Use this prompt to run a **full application security review** of EmPrivacy as the code evolves. This is meant for the **maintainer of EmPrivacy** and should be updated over time with **new findings, regressions, and new test cases**.

## How to use

1. Paste the entire prompt below into your security review workflow/tool (AI reviewer, human reviewer checklist, or both).
2. Attach the full repository contents (including docs and CI).
3. Require the reviewer to provide **code evidence**, **exploit scenarios**, and **tests** (implemented or proposed).
4. After the review, update this file:
   - Add newly discovered classes of issues to **Project-specific known weak points**.
   - Add new payloads to **Malicious payload test set**.
   - Add new invariant checks to **Consent + script-loading invariants**.

---

## SECURITY REVIEW PROMPT (copy/paste)

You are a senior application security engineer reviewing the open-source EmDash plugin “EmPrivacy” at `https://github.com/mkdolan/EmPrivacy`.

### Goal

Perform a full security review of the EmPrivacy codebase. Identify concrete vulnerabilities, insecure defaults, missing tests, and privacy/security design weaknesses. Prioritize issues that could allow:
- XSS (stored/reflected/DOM), JS injection, HTML/script-context breakouts
- pre-consent tracking or consent bypass
- broken access control on admin and API routes
- CSRF / cross-site request abuse
- injection into storage/log output
- unsafe third-party script loading
- supply-chain compromise (dependencies, build scripts, CI, release process)

### Context (EmPrivacy behavior)

EmPrivacy is an EmDash CMS plugin that provides:
- A cookie consent banner with categories: essential / analytics / marketing
- Client-side loading of third-party scripts **only after consent**
- Admin-configured banner text, policy links, analytics config, marketing script URLs
- Consent versioning stored in a consent cookie named `emprivacy_cc`
- Optional server logging to `/_emdash/api/plugins/emprivacy/record`
- Optional Google Consent Mode v2 behavior

EmDash context:
- EmDash is a TypeScript/Astro CMS.
- Plugins may run in sandboxed Worker isolates with declared capabilities, but EmPrivacy is **trusted** and injects fragments/scripts into public pages.
- Treat the plugin as **security-sensitive** because it injects code into public pages.

### Threat model

Assets:
- Visitor consent state
- Admin plugin configuration (KV)
- Public site DOM integrity
- Consent cookie value
- Optional consent log records
- Plugin API routes (`admin`, `record`)
- EmDash host site integrity
- Visitor privacy expectations and compliance posture

Trust boundaries:
- Admin UI input → persisted plugin configuration
- Stored configuration → public page rendering/injection
- Visitor browser → consent cookie parsing (attacker-controlled)
- Browser POST → `record` endpoint
- Plugin → third-party analytics/marketing scripts
- Trusted plugin registration → EmDash host

Primary threats:
1. Stored XSS through banner copy, labels, URLs, JSON-in-script, admin-configured values, log views, or unsafe DOM APIs.
2. Reflected/DOM XSS through URL parameters, policy links, script URLs, or consent cookie parsing.
3. Loading analytics/marketing scripts before valid consent.
4. Loading scripts from unsafe URLs or protocols.
5. Consent cookie tampering, malformed cookie parsing, stale version acceptance, or fail-open behavior.
6. CSRF or unauthenticated changes to plugin settings.
7. Abuse of the consent logging endpoint.
8. Injection into SQL/KV/storage/log output.
9. Broken access control on admin pages, settings, logs, or API routes.
10. Supply-chain risk from dependencies, build scripts, GitHub Actions, npm publishing, and package metadata.
11. CSP incompatibility or unsafe guidance requiring `unsafe-inline`/`unsafe-eval`.
12. Privacy overcollection or misleading consent behavior.

---

## Review requirements

### 1) Map findings to OWASP Top 10

For each finding, map to:
- A01 Broken Access Control
- A02 Cryptographic Failures
- A03 Injection (including XSS)
- A04 Insecure Design
- A05 Security Misconfiguration
- A06 Vulnerable and Outdated Components
- A07 Identification and Authentication Failures
- A08 Software and Data Integrity Failures
- A09 Security Logging and Monitoring Failures
- A10 Server-Side Request Forgery

If a category is not applicable, explicitly say why.

### 2) Inspect every file

Inspect every:
- source file (`src/**`)
- test file (`**/*.test.*`)
- config file (`tsconfig.json`, `vitest.config.ts`, etc.)
- scripts under `scripts/**`
- GitHub Actions workflow files under `.github/workflows/**`
- release scripts and maintainer docs
- all docs under `docs/**`
- `package.json`, `package-lock.json`, npm packaging metadata (`files`, exports, prepublish hooks)

### 3) Identify every user-controlled input

Enumerate **all inputs** and where they flow:
- Admin-entered banner text (title/message)
- Admin-entered policy URLs (privacy/cookie)
- Analytics provider settings (none/cloudflare/custom)
- Cloudflare token
- Custom analytics script URLs (list)
- Marketing script URLs (list)
- Policy/consent version string
- Consent cookie `emprivacy_cc` (attacker-controlled)
- Request body to `/_emdash/api/plugins/emprivacy/record`
- Any query string, route param, header, origin/referrer, or storage value used by the plugin

### 4) For each input, verify defenses

For each input confirm:
- Type validation and normalization
- Length limits
- Character restrictions where appropriate
- URL parsing with `new URL()`, not regex-only validation
- Rejection of: `javascript:`, `data:`, `blob:`, `file:`, `ftp:`, protocol-relative URLs (`//…`)
- Rejection of CRLF and whitespace/control chars inside URLs
- Rejection of encoded-protocol tricks (whitespace before scheme, mixed-case, `%0d%0a`, etc.)
- Handling of malformed/unicode domains (punycode / IDN) without crashing
- HTML escaping before rendering (text contexts)
- Attribute escaping for attributes
- Safe JSON serialization for inline script contexts (must prevent `</script>` breakouts)
- No direct insertion into `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `Function`, `setTimeout(string)`, `setInterval(string)`
- Safe handling of malformed/null/oversized values (fail closed)

### 5) XSS-specific checks

Search and review all occurrences of:
- `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`
- `eval`, `new Function`, `setTimeout("...")`, `setInterval("...")`
- Any inline `<script>` generation
- Any JSON injected into scripts or HTML

Verify any JSON-in-inline-script escaping covers at minimum:
- `<` (prevents `</script>`)
- `>` and `&` (defense-in-depth for HTML-ish contexts)
- `\u2028` and `\u2029` (JS parsing edge cases in some contexts/tooling)

### 6) Consent enforcement checks (must hold)

Verify the following invariants in implementation and tests:
- Default state **denies analytics and marketing** (strict defaults should be on by default)
- **No analytics/marketing network request occurs before consent**
- Analytics-only consent loads analytics but not marketing
- Marketing-only consent loads marketing but not analytics
- Revocation prevents future script loading; refresh behavior is safe
- Policy version bump invalidates prior consent
- Malformed/oversized consent cookie fails closed and shows the banner
- Scripts are loaded only once and cannot be double-injected unexpectedly

### 7) Cookie checks

Treat the cookie as attacker-controlled. Confirm:
- Cookie contains **no personal data**
- Cookie attributes: `Path=/`, `SameSite=Lax` or stricter, `Secure` on HTTPS
- Max-Age/Expires is documented and appropriate
- Consent cookie schema is **strict**, and invalid values fail closed.
  - Recommended schema: JSON `{ v: string, a: 0|1|boolean, m: 0|1|boolean }`
  - Reject extra fields if they affect logic
  - Enforce a reasonable size cap (e.g. <= 1KB) before parsing

### 8) Admin/API access-control checks

Confirm:
- All settings-changing routes require authenticated EmDash admin access with appropriate role.
- Read access to logs/settings is admin-only.
- Public record endpoint, if intentionally anonymous, accepts only a narrow schema and cannot change settings.
- CSRF protections or same-origin checks exist for state-changing routes (especially public routes).
- CORS behavior does not enable cross-site abuse.

### 9) Storage/injection checks

Review all KV/storage calls. Confirm:
- No user input is used as table/column names without allowlisting
- Records/log display escapes all stored values
- Log retention/minimization is documented
- Rate limiting / abuse considerations for public endpoints are documented or implemented

### 10) Third-party script loading checks

Confirm:
- Only admin-configured **https** URLs are loaded
- Consider optional allowlist or host validation
- No arbitrary admin HTML is allowed
- Script attributes are safely constructed
- If feasible, consider integrity/crossorigin support (or document why it’s not)
- Document supply-chain risk of third-party scripts clearly

### 11) SSRF checks

Confirm the plugin does not server-fetch admin-provided URLs.
If any server-side fetch exists, require SSRF defenses:
- only https
- deny localhost/private IPs
- constrain redirects
- timeouts and size limits

### 12) CSP and browser-security checks

Identify required CSP directives. Prefer designs that:
- avoid `unsafe-inline` and `unsafe-eval`
- can support nonce/hash in the future

Confirm no secrets are exposed to the client (e.g. tokens intended to be secret).

### 13) Dependency and build checks (commands required)

Run and report outputs:
- `npm ci`
- `npm run typecheck`
- `npm run build`
- `npm test`
- `npm audit --omit=dev`

Review:
- `package.json` scripts for unsafe behavior
- GitHub Actions permissions and pinned actions
- package exports, published files, npm ignore/files, and release process
- dependency freshness and unnecessary dependencies

### 14) Testing deliverables

Add or propose tests for:
- validation and escaping (`jsonForHtmlScript`, URL parsing)
- cookie parsing: malformed, oversized, schema violations, and version mismatch
- policy-version behavior
- malicious payload suite (below)
- record endpoint body validation and method restrictions
- browser/E2E proof: **no network requests** to analytics/marketing before consent (Playwright suggested)

---

## Malicious payload test set (keep expanding)

Add tests (unit/E2E) for these inputs as applicable:

- `<script>alert(1)</script>`
- `<img src=x onerror=alert(1)>`
- `" onmouseover="alert(1)`
- `</script><script>alert(1)</script>`
- `javascript:alert(1)`
- `data:text/html,<script>alert(1)</script>`
- `https://example.com/%0d%0aSet-Cookie:x=y`
- `https://example.com/%0D%0ASet-Cookie:x=y`
- `https://example.com/\nset-cookie:x=y`
- `https://user:pass@example.com/x.js` (reject userinfo)
- `https://example.com/\u2028alert(1)` (ensure escaping doesn’t break scripts)

---

## Project-specific known weak points (update after each review)

These are EmPrivacy-specific hotspots that should always be scrutinized:

- **Inline bootstrap script** in `page:fragments` that:
  - embeds config as JSON into an inline script
  - reads/parses the consent cookie (attacker-controlled)
  - conditionally injects third-party `<script src=...>` tags
- **Consent cookie parsing must be strict**: avoid “truthy” values that could be attacker-crafted to enable scripts (e.g. `{a:"1"}`).
- **Script URL validation must reject**:
  - non-https schemes
  - whitespace/control chars and CRLF
  - protocol-relative forms
  - userinfo (`https://user:pass@host/...`)
  - unbounded list sizes / overly long URLs
- **Public record endpoint**: schema locked down, method restricted to POST, should not become a write-anything sink (log poisoning / storage bloat).
- **Admin log rendering**: any stored values displayed in admin must remain safe (no HTML interpretation).

---

## Output format required from the reviewer

For each finding, provide:
- Title
- Severity: Critical / High / Medium / Low / Informational
- OWASP category
- Affected file(s) and function(s)
- Exploit scenario
- Evidence from code
- Recommended fix
- Suggested test case
- Whether the fix was implemented or only recommended

After findings, provide:
1. Concise risk summary
2. OWASP Top 10 mapping table (or equivalent structured mapping)
3. List of all user inputs and whether validation/sanitization is adequate
4. Prioritized remediation plan
5. Exact commands run and results
6. Assumptions / areas not reviewed (should be “none” for a full review)

