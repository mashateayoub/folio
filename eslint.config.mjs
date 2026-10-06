import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: [
      "src/features/**/*.{ts,tsx}",
      "src/components/**/*.{ts,tsx}",
      "src/shared/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server/**", "**/server/**"],
              message:
                "Client features and shared contracts must not import server infrastructure.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/server/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/features/*/components/**",
                "@/features/*/hooks/**",
                "@/components/**",
              ],
              message:
                "Server services depend on domain models, not UI components or hooks.",
            },
          ],
        },
      ],
    },
  },
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
