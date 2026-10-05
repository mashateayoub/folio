import assert from "node:assert/strict";
import { test } from "node:test";
import {
  pagePath,
  rewriteLinks,
  sourceIsAllowed,
  sourcePage,
} from "./prepare.mjs";

test("README links become routes with anchors intact", () => {
  const sources = new Set();

  assert.equal(pagePath("architecture/README.md"), "architecture/index.md");
  assert.equal(
    rewriteLinks(
      "[Home](../README.md#start-here)",
      "security/authentication.md",
      sources,
    ),
    "[Home](/index#start-here)",
  );
  assert.equal(sources.size, 0);
});

test("dynamic routes and hidden files become literal source pages", () => {
  const sources = new Set();
  const source = "src/app/api/projects/[id]/route.ts";

  assert.equal(
    rewriteLinks(`[Code](../../${source})`, "reference/api-routes.md", sources),
    `[Code](/source/${sourcePage(source)})`,
  );
  assert.ok(!sourcePage(source).includes("["));
  assert.ok(!sourcePage(".env.example").startsWith("."));
  assert.deepEqual([...sources], [source]);
});

test("source references reject credentials, dependencies, and traversal", () => {
  for (const source of [
    ".env.local",
    ".env.production",
    ".git/config",
    "node_modules/a.ts",
    "../private.ts",
  ]) {
    assert.equal(sourceIsAllowed(source), false, source);
  }

  assert.equal(sourceIsAllowed(".env.example"), true);
  assert.throws(
    () =>
      rewriteLinks(
        "[Secret](../../.env.local)",
        "reference/api-routes.md",
        new Set(),
      ),
    /Unsafe source link/,
  );
});

test("external links and code samples stay literal", () => {
  const markdown =
    "[External](https://example.com)\n```md\n[Example](../../.env.local)\n```\n[Anchor](#heading)";

  assert.equal(
    rewriteLinks(markdown, "reference/contracts.md", new Set()),
    markdown,
  );
});
