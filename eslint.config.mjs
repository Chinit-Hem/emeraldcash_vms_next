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
  {
    rules: {
      // Allow underscore-prefixed variables to be unused (intentional destructuring)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_"
        }
      ],
      // Downgrade react-hooks/exhaustive-deps to warning only
      "react-hooks/exhaustive-deps": "warn",
      // Downgrade no-img-element to warning only
      "@next/next/no-img-element": "warn",
      // Downgrade jsx-a11y rules to warning only
      "jsx-a11y/role-supports-aria-props": "warn"
    }
  }
]);

export default eslintConfig;
