import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  // Global ignores - must be first to prevent processing
  globalIgnores([
    // Build outputs
    ".next/**",
    ".next_old/**",
    "out/**",
    "build/**",
    "dist/**",
    // TypeScript
    "next-env.d.ts",
    // Scripts and utilities (100+ files, not part of app)
    "scripts/**",
    // Google Apps Script (different environment, .gs files)
    "apps-script/**",
    // Dependencies
    "node_modules/**",
    // Coverage reports
    "coverage/**",
    // Test files (if they exist)
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.spec.ts",
    "**/*.spec.tsx",
  ]),
  ...nextVitals,
  ...nextTs,
]);

export default eslintConfig;
