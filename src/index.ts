// SPDX-License-Identifier: MIT

import type { PluginDescriptor } from "emdash";

import { PLUGIN_ID } from "./config.js";

export type {
	EmprivacyConfig,
	ConsentRecordPayload,
} from "./config.js";
export {
	KV_KEY,
	COOKIE_NAME,
	DEFAULT_CONFIG,
	normalizeConfig,
	isRootRelativeSitePath,
	resolvePolicyHref,
	isValidPolicyHrefInput,
} from "./config.js";

const VERSION = "0.1.0";

/**
 * EmDash plugin descriptor — add to `plugins: []` in `emdash({ ... })` inside `astro.config`.
 * Requires **trusted** registration so `page:fragments` runs (sandboxed plugins cannot inject fragments).
 */
export function emprivacyPlugin(): PluginDescriptor {
	return {
		id: PLUGIN_ID,
		version: VERSION,
		format: "standard",
		entrypoint: "emprivacy/sandbox",
		capabilities: ["page:inject"],
		storage: {
			consentEvents: { indexes: ["createdAt", "policyVersion"] },
		},
		adminPages: [
			{
				path: "/settings",
				label: "EmPrivacy",
				icon: "shield",
			},
		],
	};
}
