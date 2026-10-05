import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    "public/pdf.worker.min.mjs",
    ".next/**",
    "next-env.d.ts",
    "tools/oxlint/anti-slop/**",
    "docs-site/node_modules/**",
    "docs-site/content/**",
    "docs-site/.vitepress/dist/**",
    "docs-site/.vitepress/cache/**",
  ]),
]);
