// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
	assertValidCloudflareToken,
	assertValidSavedConfig,
	isRootRelativeSitePath,
	jsonForHtmlScript,
	normalizeConfig,
	parseUrlList,
	resolvePolicyHref,
} from "./config.js";

describe("parseUrlList", () => {
	it("splits lines, trims, dedupes", () => {
		expect(parseUrlList("https://a.test/x\n  https://b.test/y \nhttps://a.test/x")).toEqual([
			"https://a.test/x",
			"https://b.test/y",
		]);
	});

	it("handles CRLF", () => {
		expect(parseUrlList("https://a.test/1\r\nhttps://b.test/2")).toEqual([
			"https://a.test/1",
			"https://b.test/2",
		]);
	});
});

describe("normalizeConfig", () => {
	it("returns defaults for non-object input", () => {
		const n = normalizeConfig(null);
		expect(n.policyVersion).toBe("1");
		expect(n.analyticsScriptUrls).toEqual([]);
		expect(n.analyticsProvider).toBe("cloudflare");
		expect(n.cloudflareWebAnalyticsToken).toBe("");
	});

	it("merges partial objects", () => {
		const n = normalizeConfig({ policyVersion: "2026-04", bannerTitle: "Hi" });
		expect(n.policyVersion).toBe("2026-04");
		expect(n.bannerTitle).toBe("Hi");
		expect(n.privacyPolicyUrl).toBe("/privacy");
	});

	it("infers custom when legacy analyticsScriptUrls only", () => {
		const n = normalizeConfig({ analyticsScriptUrls: ["https://a.test/x.js"] });
		expect(n.analyticsProvider).toBe("custom");
		expect(n.analyticsScriptUrls).toEqual(["https://a.test/x.js"]);
	});
});

describe("isRootRelativeSitePath", () => {
	it("accepts EmDash-style paths", () => {
		expect(isRootRelativeSitePath("/privacy")).toBe(true);
		expect(isRootRelativeSitePath("/legal/cookies")).toBe(true);
	});
	it("rejects protocol-relative and non-paths", () => {
		expect(isRootRelativeSitePath("//evil.example/x")).toBe(false);
		expect(isRootRelativeSitePath("https://a.test/x")).toBe(false);
		expect(isRootRelativeSitePath("relative.html")).toBe(false);
	});
});

describe("resolvePolicyHref", () => {
	it("resolves paths with ctx.url", () => {
		const ctx = { url: (p: string) => `https://mysite.test${p}` };
		expect(resolvePolicyHref("/privacy", ctx)).toBe("https://mysite.test/privacy");
	});
	it("passes through https URLs", () => {
		const ctx = { url: () => "" };
		expect(resolvePolicyHref("https://a.example/doc", ctx)).toBe("https://a.example/doc");
	});
});

describe("assertValidSavedConfig", () => {
	const base = {
		bannerTitle: "T",
		bannerMessage: "M",
		privacyPolicyUrl: "https://privacy.example/p",
		cookiePolicyUrl: "",
		strictDefaults: true,
		policyVersion: "1",
		analyticsPlatform: "custom",
		cloudflareToken: "",
		analyticsUrlsText: "https://cdn.example/a.js",
		marketingUrlsText: "",
		googleConsentMode: false,
		logConsentToServer: false,
	};

	it("accepts valid https URLs for custom analytics", () => {
		const c = assertValidSavedConfig(base);
		expect(c.analyticsProvider).toBe("custom");
		expect(c.analyticsScriptUrls).toEqual(["https://cdn.example/a.js"]);
		expect(c.privacyPolicyUrl).toBe("https://privacy.example/p");
	});

	it("accepts Cloudflare platform with site token", () => {
		const c = assertValidSavedConfig({
			...base,
			analyticsPlatform: "cloudflare",
			cloudflareToken: "fd1a6145ed17476caba48ada7af9f45f",
			analyticsUrlsText: "",
		});
		expect(c.analyticsProvider).toBe("cloudflare");
		expect(c.cloudflareWebAnalyticsToken).toBe("fd1a6145ed17476caba48ada7af9f45f");
		expect(c.analyticsScriptUrls).toEqual([]);
	});

	it("rejects Cloudflare token with invalid characters", () => {
		expect(() =>
			assertValidSavedConfig({
				...base,
				analyticsPlatform: "cloudflare",
				cloudflareToken: "bad<token",
				analyticsUrlsText: "",
			}),
		).toThrow(/invalid characters/);
	});

	it("accepts root-relative EmDash Page path for privacy", () => {
		const c = assertValidSavedConfig({ ...base, privacyPolicyUrl: "/privacy-policy" });
		expect(c.privacyPolicyUrl).toBe("/privacy-policy");
	});

	it("rejects empty policy version", () => {
		expect(() =>
			assertValidSavedConfig({ ...base, policyVersion: "  " }),
		).toThrow(/Policy version/);
	});

	it("rejects too-long policy version", () => {
		expect(() =>
			assertValidSavedConfig({ ...base, policyVersion: "x".repeat(100) }),
		).toThrow(/too long/i);
	});

	it("rejects non-https privacy URL", () => {
		expect(() =>
			assertValidSavedConfig({ ...base, privacyPolicyUrl: "http://x.example" }),
		).toThrow(/https/);
	});

	it("rejects invalid analytics URL for custom", () => {
		expect(() =>
			assertValidSavedConfig({
				...base,
				analyticsUrlsText: "http://bad.example/x.js",
			}),
		).toThrow(/analytics/);
	});

	it("rejects pasted HTML and suggests a plain https URL for custom", () => {
		expect(() =>
			assertValidSavedConfig({
				...base,
				analyticsUrlsText: '<script src="https://x.test/a.js">',
			}),
		).toThrow(/Paste one full https:\/\//);
	});

	it("rejects script URLs with whitespace/control characters", () => {
		expect(() =>
			assertValidSavedConfig({
				...base,
				analyticsUrlsText: "https://cdn.example/a.js\r\nSet-Cookie:x=y",
			}),
		).toThrow(/Invalid analytics script URL/);
	});

	it("rejects script URLs with percent-encoded newlines", () => {
		expect(() =>
			assertValidSavedConfig({
				...base,
				analyticsUrlsText: "https://cdn.example/a.js%0d%0aSet-Cookie:x=y",
			}),
		).toThrow(/Invalid analytics script URL/);
	});

	it("rejects too many marketing URLs", () => {
		const many = Array.from({ length: 60 }, (_, i) => `https://cdn.example/${i}.js`).join("\n");
		expect(() =>
			assertValidSavedConfig({
				...base,
				analyticsPlatform: "none",
				analyticsUrlsText: "",
				marketingUrlsText: many,
			}),
		).toThrow(/Marketing script URL list is too long/);
	});
});

describe("assertValidCloudflareToken", () => {
	it("allows empty", () => {
		expect(() => assertValidCloudflareToken("  ")).not.toThrow();
	});
	it("allows hex-style token", () => {
		expect(() => assertValidCloudflareToken("fd1a6145ed17476caba48ada7af9f45f")).not.toThrow();
	});
});

describe("jsonForHtmlScript", () => {
	it("escapes less-than for HTML embedding", () => {
		const s = jsonForHtmlScript({ x: "</script>" });
		expect(s).not.toContain("</script>");
		expect(s).toContain("\\u003c");
	});

	it("escapes >, &, and line separators for inline script safety", () => {
		const s = jsonForHtmlScript({ x: ">\u2028\u2029&" });
		expect(s).toContain("\\u003e");
		expect(s).toContain("\\u2028");
		expect(s).toContain("\\u2029");
		expect(s).toContain("\\u0026");
	});
});
