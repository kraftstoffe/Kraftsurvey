import { cpSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const nodeModules = join(root, "node_modules");
const destRoot = join(root, ".prisma-cli/node_modules");

mkdirSync(destRoot, { recursive: true });

function collectPrismaCliPackages() {
  const seen = new Set();
  const queue = ["prisma"];

  while (queue.length > 0) {
    const pkg = queue.shift();
    if (!pkg || seen.has(pkg)) continue;
    if (pkg === "@prisma/client") continue;

    seen.add(pkg);

    const pkgJsonPath =
      pkg.startsWith("@") ?
        join(nodeModules, ...pkg.split("/"), "package.json")
      : join(nodeModules, pkg, "package.json");

    if (!existsSync(pkgJsonPath)) continue;

    const json = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
    const deps = {
      ...json.dependencies,
      ...json.optionalDependencies,
    };

    for (const dep of Object.keys(deps)) {
      if (dep !== "@prisma/client" && !seen.has(dep)) {
        queue.push(dep);
      }
    }
  }

  return [...seen].sort();
}

function copyPackage(relativePath) {
  const src = join(nodeModules, relativePath);
  if (!existsSync(src)) {
    throw new Error(`Missing Prisma CLI dependency: ${relativePath}`);
  }

  const dest = join(destRoot, relativePath);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true });
}

const prismaCliPackages = collectPrismaCliPackages();

for (const pkg of prismaCliPackages) {
  copyPackage(pkg);
}

console.log(
  `Staged ${prismaCliPackages.length} Prisma CLI packages into .prisma-cli/node_modules`,
);
