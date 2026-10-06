import test from "node:test";
import assert from "node:assert/strict";
import { compileProject, CompileError } from "../services/compiler/compile";
import { starterProject, createProject } from "@/features/projects/model";

test("compiles French workshop packages, accents, and Babel ordinals", async () => {
  const project = createProject("blank");

  project.files[0].content = String.raw`\documentclass[11pt,a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[french]{babel}
\usepackage[margin=1.8cm,headheight=14pt]{geometry}
\usepackage{xcolor,fancyhdr,listings,tabularx,booktabs,amsmath,amssymb,tikz}
\usetikzlibrary{arrows.meta,positioning,shapes.geometric}
\usepackage[colorlinks=true,linkcolor=PrimaryBlue,urlcolor=PrimaryBlue]{hyperref}
\definecolor{PrimaryBlue}{HTML}{1B3A6B}
\lstset{basicstyle=\ttfamily,breaklines=true,literate={é}{{\'e}}1 {è}{{\`e}}1 {à}{{\`a}}1}
\begin{document}
\section*{Fiche Mémo \& Travaux Pratiques}
YouCode · Spécialisation MERN. Placer en 1\iere{} position.
Développeurs, agrégation, données et jointures corrélées.
\begin{tikzpicture}[node distance=1cm]
\node[draw] (input) {Collection};
\node[draw,right=of input] (output) {Résultat};
\draw[-{Stealth}] (input) -- (output);
\end{tikzpicture}
\begin{tabularx}{\textwidth}{lX}
\toprule Étape & Règle \\ \midrule
\texttt{\$match} & Filtrage précoce \\ \bottomrule
\end{tabularx}
\begin{lstlisting}
// données à agréger
db.commandes.aggregate([{ $match: { statut: "LIVREE" } }]);
\end{lstlisting}
\end{document}`;

  const result = await compileProject(project);

  assert.equal(result.pdf.subarray(0, 5).toString(), "%PDF-");
  assert.ok(result.pdf.length > 5_000);
  assert.match(result.log, /french\.ldf/);
  assert.doesNotMatch(result.log, /Running mktexpk/);
});

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
