// SPDX-License-Identifier: MIT

/**
 * EmPrivacy KV document (`consent:config`) and shared helpers.
 */

export const KV_KEY = "consent:config" as const;
export const COOKIE_NAME = "emprivacy_cc" as const;
export const PLUGIN_ID = "emprivacy" as const;

/** How analytics scripts are chosen after the user consents to analytics. */
export type AnalyticsProvider = "cloudflare" | "none" | "custom";

export interface EmprivacyConfig {
	bannerTitle: string;
	bannerMessage: string;
	/**
	 * Privacy policy location: full `https://…` URL **or** a root-relative path to an EmDash **Page**
	 * (e.g. `/privacy`) resolved with `ctx.url()` on the server.
	 */
	privacyPolicyUrl: string;
	/** Optional cookie policy: same rules as `privacyPolicyUrl` (https URL or path like `/cookies`) */
	cookiePolicyUrl: string;
	/** When true, analytics/marketing require explicit opt-in in the UI */
	strictDefaults: boolean;
	/** Bump to invalidate client consent cookies and re-show the banner */
	policyVersion: string;
	/**
	 * Analytics when `cloudflare` — **site token** from Cloudflare → Web Analytics (injected with `data-cf-beacon`).
	 * Public in the same way as a normal site embed. Empty means no Cloudflare script until a token is saved.
	 */
	cloudflareWebAnalyticsToken: string;
	/**
	 * Which analytics load path to use after consent. `cloudflare` = beacon + `cloudflareWebAnalyticsToken`;
	 * `custom` = `analyticsScriptUrls` only; `none` = no third-party analytics scripts.
	 */
	analyticsProvider: AnalyticsProvider;
	/** When `analyticsProvider` is `custom`, these https script URLs load after analytics consent. */
	analyticsScriptUrls: string[];
	/** Third-party script URLs loaded only after marketing consent (https only) */
	marketingScriptUrls: string[];
	/** Emit Google Consent Mode v2 defaults (denied) in head; updates after choice */
	googleConsentMode: boolean;
	/** POST consent snapshots to the plugin record route and optional storage */
	logConsentToServer: boolean;
}

export const DEFAULT_CONFIG: EmprivacyConfig = {
	bannerTitle: "Cookies & privacy",
	bannerMessage:
		"We use cookies to run this site and optionally for analytics and marketing. You can accept or customize your choices.",
	privacyPolicyUrl: "/privacy",
	cookiePolicyUrl: "",
	strictDefaults: true,
	policyVersion: "1",
	cloudflareWebAnalyticsToken: "",
	analyticsProvider: "cloudflare",
	analyticsScriptUrls: [],
	marketingScriptUrls: [],
	googleConsentMode: false,
	logConsentToServer: false,
};

function hasUnsafeUrlChars(s: string): boolean {
	// Reject ASCII control chars and whitespace (incl. newlines and tabs).
	return /[\u0000-\u001F\u007F\s]/.test(s);
}

function isHttpsUrl(s: string): boolean {
	try {
		const t = s.trim();
		if (!t) return false;
		if (hasUnsafeUrlChars(t)) return false;
		// Block common percent-encoded control characters / whitespace to avoid surprising parsing.
		if (/%0d|%0a|%09|%0b|%0c|%20/i.test(t)) return false;
		const u = new URL(t);
		if (u.protocol !== "https:") return false;
		// Avoid surprising/unsafe URL forms.
		if (u.username || u.password) return false;
		return true;
	} catch {
		return false;
	}
}

function invalidScriptUrlError(kind: "analytics" | "marketing", u: string): string {
	if (u.includes("<") || u.includes(">")) {
		return `Invalid ${kind} script URL (https only). Paste one full https:// URL per line (the script src only), not a <script> tag or HTML comment. Example: https://static.cloudflareinsights.com/beacon.min.js. The invalid line was: ${u}`;
	}
	return `Invalid ${kind} script URL (https only): ${u}`;
}

function isAnalyticsProvider(s: string): s is AnalyticsProvider {
	return s === "cloudflare" || s === "none" || s === "custom";
}

/** Reject characters that would break JSON or attributes; allow typical Cloudflare site token strings. */
export function assertValidCloudflareToken(t: string): void {
	const s = t.trim();
	if (s.length === 0) return;
	if (s.length > 256) throw new Error("Cloudflare site token is too long.");
	if (/[\s<>'"&]/.test(s)) {
		throw new Error("Cloudflare site token contains invalid characters.");
	}
}

/**
 * Root-relative public path (EmDash page route), e.g. `/privacy`.
 * Rejects protocol-relative URLs (`//…`) and whitespace.
 */
export function isRootRelativeSitePath(s: string): boolean {
	const t = s.trim();
	if (t.length === 0) return false;
	if (!t.startsWith("/")) return false;
	if (t.startsWith("//")) return false;
	if (hasUnsafeUrlChars(t)) return false;
	return true;
}

/** For hooks: turn stored path or absolute URL into a public absolute URL. */
export function resolvePolicyHref(
	stored: string,
	ctx: { url: (path: string) => string },
): string {
	const t = stored.trim();
	if (!t) return t;
	if (isRootRelativeSitePath(t)) return ctx.url(t);
	return t;
}

export function isValidPolicyHrefInput(s: string): boolean {
	const t = s.trim();
	if (!t) return false;
	return isHttpsUrl(t) || isRootRelativeSitePath(t);
}

export function parseUrlList(text: string): string[] {
	const lines = text
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter(Boolean);
	return [...new Set(lines)];
}

function assertLength(label: string, s: string, min: number, max: number): void {
	const t = s.trim();
	if (t.length < min) throw new Error(`${label} is required.`);
	if (t.length > max) throw new Error(`${label} is too long.`);
}

function assertOptionalLength(label: string, s: string, max: number): void {
	const t = s.trim();
	if (t.length > max) throw new Error(`${label} is too long.`);
}

export function normalizeConfig(raw: unknown): EmprivacyConfig {
	if (typeof raw !== "object" || raw === null) return { ...DEFAULT_CONFIG };
	const o = raw as Record<string, unknown>;
	const analytics = Array.isArray(o.analyticsScriptUrls)
		? o.analyticsScriptUrls.filter((x): x is string => typeof x === "string")
		: DEFAULT_CONFIG.analyticsScriptUrls;
	const marketing = Array.isArray(o.marketingScriptUrls)
		? o.marketingScriptUrls.filter((x): x is string => typeof x === "string")
		: DEFAULT_CONFIG.marketingScriptUrls;

	const cfTok =
		typeof o.cloudflareWebAnalyticsToken === "string" ? o.cloudflareWebAnalyticsToken : "";
	const apCandidate = typeof o.analyticsProvider === "string" ? o.analyticsProvider.trim() : "";
	let analyticsProvider: AnalyticsProvider;
	if (isAnalyticsProvider(apCandidate)) {
		analyticsProvider = apCandidate;
	} else if (analytics.length > 0) {
		analyticsProvider = "custom";
	} else {
		analyticsProvider = DEFAULT_CONFIG.analyticsProvider;
	}
	return {
		bannerTitle: typeof o.bannerTitle === "string" ? o.bannerTitle : DEFAULT_CONFIG.bannerTitle,
		bannerMessage:
			typeof o.bannerMessage === "string" ? o.bannerMessage : DEFAULT_CONFIG.bannerMessage,
		privacyPolicyUrl:
			typeof o.privacyPolicyUrl === "string" ? o.privacyPolicyUrl : DEFAULT_CONFIG.privacyPolicyUrl,
		cookiePolicyUrl:
			typeof o.cookiePolicyUrl === "string" ? o.cookiePolicyUrl : DEFAULT_CONFIG.cookiePolicyUrl,
		strictDefaults:
			typeof o.strictDefaults === "boolean" ? o.strictDefaults : DEFAULT_CONFIG.strictDefaults,
		policyVersion:
			typeof o.policyVersion === "string" && o.policyVersion.length > 0
				? o.policyVersion
				: DEFAULT_CONFIG.policyVersion,
		cloudflareWebAnalyticsToken: cfTok,
		analyticsProvider,
		analyticsScriptUrls: analytics,
		marketingScriptUrls: marketing,
		googleConsentMode:
			typeof o.googleConsentMode === "boolean" ? o.googleConsentMode : DEFAULT_CONFIG.googleConsentMode,
		logConsentToServer:
			typeof o.logConsentToServer === "boolean"
				? o.logConsentToServer
				: DEFAULT_CONFIG.logConsentToServer,
	};
}

/** Validate admin-submitted fields; throws an Error with a short message on failure */
export function assertValidSavedConfig(input: {
	bannerTitle: string;
	bannerMessage: string;
	privacyPolicyUrl: string;
	cookiePolicyUrl: string;
	strictDefaults: boolean;
	policyVersion: string;
	analyticsPlatform: string;
	cloudflareToken: string;
	analyticsUrlsText: string;
	marketingUrlsText: string;
	googleConsentMode: boolean;
	logConsentToServer: boolean;
}): EmprivacyConfig {
	assertLength("Policy version", input.policyVersion, 1, 64);
	assertOptionalLength("Banner title", input.bannerTitle, 120);
	assertOptionalLength("Short notice", input.bannerMessage, 600);

	const privacyPolicyUrl = input.privacyPolicyUrl.trim();
	if (!isValidPolicyHrefInput(privacyPolicyUrl)) {
		throw new Error(
			"Privacy policy must be a full https:// URL or a site path to your EmDash Page (e.g. /privacy).",
		);
	}
	if (privacyPolicyUrl.length > 2048) throw new Error("Privacy policy URL/path is too long.");

	let cookiePolicyUrl = input.cookiePolicyUrl.trim();
	if (cookiePolicyUrl && !isValidPolicyHrefInput(cookiePolicyUrl)) {
		throw new Error(
			"Cookie policy must be a valid https:// URL or a root-relative path (e.g. /cookies), or empty.",
		);
	}
	if (cookiePolicyUrl.length > 2048) throw new Error("Cookie policy URL/path is too long.");
	if (!cookiePolicyUrl) cookiePolicyUrl = DEFAULT_CONFIG.cookiePolicyUrl;

	const ap = input.analyticsPlatform.trim() || "cloudflare";
	if (!isAnalyticsProvider(ap)) {
		throw new Error("Analytics: choose a supported option (Cloudflare, None, or Custom).");
	}
	const tokenTrim = input.cloudflareToken.trim();
	if (ap === "cloudflare") {
		assertValidCloudflareToken(tokenTrim);
	}

	const analyticsScriptUrls: string[] = [];
	if (ap === "custom") {
		const list = parseUrlList(input.analyticsUrlsText);
		if (list.length > 50) throw new Error("Analytics script URL list is too long (max 50).");
		for (const u of list) {
			if (u.length > 2048) throw new Error(invalidScriptUrlError("analytics", u));
			if (!isHttpsUrl(u)) throw new Error(invalidScriptUrlError("analytics", u));
			analyticsScriptUrls.push(u);
		}
	}
	const marketingScriptUrls: string[] = [];
	const mlist = parseUrlList(input.marketingUrlsText);
	if (mlist.length > 50) throw new Error("Marketing script URL list is too long (max 50).");
	for (const u of mlist) {
		if (u.length > 2048) throw new Error(invalidScriptUrlError("marketing", u));
		if (!isHttpsUrl(u)) throw new Error(invalidScriptUrlError("marketing", u));
		marketingScriptUrls.push(u);
	}

	return normalizeConfig({
		bannerTitle: input.bannerTitle.trim() || DEFAULT_CONFIG.bannerTitle,
		bannerMessage: input.bannerMessage.trim() || DEFAULT_CONFIG.bannerMessage,
		privacyPolicyUrl,
		cookiePolicyUrl,
		strictDefaults: input.strictDefaults,
		policyVersion: input.policyVersion.trim(),
		analyticsProvider: ap,
		cloudflareWebAnalyticsToken: ap === "cloudflare" ? tokenTrim : "",
		analyticsScriptUrls: ap === "custom" ? analyticsScriptUrls : [],
		marketingScriptUrls,
		googleConsentMode: input.googleConsentMode,
		logConsentToServer: input.logConsentToServer,
	});
}

export interface ConsentRecordPayload {
	createdAt: string;
	policyVersion: string;
	analytics: boolean;
	marketing: boolean;
}

/** Safe to embed in `<script type="application/json">` (breakout-safe) */
export function jsonForHtmlScript(value: unknown): string {
	return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (c) => {
		switch (c) {
			case "<":
				return "\\u003c";
			case ">":
				return "\\u003e";
			case "&":
				return "\\u0026";
			case "\u2028":
				return "\\u2028";
			case "\u2029":
				return "\\u2029";
			default:
				return c;
		}
	});
}

export interface EmprivacyPublicRuntimeConfig {
	bannerTitle: string;
	bannerMessage: string;
	privacyPolicyUrl: string;
	cookiePolicyUrl: string;
	strictDefaults: boolean;
	policyVersion: string;
	/** Same values as `EmprivacyConfig` — public by design (mirrors a normal head embed) */
	analyticsProvider: AnalyticsProvider;
	/** Non-empty when using Cloudflare Web Analytics */
	cloudflareToken: string;
	analyticsScriptUrls: string[];
	marketingScriptUrls: string[];
	googleConsentMode: boolean;
	logConsent: boolean;
	recordPath: string;
}
