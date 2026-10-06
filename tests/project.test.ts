import test from "node:test";
import assert from "node:assert/strict";
import {
  projectSchema,
  starterProject,
  createProject,
} from "@/features/projects/model";
import { containerArguments } from "../services/compiler/compile";

test("starter and all templates are valid projects", () => {
  assert.ok(projectSchema.safeParse(starterProject).success);

  for (const template of ["article", "blank", "report"] as const)
    assert.ok(projectSchema.safeParse(createProject(template)).success);
});

test("rejects path traversal, absolute paths, option injection, reserved output and unsupported files", () => {
  for (const path of [
    "../secret.tex",
    "/etc/passwd.tex",
    "-shell-escape.tex",
    "a/../secret.tex",
    "output/main.tex",
    "main.pdf",
    "folder\\escape.tex",
  ]) {
    const project = structuredClone(starterProject);
    project.files[1].path = path;
    assert.equal(projectSchema.safeParse(project).success, false, path);
  }
});

test("requires a valid root and unique file identifiers and paths", () => {
  const project = structuredClone(starterProject);
  project.rootFile = "missing.tex";
  assert.equal(projectSchema.safeParse(project).success, false);
  project.rootFile = "references.bib";
  assert.equal(projectSchema.safeParse(project).success, false);
  project.rootFile = "main.tex";
  project.files.push(project.files[0]);
  assert.equal(projectSchema.safeParse(project).success, false);
});

test("enforces byte limits even for multibyte source", () => {
  const project = structuredClone(starterProject);
  project.files = [0, 1].map((id) => ({
    id: String(id),
    path: id === 0 ? "main.tex" : "other.tex",
    content: "😀".repeat(90_000),
  }));
  assert.equal(projectSchema.safeParse(project).success, false);
});

test("container runtime has no network, privileges or host secrets", () => {
  const args = containerArguments(
    "test-build",
    "/tmp/folio-test",
    "main.tex",
    "folio-tex:local",
  );

  for (const flag of [
    "--network=none",
    "--read-only",
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges",
    "--pids-limit=64",
    "--memory=512m",
  ])
    assert.ok(args.includes(flag));
  assert.ok(args.includes("type=bind,src=/tmp/folio-test,dst=/work"));
  assert.equal(
    args.some((argument) => argument.includes("docker.sock")),
    false,
  );
  assert.equal(args.at(-1), "main.tex");
});
