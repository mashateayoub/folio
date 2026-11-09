import test from "node:test";
import assert from "node:assert/strict";
import { compilationDiagnostic } from "../src/features/editor/lib/compilation-diagnostic";

const fallback = "LaTeX could not compile. Check the log below.";

test("explains missing tabularx and preserves the exact error with source location", () => {
  const exact =
    "./main.tex:83: LaTeX Error: Environment tabularx undefined.\n\nSee the LaTeX manual.\nl.83 \\begin{tabularx}\n                     {0.96\\linewidth}{p{2.6cm}YY}";

  const log =
    "./main.tex:4: LaTeX Warning: Reference undefined.\n./main.tex:5: Package custom Warning: Example.\nUnderfull \\hbox (badness 10000)\n[2]\n\n" +
    exact +
    "\nFatal error occurred";

  const diagnostic = compilationDiagnostic(log, fallback);

  assert.equal(diagnostic.file, "./main.tex");
  assert.equal(diagnostic.line, "83");
  assert.equal(diagnostic.exact, exact);
  assert.match(diagnostic.suggestion, /\\usepackage\{tabularx\}/);
  assert.match(diagnostic.suggestion, /\\newcolumntype\{Y\}/);
  assert.doesNotMatch(diagnostic.exact, /Underfull/);
});

test("recognizes missing packages and missing project files separately", () => {
  const missingPackage = compilationDiagnostic(
    "! LaTeX Error: File `lmodern.sty' not found.",
    fallback,
  );

  const missingImage = compilationDiagnostic(
    "! LaTeX Error: File `plot.pdf' not found.",
    fallback,
  );

  assert.match(missingPackage.explanation, /lmodern.sty/);
  assert.match(missingPackage.suggestion, /compiler image/);
  assert.match(missingImage.suggestion, /add the file to your project/);
});

test("explains undefined commands and custom table columns", () => {
  const command = compilationDiagnostic(
    "./chapters/intro.tex:12: Undefined control sequence.\nl.12 \\typo",
    fallback,
  );

  const column = compilationDiagnostic(
    "! Package array Error: Illegal pream-token (Y): `c' used.",
    fallback,
  );

  assert.equal(command.line, "12");
  assert.equal(command.file, "./chapters/intro.tex");
  assert.match(command.title, /command/);
  assert.match(column.suggestion, /\\newcolumntype/);
});

test("explains math and unclosed arguments without treating warnings as errors", () => {
  assert.match(
    compilationDiagnostic("! Missing $ inserted.\nl.9 user_id", fallback)
      .suggestion,
    /\\_/,
  );
  assert.match(
    compilationDiagnostic(
      "! File ended while scanning use of \\textbf.",
      fallback,
    ).title,
    /not closed/,
  );

  const warnings = compilationDiagnostic(
    "Underfull \\hbox (badness 10000)\nOverfull \\hbox",
    fallback,
  );

  assert.equal(warnings.exact, "");
  assert.equal(warnings.explanation, fallback);
});

test("retains unknown errors, multiline messages, and service failures", () => {
  const log =
    "./main.tex:45: Package custom Error: Something\n unusual happened.\nl.45 \\example\n   {value}";

  const diagnostic = compilationDiagnostic(log, fallback);

  assert.equal(diagnostic.exact, log);
  assert.equal(diagnostic.line, "45");
  assert.equal(
    compilationDiagnostic("", "Compiler service unavailable.").explanation,
    "Compiler service unavailable.",
  );
});

test("finds the first error after a log longer than the former 64 KB limit", () => {
  const diagnostic = compilationDiagnostic(
    "Package loaded\n".repeat(6000) +
      "! Undefined control sequence.\nl.7 \\wrong\ncontext\n! Emergency stop.",
    fallback,
  );

  assert.equal(diagnostic.line, "7");
  assert.match(diagnostic.exact, /\\wrong/);
  assert.doesNotMatch(diagnostic.exact, /Emergency stop/);
});
