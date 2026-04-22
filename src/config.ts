// SPDX-License-Identifier: MIT

/**
 * EmPrivacy KV document (`consent:config`) and shared helpers.
 */

export const KV_KEY = "consent:config" as const;
export const COOKIE_NAME = "emprivacy_cc" as const;
export const PLUGIN_ID = "emprivacy" as const;

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
	/** Third-party script URLs loaded only after analytics consent (https only) */
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
	analyticsScriptUrls: [],
	marketingScriptUrls: [],
	googleConsentMode: false,
	logConsentToServer: false,
};

function isHttpsUrl(s: string): boolean {
	try {
		const u = new URL(s);
		return u.protocol === "https:";
	} catch {
		return false;
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
	if (/\s/.test(t)) return false;
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

export function normalizeConfig(raw: unknown): EmprivacyConfig {
	if (typeof raw !== "object" || raw === null) return { ...DEFAULT_CONFIG };
	const o = raw as Record<string, unknown>;
	const analytics = Array.isArray(o.analyticsScriptUrls)
		? o.analyticsScriptUrls.filter((x): x is string => typeof x === "string")
		: DEFAULT_CONFIG.analyticsScriptUrls;
	const marketing = Array.isArray(o.marketingScriptUrls)
		? o.marketingScriptUrls.filter((x): x is string => typeof x === "string")
		: DEFAULT_CONFIG.marketingScriptUrls;
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
	analyticsUrlsText: string;
	marketingUrlsText: string;
	googleConsentMode: boolean;
	logConsentToServer: boolean;
}): EmprivacyConfig {
	if (!input.policyVersion.trim()) throw new Error("Policy version is required.");
	const privacyPolicyUrl = input.privacyPolicyUrl.trim();
	if (!isValidPolicyHrefInput(privacyPolicyUrl)) {
		throw new Error(
			"Privacy policy must be a full https:// URL or a site path to your EmDash Page (e.g. /privacy).",
		);
	}

	let cookiePolicyUrl = input.cookiePolicyUrl.trim();
	if (cookiePolicyUrl && !isValidPolicyHrefInput(cookiePolicyUrl)) {
		throw new Error(
			"Cookie policy must be a valid https:// URL or a root-relative path (e.g. /cookies), or empty.",
		);
	}
	if (!cookiePolicyUrl) cookiePolicyUrl = DEFAULT_CONFIG.cookiePolicyUrl;

	const analyticsScriptUrls: string[] = [];
	for (const u of parseUrlList(input.analyticsUrlsText)) {
		if (!isHttpsUrl(u)) throw new Error(`Invalid analytics script URL (https only): ${u}`);
		analyticsScriptUrls.push(u);
	}
	const marketingScriptUrls: string[] = [];
	for (const u of parseUrlList(input.marketingUrlsText)) {
		if (!isHttpsUrl(u)) throw new Error(`Invalid marketing script URL (https only): ${u}`);
		marketingScriptUrls.push(u);
	}

	return normalizeConfig({
		bannerTitle: input.bannerTitle.trim() || DEFAULT_CONFIG.bannerTitle,
		bannerMessage: input.bannerMessage.trim() || DEFAULT_CONFIG.bannerMessage,
		privacyPolicyUrl,
		cookiePolicyUrl,
		strictDefaults: input.strictDefaults,
		policyVersion: input.policyVersion.trim(),
		analyticsScriptUrls,
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
	return JSON.stringify(value).replace(/</g, "\\u003c");
}

export interface EmprivacyPublicRuntimeConfig {
	bannerTitle: string;
	bannerMessage: string;
	privacyPolicyUrl: string;
	cookiePolicyUrl: string;
	strictDefaults: boolean;
	policyVersion: string;
	analyticsScriptUrls: string[];
	marketingScriptUrls: string[];
	googleConsentMode: boolean;
	logConsent: boolean;
	recordPath: string;
}
