// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
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
	});

	it("merges partial objects", () => {
		const n = normalizeConfig({ policyVersion: "2026-04", bannerTitle: "Hi" });
		expect(n.policyVersion).toBe("2026-04");
		expect(n.bannerTitle).toBe("Hi");
		expect(n.privacyPolicyUrl).toBe("/privacy");
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
		analyticsUrlsText: "https://cdn.example/a.js",
		marketingUrlsText: "",
		googleConsentMode: false,
		logConsentToServer: false,
	};

	it("accepts valid https URLs", () => {
		const c = assertValidSavedConfig(base);
		expect(c.analyticsScriptUrls).toEqual(["https://cdn.example/a.js"]);
		expect(c.privacyPolicyUrl).toBe("https://privacy.example/p");
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

	it("rejects non-https privacy URL", () => {
		expect(() =>
			assertValidSavedConfig({ ...base, privacyPolicyUrl: "http://x.example" }),
		).toThrow(/https/);
	});

	it("rejects invalid analytics URL", () => {
		expect(() =>
			assertValidSavedConfig({
				...base,
				analyticsUrlsText: "http://bad.example/x.js",
			}),
		).toThrow(/analytics/);
	});
});

describe("jsonForHtmlScript", () => {
	it("escapes less-than for HTML embedding", () => {
		const s = jsonForHtmlScript({ x: "</script>" });
		expect(s).not.toContain("</script>");
		expect(s).toContain("\\u003c");
	});
});
