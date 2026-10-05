import { spawn } from "node:child_process";
import { watch } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prepare, repository } from "./prepare.mjs";

await prepare();

const child = spawn(
  process.execPath,
  [
    fileURLToPath(
      new URL("../node_modules/vitepress/bin/vitepress.js", import.meta.url),
    ),
    "dev",
    "--host",
    "0.0.0.0",
    "--port",
    "4173",
  ],
  { cwd: path.join(repository, "docs-site"), stdio: "inherit" },
);

let timer;

let pending = Promise.resolve();

const watcher = watch(
  path.join(repository, "docs"),
  { recursive: true },
  () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      pending = pending.then(prepare).catch((error) => {
        console.error("Documentation refresh failed:", error);
      });
    }, 200);
  },
);

child.on("exit", (code) => {
  watcher.close();
  clearTimeout(timer);
  process.exit(code ?? 1);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
