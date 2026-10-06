import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repository = fileURLToPath(new URL("../../", import.meta.url));

const site = path.join(repository, "docs-site");

const content = path.join(site, "content");

export function pagePath(relative) {
  return relative.replace(/(^|\/)README\.md$/, "$1index.md");
}

export function sourcePage(relative) {
  return relative
    .split("/")
    .map(
      (segment) =>
        `file-${segment.replace(/[^a-zA-Z0-9_-]/g, (character) => `_${character.codePointAt(0).toString(16)}_`)}`,
    )
    .join("/");
}

export function sourceIsAllowed(relative) {
  const segments = relative.split("/");

  if (
    relative.startsWith("../") ||
    path.isAbsolute(relative) ||
    segments.some((segment) =>
      [".git", "node_modules", ".next", "content", "dist"].includes(segment),
    ) ||
    segments.some(
      (segment) => segment.startsWith(".env") && segment !== ".env.example",
    )
  )
    return false;

  return (
    /\.(md|json|yaml|yml|ts|tsx|mjs|css|sql|example|woff2|txt|gz|conf)$/.test(
      relative,
    ) ||
    [".dockerignore", ".gitignore", "LICENSE"].includes(
      path.posix.basename(relative),
    ) ||
    /^infra\/Dockerfile\.[\w.-]+$/.test(relative)
  );
}

export function rewriteLinks(markdown, relative, sources) {
  let fence = "";

  return markdown
    .split("\n")
    .map((line) => {
      const marker = line.match(/^\s*(`{3,}|~{3,})/);

      if (marker) {
        if (!fence) fence = marker[1];
        else if (marker[1][0] === fence[0] && marker[1].length >= fence.length)
          fence = "";

        return line;
      }

      if (fence) return line;

      return line.replace(/\]\(([^)]+)\)/g, (match, destination) => {
        if (/^(?:[a-z]+:|#|\/)/i.test(destination)) return match;

        const [link, anchor] = destination.split("#");

        const resolved = path.posix.normalize(
          path.posix.join("docs", path.posix.dirname(relative), link),
        );

        let target;

        if (resolved.startsWith("docs/")) {
          target = pagePath(resolved.slice(5)).replace(/\.md$/, "");
        } else {
          if (!sourceIsAllowed(resolved))
            throw new Error(`Unsafe source link: ${resolved}`);

          sources.add(resolved);
          target = `source/${sourcePage(resolved)}`;
        }

        return `](/${target}${anchor ? `#${anchor}` : ""})`;
      });
    })
    .join("\n");
}

async function markdownFiles(directory) {
  const files = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);

    if (entry.isDirectory()) files.push(...(await markdownFiles(absolute)));
    else if (entry.name.endsWith(".md")) files.push(absolute);
  }

  return files.sort();
}

async function emit(relative, markdown) {
  const destination = path.join(content, relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, markdown);
}

export async function prepare() {
  await rm(content, { recursive: true, force: true });
  const sources = new Set();
  const navigation = [];
  const files = await markdownFiles(path.join(repository, "docs"));

  for (const file of files) {
    const relative = path
      .relative(path.join(repository, "docs"), file)
      .split(path.sep)
      .join("/");

    const markdown = await readFile(file, "utf8");
    const title = markdown.match(/^# (.+)$/m)?.[1];

    if (!title) throw new Error(`Missing title: ${relative}`);

    navigation.push({
      text: title,
      link: `/${pagePath(relative).replace(/\.md$/, "")}`,
      section: relative.split("/")[0],
    });
    await emit(pagePath(relative), rewriteLinks(markdown, relative, sources));
  }

  for (const source of sources) {
    if (source.endsWith(".woff2") || source.endsWith(".gz")) {
      await emit(
        `source/${sourcePage(source)}.md`,
        `# ${source}\n\nBinary repository asset. Inspect the original file in your checkout; binary contents are not embedded in the site.\n`,
      );

      continue;
    }

    const raw = await readFile(path.join(repository, source), "utf8");
    const runs = raw.match(/`+/g) ?? [];
    const fence = "`".repeat(Math.max(3, ...runs.map((run) => run.length + 1)));
    const extension = path.extname(source).slice(1);

    const language =
      {
        ts: "ts",
        tsx: "tsx",
        css: "css",
        json: "json",
        sql: "sql",
        md: "md",
        yaml: "yaml",
        yml: "yaml",
        mjs: "js",
      }[extension] ?? "text";

    await emit(
      `source/${sourcePage(source)}.md`,
      `---\nsearch: false\n---\n\n# ${source}\n\nRepository source snapshot. Edit the original file in the repository, then rebuild the site.\n\n${fence}${language}\n${raw}\n${fence}\n`,
    );
  }

  await writeFile(
    path.join(site, ".vitepress/navigation.json"),
    JSON.stringify(navigation, null, 2),
  );
  console.log(
    `Prepared ${files.length} documentation pages and ${sources.size} source references.`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await prepare();
