import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const nodeModules = join(root, "node_modules");
const destRoot = join(root, ".prisma-cli/node_modules");

mkdirSync(destRoot, { recursive: true });

const prismaCliPackages = [
  "prisma",
  "@prisma/engines",
  "@prisma/config",
  "@prisma/debug",
  "@prisma/engines-version",
  "@prisma/fetch-engine",
  "@prisma/get-platform",
  "effect",
  "c12",
  "deepmerge-ts",
  "empathic",
  "confbox",
  "defu",
  "exsolve",
  "giget",
  "jiti",
  "ohash",
  "pathe",
  "perfect-debounce",
  "pkg-types",
  "rc9",
  "dotenv",
  "consola",
  "destr",
  "citty",
  "nypm",
  "tinyexec",
  "node-fetch-native",
];

function copyPackage(relativePath) {
  const src = join(nodeModules, relativePath);
  if (!existsSync(src)) {
    throw new Error(`Missing Prisma CLI dependency: ${relativePath}`);
  }

  const dest = join(destRoot, relativePath);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true });
}

for (const pkg of prismaCliPackages) {
  copyPackage(pkg);
}

console.log(`Staged ${prismaCliPackages.length} Prisma CLI packages into .prisma-cli/node_modules`);
