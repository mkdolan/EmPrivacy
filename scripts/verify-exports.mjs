// SPDX-License-Identifier: MIT
import { readFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const pkgPath = path.join(root, "package.json");

/** @param {unknown} value */
function collectFilePaths(value, out) {
	if (typeof value === "string") {
		if (value.startsWith("./") || value.startsWith("../")) {
			out.add(value);
		}
		return;
	}
	if (value && typeof value === "object" && !Array.isArray(value)) {
		for (const v of Object.values(value)) {
			collectFilePaths(v, out);
		}
	}
}

const pkgRaw = await readFile(pkgPath, "utf8");
const pkg = JSON.parse(pkgRaw);

const paths = new Set();
if (typeof pkg.main === "string" && pkg.main) {
	paths.add(pkg.main.startsWith("./") ? pkg.main : `./${pkg.main}`);
}
collectFilePaths(pkg.exports, paths);

const rel = Array.from(paths).map((p) => (p.startsWith("./") ? p : `./${p}`));

if (rel.length === 0) {
	throw new Error("No file paths found in package.json main/exports to verify.");
}

for (const p of rel.sort()) {
	const abs = path.join(root, p);
	try {
		await access(abs);
	} catch {
		throw new Error(`Missing file required by main/exports: ${p} (expected at ${abs})`);
	}
}

console.log(
	`OK: ${rel.length} path(s) from main/exports exist under dist/:\n  ${rel.join("\n  ")}`,
);
