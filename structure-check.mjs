#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredRootDirs = ["src", "docs", "scripts", "public", "tests"];
const requiredSrcDirs = ["app", "components", "lib", "services", "styles"];
const disallowedRootDocs = [
  "CLOUDINARY_SETUP_GUIDE.md",
  "DESIGN_OPTIMIZATION_PLAN.md",
  "DUPLICATE_FIX_TODO.md",
  "FOLDER_STRUCTURE_ANALYSIS.md",
  "LIQUID_GLASS_USAGE_GUIDE.md",
  "QUICK_FIX_GUIDE.md",
  "REFACTORING_PLAN.md",
  "UPLOAD_PROGRESS_IMPLEMENTATION.md",
  "VEHICLE_REDESIGN_PLAN.md",
];

function exists(target) {
  return fs.existsSync(path.join(root, target));
}

function walk(dir, output = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (
      entry.name === "node_modules" ||
      entry.name === ".next" ||
      entry.name === ".git"
    ) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    output.push(fullPath);
    if (entry.isDirectory()) {
      walk(fullPath, output);
    }
  }
  return output;
}

function rel(absPath) {
  return path.relative(root, absPath).replace(/\\/g, "/");
}

const errors = [];
const warnings = [];
const ok = [];

for (const dir of requiredRootDirs) {
  if (!exists(dir)) {
    errors.push(`Missing required root directory: ${dir}`);
  } else {
    ok.push(`Root directory exists: ${dir}`);
  }
}

for (const dir of requiredSrcDirs) {
  const target = `src/${dir}`;
  if (!exists(target)) {
    warnings.push(`Missing recommended src directory: ${target}`);
  } else {
    ok.push(`Source directory exists: ${target}`);
  }
}

for (const filename of disallowedRootDocs) {
  if (exists(filename)) {
    warnings.push(
      `Move root doc into docs/: ${filename} -> docs/${filename.replace(
        "_GUIDE",
        ""
      )}`
    );
  }
}

if (exists("src/lib/db.ts") && exists("src/lib/db/db.ts")) {
  warnings.push(
    "Potential duplication: both src/lib/db.ts and src/lib/db/db.ts exist"
  );
}

if (exists("src/proxy.ts")) {
  warnings.push("Move src/proxy.ts into src/config/ or src/lib/config/");
}

const allPaths = walk(root);
const filesWithSpaces = allPaths.filter((p) => /\s/.test(path.basename(p)));
for (const badPath of filesWithSpaces) {
  errors.push(`Filename contains spaces: ${rel(badPath)}`);
}

const dsStoreFiles = allPaths.filter((p) => path.basename(p) === ".DS_Store");
for (const file of dsStoreFiles) {
  warnings.push(`Remove system file: ${rel(file)}`);
}

const appComponentsPath = path.join(root, "src/app/components");
if (fs.existsSync(appComponentsPath)) {
  warnings.push(
    "src/app/components exists: keep only page-local components there; move shared UI into src/components"
  );
}

const routeFiles = allPaths.filter((p) => p.endsWith("/route.ts"));
if (routeFiles.length > 0) {
  ok.push(`API route files detected: ${routeFiles.length}`);
} else {
  warnings.push("No route handlers found in app router API structure.");
}

console.log("\nStructure Check Report");
console.log("======================");

if (ok.length) {
  console.log("\nPASS");
  for (const item of ok) console.log(`- ${item}`);
}

if (warnings.length) {
  console.log("\nWARNINGS");
  for (const item of warnings) console.log(`- ${item}`);
}

if (errors.length) {
  console.log("\nERRORS");
  for (const item of errors) console.log(`- ${item}`);
}

console.log(
  `\nResult: ${errors.length ? "FAILED" : "PASSED"} (${errors.length} errors, ${warnings.length} warnings)\n`
);

process.exit(errors.length ? 1 : 0);
