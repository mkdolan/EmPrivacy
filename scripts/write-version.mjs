// SPDX-License-Identifier: MIT
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const pkgPath = path.join(root, "package.json");
const outPath = path.join(root, "src", "version.ts");

const pkgRaw = await readFile(pkgPath, "utf8");
const pkg = JSON.parse(pkgRaw);

if (!pkg?.version || typeof pkg.version !== "string") {
	throw new Error("package.json missing valid version");
}

const next = `// SPDX-License-Identifier: MIT

export const VERSION = ${JSON.stringify(pkg.version)} as const;
`;

await writeFile(outPath, next, "utf8");
