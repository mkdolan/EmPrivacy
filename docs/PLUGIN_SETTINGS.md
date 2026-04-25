<!-- SPDX-License-Identifier: MIT -->

# EmPrivacy — Plugin settings reference

This page documents every field on the **EmPrivacy** admin settings page (shield icon → **EmPrivacy**).

It’s written for site owners and maintainers who want to understand:

- What each setting **does**
- What input format is expected (with **examples**)
- What public-site behavior changes when you change it

> Note: EmPrivacy is a technical implementation tool, not legal advice. You are responsible for configuring categories and scripts consistently with your privacy/cookie policies and applicable laws.

---

## Banner settings

### Banner title

- **What it is**: The heading shown at the top of the cookie banner and the reopen panel.
- **Example**: `Cookies & privacy`
- **Behavior**: Updates visible banner UI copy only (no effect on consent logic).

### Short notice

- **What it is**: The banner message text shown under the title.
- **Example**: `We use cookies to run this site and optionally for analytics and marketing. You can accept or customize your choices.`
- **Behavior**: Updates visible banner UI copy only (no effect on consent logic).

---

## Policy links (shown in the banner)

These links are rendered as “Privacy policy” (and optionally “Cookie policy”) in the banner and reopen panel.

### Privacy policy — EmDash Page path or https URL

- **What it is**: Where your privacy policy lives.
- **Allowed inputs**:
  - A **root-relative path** to an EmDash Page (resolved to a full URL by EmDash at runtime), for example:
    - `/privacy`
  - A full **`https://…`** URL, for example:
    - `https://example.com/privacy`
- **Not accepted**:
  - `http://…`
  - `example.com/privacy` (missing scheme)
  - `//example.com/privacy` (protocol-relative)
  - paths without a leading slash like `privacy`
- **Behavior**:
  - Controls where the “Privacy policy” link in the banner opens.
  - Does not change consent cookie format or script loading.

### Cookie policy (optional) — path or https URL

- **What it is**: Optional link to a separate cookie policy.
- **Allowed inputs**: same rules as the privacy policy field.
- **Example**: `/cookies` or `https://example.com/cookies`
- **Behavior**:
  - When set, the banner shows an additional “Cookie policy” link.
  - When blank, no cookie-policy link is shown.

---

## Consent versioning

### Policy / consent version

- **What it is**: A version string stored into the consent cookie. When you change it, existing visitors are prompted again.
- **Example values**:
  - `1`
  - `2026-04-25`
  - `v3`
- **Behavior**:
  - EmPrivacy stores consent as a cookie like `{ v, a, m }` where `v` is your policy version and `a/m` represent analytics/marketing choices.
  - If a visitor has an older cookie version (or no cookie), the banner will show again.
  - Use this when you materially change your privacy/cookie policy text, tracking vendors, or categories.

---

## Defaults and consent UX

### Strict defaults (require opt-in for analytics & marketing)

- **What it is**: Controls whether the default state of the banner toggles is **off** (opt-in) or **on** (opt-out).
- **Example**:
  - Enabled: analytics + marketing start **off**
  - Disabled: analytics + marketing start **on**
- **Behavior**:
  - **Enabled**: The initial banner loads with analytics and marketing toggles **unchecked** by default.
  - **Disabled**: The initial banner loads with analytics and marketing toggles **checked** by default.
  - This only affects the initial default state before the visitor makes a choice; once a cookie is set, the stored choice is used.

---

## Analytics settings

Analytics scripts only load after the visitor consents to **Analytics** (unless you hard-code scripts elsewhere in your site/theme, which you should avoid).

### Analytics platform

- **What it is**: Chooses where analytics scripts come from.
- **Options**:
  - **Cloudflare Web Analytics**: loads Cloudflare’s beacon **after Analytics consent** (requires a site token).
  - **None**: never loads third-party analytics scripts via EmPrivacy.
  - **Custom**: loads your provided `https://` script URLs **after Analytics consent**.
- **Behavior**:
  - Changing this alters which scripts are injected when Analytics consent is granted.
  - This does not affect Marketing scripts (those are separate).

### Cloudflare Web Analytics site token

- **What it is**: The token Cloudflare gives you for your site under Cloudflare → Web Analytics.
- **Example**: a Cloudflare token string copied from your dashboard (do not add quotes).
- **Behavior**:
  - When Analytics consent is granted and **Analytics platform = Cloudflare**, EmPrivacy injects Cloudflare’s standard beacon script with the `data-cf-beacon` attribute.
  - If the token is blank, EmPrivacy will have nothing to inject for Cloudflare analytics even if consent is granted.

### Custom analytics script URLs (one https URL per line, not a `<script>` tag)

- **What it is**: A list of third-party analytics scripts to load after Analytics consent, when **Analytics platform = Custom**.
- **Format**: one full **`https://…`** URL per line (the script `src`), no HTML.
- **Example**:

  ```text
  https://cdn.example.com/analytics.js
  https://static.example.net/vendor/tracker.min.js
  ```

- **Behavior**:
  - When Analytics consent is granted, EmPrivacy injects each URL as `<script src="…">` into the document.
  - When Analytics consent is denied, these scripts are not injected by EmPrivacy.

---

## Marketing settings

Marketing scripts only load after the visitor consents to **Marketing**.

### Marketing script URLs (one https URL per line, not a `<script>` tag)

- **What it is**: A list of third-party marketing scripts to load after Marketing consent.
- **Format**: one full **`https://…`** URL per line (the script `src`), no HTML.
- **Example**:

  ```text
  https://cdn.example.com/pixel.js
  https://static.example.net/ads/retargeting.js
  ```

- **Behavior**:
  - When Marketing consent is granted, EmPrivacy injects each URL as `<script src="…">`.
  - When Marketing consent is denied, these scripts are not injected by EmPrivacy.

---

## Google integrations (optional)

### Google Consent Mode v2 (denied defaults in head; updates after choice)

- **What it is**: Enables Google Consent Mode v2 integration.
- **Behavior**:
  - When enabled, EmPrivacy emits a “denied by default” consent configuration early (in `<head>`).
  - After the visitor chooses, EmPrivacy calls `gtag("consent","update", …)` to reflect Analytics/Marketing choices.
  - This is only meaningful if your site uses `gtag`/Google tags; you should validate behavior using Google tooling/docs.

---

## Server-side logging (optional)

### Log consent choices to the server (minimal record; no IP stored)

- **What it is**: If enabled, EmPrivacy will send a minimal consent snapshot to the server when a visitor saves a choice.
- **Behavior**:
  - When enabled, the browser sends a POST to the EmPrivacy record endpoint with:
    - the current policy version
    - whether analytics was allowed
    - whether marketing was allowed
  - The settings page will additionally show **Recent consent records** (up to 15), newest first.
  - When disabled, EmPrivacy does not attempt to log consent server-side and the “Recent consent records” section will not appear.

