import test from "node:test";
import assert from "node:assert/strict";
import { compileProject, CompileError } from "../services/compiler/compile";
import { starterProject, createProject } from "../src/lib/project";

test("compiles a multi-file document to a real PDF", async () => {
  const started = Date.now();
  const result = await compileProject(starterProject);
  assert.equal(result.pdf.subarray(0, 5).toString(), "%PDF-");
  assert.ok(result.pdf.length > 5_000);
  console.log("Multi-file build: " + (Date.now() - started) + "ms");
});

test("compiler reports source errors and recovers for the next job", async () => {
  const project = createProject("blank");
  project.files[0].content =
    "\\documentclass{article}\n\\begin{document}\n\\undefinedcommand\n\\end{document}";
  await assert.rejects(
    compileProject(project),
    (error) =>
      error instanceof CompileError &&
      error.status === 422 &&
      /Undefined control sequence/.test(error.log),
  );
  const result = await compileProject(createProject("blank"));
  assert.equal(result.pdf.subarray(0, 5).toString(), "%PDF-");
});

test("bibliography tool and multiple passes resolve references", async () => {
  const project = createProject("blank");
  project.files[0].content =
    "\\documentclass{article}\n\\begin{document}\nA reference \\cite{knuth1984}.\n\\bibliographystyle{plain}\n\\bibliography{references}\n\\end{document}";
  project.files.push(starterProject.files[2]);
  const result = await compileProject(project);
  assert.match(result.log, /bibtex/i);
  assert.equal(result.pdf.subarray(0, 5).toString(), "%PDF-");
});
