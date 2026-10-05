import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";
import { readFileSync } from "node:fs";

const pages = JSON.parse(
  readFileSync(new URL("./navigation.json", import.meta.url), "utf8"),
);

const sections = [
  ["getting-started", "Getting started"],
  ["product", "Product"],
  ["architecture", "Architecture"],
  ["data", "Database"],
  ["security", "Security & permissions"],
  ["features", "Editor & workspaces"],
  ["billing", "Billing"],
  ["compiler", "LaTeX compiler"],
  ["frontend", "Interface"],
  ["development", "Development"],
  ["operations", "Operations"],
  ["reference", "Reference"],
];

const sidebar = [{ text: "Documentation home", link: "/" }];

for (const [section, text] of sections) {
  const items = [];

  for (const page of pages) {
    if (page.section === section && !page.link.endsWith("/index"))
      items.push({ text: page.text, link: page.link });
  }

  sidebar.push({
    text,
    collapsed: section !== "getting-started",
    link: `/${section}/`,
    items,
  });
}

export default withMermaid(
  defineConfig({
    title: "Folio Docs",
    description:
      "The guide to building, using, and operating Folio, the online LaTeX workspace.",
    srcDir: "content",
    cleanUrls: true,
    lastUpdated: false,
    ignoreDeadLinks: [/^http:\/\/localhost:(3030|8025|4173)\/?$/],
    markdown: { html: false },
    vite: { css: { postcss: { plugins: [] } } },
    themeConfig: {
      siteTitle: "Folio / Docs",
      nav: [
        { text: "Start here", link: "/getting-started/quick-start" },
        { text: "Architecture", link: "/architecture/system" },
        { text: "API", link: "/reference/api-routes" },
      ],
      sidebar,
      outline: { level: [2, 3], label: "On this page" },
      search: { provider: "local" },
      docFooter: { prev: "Previous page", next: "Next page" },
      footer: {
        message:
          "Folio technical documentation · Built from the repository Markdown.",
      },
    },
    mermaid: { securityLevel: "strict" },
  }),
);
