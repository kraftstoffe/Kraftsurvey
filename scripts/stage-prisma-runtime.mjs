import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const nodeModules = join(root, "node_modules");
const destRoot = join(root, ".prisma-runtime/node_modules");

mkdirSync(destRoot, { recursive: true });

function copyIntoRuntime(fromRelative) {
  const src = join(nodeModules, fromRelative);
  if (!existsSync(src)) return;
  const dest = join(destRoot, fromRelative);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true });
}

for (const seed of [".prisma", "prisma", "@prisma"]) {
  copyIntoRuntime(seed);
}

const tree = execSync("npm ls prisma --omit=dev --all --parseable", {
  cwd: root,
  encoding: "utf8",
}).trim();

for (const absPath of tree.split("\n").filter(Boolean)) {
  const rel = relative(nodeModules, absPath);
  if (!rel || rel.startsWith("..")) continue;
  copyIntoRuntime(rel);
}

console.log("Staged Prisma runtime into .prisma-runtime/node_modules");
