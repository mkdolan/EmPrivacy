// SPDX-License-Identifier: MIT

import { definePlugin } from "emdash";
import type {
	PageFragmentContribution,
	PageFragmentEvent,
	PageMetadataContribution,
	PageMetadataEvent,
	PluginContext,
} from "emdash";
import { z } from "zod";

import {
	assertValidSavedConfig,
	type EmprivacyConfig,
	COOKIE_NAME,
	KV_KEY,
	normalizeConfig,
	PLUGIN_ID,
	type EmprivacyPublicRuntimeConfig,
	type ConsentRecordPayload,
	resolvePolicyHref,
} from "./config.js";

const ADMIN_SETTINGS_PATH = "/settings";
const SAVE_ACTION_ID = "emprivacy-save";

const recordInput = z.object({
	policyVersion: z.string().min(1),
	analytics: z.boolean(),
	marketing: z.boolean(),
});

async function loadConfig(ctx: PluginContext): Promise<EmprivacyConfig> {
	const raw = (await ctx.kv.get(KV_KEY)) as string | null;
	if (!raw) return normalizeConfig({});
	try {
		return normalizeConfig(JSON.parse(raw));
	} catch {
		return normalizeConfig({});
	}
}

async function saveConfigString(ctx: PluginContext, json: string): Promise<void> {
	await ctx.kv.set(KV_KEY, json);
}

/** Path-only record URL for browser fetch (same origin). */
function recordPathForSite(): string {
	return `/_emdash/api/plugins/${PLUGIN_ID}/record`;
}

/** Absolute URL for metadata / banner; paths resolved via EmDash `ctx.url()`. */
function absolutePolicyHref(stored: string, ctx: PluginContext): string | null {
	const r = resolvePolicyHref(stored, ctx).trim();
	if (!r) return null;
	try {
		const u = new URL(r);
		if (u.protocol !== "https:" && u.protocol !== "http:") return null;
		return r;
	} catch {
		return null;
	}
}

function buildGoogleConsentHeadScript(): string {
	return `(function(){window.dataLayer=window.dataLayer||[];function g(){window.dataLayer.push(arguments);}window.gtag=g;g("consent","default",{"analytics_storage":"denied","ad_storage":"denied","ad_user_data":"denied","ad_personalization":"denied","functionality_storage":"granted","security_storage":"granted","personalization_storage":"denied"});})();`;
}

/**
 * Public-site bootstrap: no HTML from admin strings in DOM APIs beyond JSON.parse —
 * banner copy is applied with textContent / createTextNode.
 */
function buildBodyBootstrap(pr: EmprivacyPublicRuntimeConfig): string {
	const jsonLiteral = JSON.stringify(pr).replace(/</g, "\\u003c");

	return `(function(){
var C=${jsonLiteral};
var CN="${COOKIE_NAME}";
function readCookie(){
try{
var m=document.cookie.match(new RegExp("(?:^|;\\\\s*)"+CN+"=([^;]*)"));
return m?decodeURIComponent(m[1]):"";
}catch(e){return"";}
}
function writeCookie(val){
var secure=document.location.protocol==="https:"?"; Secure":"";
document.cookie=CN+"="+encodeURIComponent(val)+"; Path=/; SameSite=Lax"+secure+"; Max-Age=31536000";
}
function parseState(s){
try{return JSON.parse(s);}catch(e){return null;}
}
function needBanner(){
var c=parseState(readCookie());
if(!c||c.v!==C.policyVersion)return true;
return false;
}
function loadScript(src){
var e=document.createElement("script");
e.src=src;e.async=true;e.referrerPolicy="no-referrer-when-downgrade";
document.head.appendChild(e);
}
function applyScripts(a,m){
if(a)C.analyticsScriptUrls.forEach(loadScript);
if(m)C.marketingScriptUrls.forEach(loadScript);
}
function gtagUpdate(a,m){
if(!C.googleConsentMode||!window.gtag)return;
window.gtag("consent","update",{
analytics_storage:a?"granted":"denied",
ad_storage:m?"granted":"denied",
ad_user_data:m?"granted":"denied",
ad_personalization:m?"granted":"denied",
personalization_storage:m?"granted":"denied"
});
}
function logServer(a,m){
if(!C.logConsent)return;
var p=C.recordPath;
fetch(p,{
method:"POST",
credentials:"same-origin",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({policyVersion:C.policyVersion,analytics:!!a,marketing:!!m})
}).catch(function(){});
}
function hide(el){if(el)el.setAttribute("hidden","");el&&(el.style.display="none");}
function show(el){if(el)el.removeAttribute("hidden");el&&(el.style.display="");}
function mount(){
var root=document.getElementById("emprivacy-root");
if(!root)return;
if(!needBanner()){var st=parseState(readCookie());applyScripts(st&&st.a,st&&st.m);gtagUpdate(st&&st.a,st&&st.m);return;}
var bar=document.createElement("div");
bar.className="emprivacy-bar";
bar.setAttribute("role","dialog");
bar.setAttribute("aria-modal","false");
var title=document.createElement("h2");
title.className="emprivacy-title";
title.appendChild(document.createTextNode(C.bannerTitle));
var msg=document.createElement("p");
msg.className="emprivacy-msg";
msg.appendChild(document.createTextNode(C.bannerMessage));
var opts=document.createElement("div");
opts.className="emprivacy-opts";
opts.setAttribute("hidden","");
var aOn=C.strictDefaults?false:true;
var mOn=C.strictDefaults?false:true;
function mkRow(label,id,on){
var w=document.createElement("label");
w.className="emprivacy-switch";
var cb=document.createElement("input");
cb.type="checkbox";cb.id=id;cb.checked=on;
w.appendChild(cb);
w.appendChild(document.createTextNode(" "+label));
return {wrap:w,box:cb};
}
var er=mkRow("Analytics","emprivacy-a",aOn);
var mr=mkRow("Marketing","emprivacy-m",mOn);
opts.appendChild(er.wrap);opts.appendChild(mr.wrap);
var actions=document.createElement("div");
actions.className="emprivacy-actions";
function persist(a,m){
var payload=JSON.stringify({v:C.policyVersion,a:a?1:0,m:m?1:0});
writeCookie(payload);
applyScripts(a,m);gtagUpdate(a,m);logServer(a,m);hide(bar);
}
var btnAll=document.createElement("button");
btnAll.type="button";btnAll.className="emprivacy-btn emprivacy-btn-primary";
btnAll.appendChild(document.createTextNode("Accept all"));
btnAll.addEventListener("click",function(){persist(true,true);});
var btnRej=document.createElement("button");
btnRej.type="button";btnRej.className="emprivacy-btn";
btnRej.appendChild(document.createTextNode("Reject non-essential"));
btnRej.addEventListener("click",function(){persist(false,false);});
var btnCust=document.createElement("button");
btnCust.type="button";btnCust.className="emprivacy-btn";
btnCust.appendChild(document.createTextNode("Customize"));
btnCust.addEventListener("click",function(){show(opts);btnSave.removeAttribute("hidden");});
var btnSave=document.createElement("button");
btnSave.type="button";btnSave.className="emprivacy-btn emprivacy-btn-primary";
btnSave.setAttribute("hidden","");
btnSave.appendChild(document.createTextNode("Save choices"));
btnSave.addEventListener("click",function(){persist(!!er.box.checked,!!mr.box.checked);});
var links=document.createElement("div");
links.className="emprivacy-links";
function addLink(href,text){
if(!href)return;var ok=href.indexOf("https://")===0||href.indexOf("http://")===0;if(!ok)return;
var a=document.createElement("a");
a.href=href;a.rel="nofollow noopener";
a.target="_blank";a.appendChild(document.createTextNode(text));
links.appendChild(a);
}
addLink(C.privacyPolicyUrl,"Privacy policy");
if(C.cookiePolicyUrl)addLink(C.cookiePolicyUrl,"Cookie policy");
actions.appendChild(btnAll);actions.appendChild(btnRej);actions.appendChild(btnCust);actions.appendChild(btnSave);
bar.appendChild(title);bar.appendChild(msg);bar.appendChild(links);bar.appendChild(opts);bar.appendChild(actions);
root.appendChild(bar);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);
else mount();
})();`;
}

export default definePlugin({
	hooks: {
		"plugin:install": async (_e: unknown, ctx: PluginContext) => {
			const existing = (await ctx.kv.get(KV_KEY)) as string | null;
			if (!existing) {
				await saveConfigString(ctx, JSON.stringify(normalizeConfig({})));
				ctx.log.info("EmPrivacy: seeded default configuration");
			}
		},
		"page:metadata": {
			handler: async (
				_e: PageMetadataEvent,
				ctx: PluginContext,
			): Promise<PageMetadataContribution | PageMetadataContribution[] | null> => {
				const cfg = await loadConfig(ctx);
				const out: PageMetadataContribution[] = [];
				const privacyHref = absolutePolicyHref(cfg.privacyPolicyUrl, ctx);
				if (privacyHref) {
					out.push({
						kind: "link",
						rel: "site.standard.document",
						href: privacyHref,
						key: "emprivacy:privacy",
					});
				}
				const cookieHref = cfg.cookiePolicyUrl
					? absolutePolicyHref(cfg.cookiePolicyUrl, ctx)
					: null;
				if (cookieHref) {
					out.push({
						kind: "meta",
						name: "cookie-policy",
						content: cookieHref,
						key: "emprivacy:cookie-meta",
					});
				}
				return out.length ? out : null;
			},
		},
		"page:fragments": {
			handler: async (
				_e: PageFragmentEvent,
				ctx: PluginContext,
			): Promise<PageFragmentContribution | PageFragmentContribution[] | null> => {
				const cfg = await loadConfig(ctx);
				const privacyResolved = absolutePolicyHref(cfg.privacyPolicyUrl, ctx) ?? "";
				const cookieResolved = cfg.cookiePolicyUrl
					? absolutePolicyHref(cfg.cookiePolicyUrl, ctx) ?? ""
					: "";
				const pr: EmprivacyPublicRuntimeConfig = {
					bannerTitle: cfg.bannerTitle,
					bannerMessage: cfg.bannerMessage,
					privacyPolicyUrl: privacyResolved,
					cookiePolicyUrl: cookieResolved,
					strictDefaults: cfg.strictDefaults,
					policyVersion: cfg.policyVersion,
					analyticsScriptUrls: cfg.analyticsScriptUrls,
					marketingScriptUrls: cfg.marketingScriptUrls,
					googleConsentMode: cfg.googleConsentMode,
					logConsent: cfg.logConsentToServer,
					recordPath: recordPathForSite(),
				};

				const style: PageFragmentContribution = {
					kind: "html",
					placement: "body:end",
					key: "emprivacy:style",
					html: `<style id="emprivacy-style">
#emprivacy-root{font-family:system-ui,sans-serif;font-size:14px}
.emprivacy-bar{position:fixed;z-index:99999;left:0;right:0;bottom:0;background:#111;color:#eee;padding:16px 20px 20px;box-shadow:0 -4px 24px rgba(0,0,0,.25);max-height:45vh;overflow:auto}
.emprivacy-title{margin:0 0 8px;font-size:1.1rem}
.emprivacy-msg{margin:0 0 10px;line-height:1.4;opacity:.95}
.emprivacy-links a{color:#8ecbff;margin-right:12px}
.emprivacy-opts{margin:10px 0;border-top:1px solid #333;padding-top:10px}
.emprivacy-switch{display:block;margin:6px 0}
.emprivacy-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.emprivacy-btn{border-radius:6px;border:1px solid #555;background:#222;color:#eee;padding:8px 12px;cursor:pointer}
.emprivacy-btn-primary{background:#3b82f6;border-color:#3b82f6;color:#fff}
</style>`,
				};

				const shell: PageFragmentContribution = {
					kind: "html",
					placement: "body:end",
					key: "emprivacy:shell",
					html: `<div id="emprivacy-root" data-emprivacy="1"></div>`,
				};

				const headScripts: PageFragmentContribution[] = [];
				if (cfg.googleConsentMode) {
					headScripts.push({
						kind: "inline-script",
						placement: "head",
						key: "emprivacy:gcm-default",
						code: buildGoogleConsentHeadScript(),
					});
				}

				const boot: PageFragmentContribution = {
					kind: "inline-script",
					placement: "body:end",
					key: "emprivacy:boot",
					code: buildBodyBootstrap(pr),
				};

				return [...headScripts, style, shell, boot];
			},
		},
	},
	routes: {
		admin: {
			handler: async (routeCtx: { input?: unknown }, ctx: PluginContext) => {
				const interaction = routeCtx.input as
					| { type: string; page?: string; action_id?: string; values?: Record<string, unknown> }
					| undefined;

				if (interaction?.type === "page_load" && interaction.page === ADMIN_SETTINGS_PATH) {
					return buildSettingsPage(ctx);
				}
				if (interaction?.type === "form_submit" && interaction.action_id === SAVE_ACTION_ID) {
					const v = interaction.values ?? {};
					const asBool = (x: unknown) => {
						if (x === true) return true;
						if (x === false) return false;
						if (typeof x === "string") return x === "true" || x === "on" || x === "1";
						return Boolean(x);
					};

					try {
						const next = assertValidSavedConfig({
							bannerTitle: String(v.banner_title ?? ""),
							bannerMessage: String(v.banner_message ?? ""),
							privacyPolicyUrl: String(v.privacy_url ?? ""),
							cookiePolicyUrl: String(v.cookie_url ?? ""),
							strictDefaults: asBool(v.strict_defaults),
							policyVersion: String(v.policy_version ?? ""),
							analyticsUrlsText: String(v.analytics_urls ?? ""),
							marketingUrlsText: String(v.marketing_urls ?? ""),
							googleConsentMode: asBool(v.google_cm),
							logConsentToServer: asBool(v.log_server),
						});
						await saveConfigString(ctx, JSON.stringify(next));
						const page = await buildSettingsPage(ctx);
						return {
							...page,
							toast: { message: "EmPrivacy settings saved.", type: "success" },
						};
					} catch (e) {
						const msg = e instanceof Error ? e.message : "Save failed.";
						const page = await buildSettingsPage(ctx);
						return {
							...page,
							toast: { message: msg, type: "error" },
						};
					}
				}

				return { blocks: [] };
			},
		},
		record: {
			public: true,
			input: recordInput,
			handler: async (
				routeCtx: { input: unknown; request: Request },
				ctx: PluginContext,
			) => {
				if (routeCtx.request.method !== "POST") {
					return { ok: false };
				}
				const cfg = await loadConfig(ctx);
				if (!cfg.logConsentToServer) {
					return { ok: false, reason: "logging_disabled" };
				}
				const input = routeCtx.input as z.infer<typeof recordInput>;
				const row: ConsentRecordPayload = {
					createdAt: new Date().toISOString(),
					policyVersion: input.policyVersion,
					analytics: input.analytics,
					marketing: input.marketing,
				};
				await ctx.storage.consentEvents.put(
					`${Date.now()}-${Math.random().toString(36).slice(2)}`,
					row,
				);
				return { ok: true };
			},
		},
	},
});

async function buildSettingsPage(ctx: PluginContext) {
	const cfg = await loadConfig(ctx);
	const analyticsText = cfg.analyticsScriptUrls.join("\n");
	const marketingText = cfg.marketingScriptUrls.join("\n");

	const consentFields = await (async () => {
		try {
			const r = await ctx.storage.consentEvents.query({
				orderBy: { createdAt: "desc" },
				limit: 15,
			});
			return r.items.map((item) => {
				const d = item.data as ConsentRecordPayload;
				return {
					label: d.createdAt,
					value: `policy ${d.policyVersion} · analytics ${d.analytics ? "on" : "off"} · marketing ${d.marketing ? "on" : "off"}`,
				};
			});
		} catch {
			return [] as { label: string; value: string }[];
		}
	})();

	return {
		blocks: [
			{
				type: "header" as const,
				text: "EmPrivacy — Cookie & consent",
			},
			{
				type: "context" as const,
				text: "Configure the public banner and which third-party script URLs may load after consent. This plugin only injects scripts you list here — it does not execute arbitrary HTML from this form.",
			},
			{
				type: "context" as const,
				text: "Privacy / cookie links: use your EmDash **Page** public path (e.g. `/privacy` — same as in the browser address bar when you view that Page) or a full `https://…` URL if the policy is hosted elsewhere.",
			},
			{ type: "divider" as const },
			{
				type: "form" as const,
				blockId: "emprivacy-form",
				fields: [
					{
						type: "text_input" as const,
						action_id: "banner_title",
						label: "Banner title",
						initial_value: cfg.bannerTitle,
					},
					{
						type: "text_input" as const,
						action_id: "banner_message",
						label: "Short notice",
						multiline: true,
						initial_value: cfg.bannerMessage,
					},
					{
						type: "text_input" as const,
						action_id: "privacy_url",
						label: "Privacy policy — EmDash Page path or https URL",
						placeholder: "/privacy or https://…",
						initial_value: cfg.privacyPolicyUrl,
					},
					{
						type: "text_input" as const,
						action_id: "cookie_url",
						label: "Cookie policy (optional) — path or https URL",
						placeholder: "/cookies or https://…",
						initial_value: cfg.cookiePolicyUrl || "",
					},
					{
						type: "text_input" as const,
						action_id: "policy_version",
						label: "Policy / consent version",
						initial_value: cfg.policyVersion,
					},
					{
						type: "toggle" as const,
						action_id: "strict_defaults",
						label: "Strict defaults (require opt-in for analytics & marketing)",
						initial_value: cfg.strictDefaults,
					},
					{
						type: "text_input" as const,
						action_id: "analytics_urls",
						label: "Analytics script URLs (one https URL per line)",
						multiline: true,
						initial_value: analyticsText,
					},
					{
						type: "text_input" as const,
						action_id: "marketing_urls",
						label: "Marketing script URLs (one https URL per line)",
						multiline: true,
						initial_value: marketingText,
					},
					{
						type: "toggle" as const,
						action_id: "google_cm",
						label: "Google Consent Mode v2 (denied defaults in head; updates after choice)",
						initial_value: cfg.googleConsentMode,
					},
					{
						type: "toggle" as const,
						action_id: "log_server",
						label: "Log consent choices to the server (minimal record; no IP stored)",
						initial_value: cfg.logConsentToServer,
					},
				],
				submit: { label: "Save settings", action_id: SAVE_ACTION_ID },
			},
			...(cfg.logConsentToServer && consentFields.length > 0
				? [
						{ type: "divider" as const },
						{
							type: "header" as const,
							text: "Recent consent records",
						},
						{
							type: "fields" as const,
							fields: consentFields,
						},
					]
				: []),
		],
	};
}
