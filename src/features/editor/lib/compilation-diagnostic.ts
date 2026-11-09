export function compilationDiagnostic(log: string, fallback: string) {
  const lines = log.split(/\r?\n/);

  const start = lines.findIndex((line) =>
    /^(?:! |.+:\d+: (?:LaTeX Error|(?:Package|Class) .+? (?:Error|E$)|Undefined control sequence|Missing |Extra |Runaway argument|Paragraph ended|File ended|Emergency stop|TeX capacity exceeded))/.test(
      line,
    ),
  );

  const remaining = start < 0 ? [] : lines.slice(start);
  const contextEnd = remaining.findIndex((line) => /^l\.\d+\s/.test(line));

  const exact = remaining
    .slice(0, contextEnd < 0 ? 8 : contextEnd + 2)
    .join("\n")
    .trim();

  const location = exact.match(/^(.+?):(\d+):/m);
  const contextLine = exact.match(/^l\.(\d+)\s/m);
  const message = exact.replace(/\r?\n/g, " ");
  let title = exact ? "Compilation failed" : fallback;
  let explanation = fallback;

  let suggestion =
    "Review the exact error and source context below. Fix the first error, then recompile.";

  const missingFile = message.match(/File [`']([^`']+)' not found/);
  const environment = message.match(/Environment ([\w*]+) undefined/);

  if (missingFile) {
    const name = missingFile[1];

    title = "A required file is missing";
    explanation = `LaTeX could not find ${name}.`;
    suggestion = name.endsWith(".sty")
      ? "Check the package name in \\usepackage. If it is correct, the compiler image needs that LaTeX package installed."
      : "Check the filename and letter case, and add the file to your project if it is missing.";
  } else if (environment) {
    const name = environment[1];

    title = `LaTeX does not recognize ${name}`;
    explanation = `The ${name} environment has not been defined. A required package may not be loaded, or the name may be misspelled.`;
    suggestion =
      name === "tabularx"
        ? "Add \\usepackage{tabularx} before \\begin{document}. If your table uses Y columns, also define them, for example: \\newcolumntype{Y}{>{\\raggedright\\arraybackslash}X}."
        : "Check the environment name and load the package that provides it in the preamble.";
  } else if (/Undefined control sequence/.test(message)) {
    title = "LaTeX does not recognize a command";
    explanation =
      "A command is misspelled, has not been defined, or requires a package that is not loaded.";
    suggestion =
      "Check the command in the source context below. Correct its spelling, define your custom command, or load its required package.";
  } else if (/Illegal pream-token/.test(message)) {
    title = "A table column type is not defined";
    explanation =
      "The table's column specification contains a type LaTeX does not recognize.";
    suggestion =
      "Check the column specification. Custom types such as Y need a \\newcolumntype definition; X columns require the tabularx package.";
  } else if (/Unknown option ['`]french'/.test(message)) {
    title = "French language support is unavailable";
    explanation = "Babel could not load the French language definitions.";
    suggestion =
      "Install texlive-lang-french in the compiler image and rebuild it.";
  } else if (/Missing \$ inserted/.test(message)) {
    title = "A math symbol appears outside math mode";
    explanation =
      "LaTeX expected math mode here. Unescaped underscores and math commands in normal text often cause this error.";
    suggestion =
      "Use \\_ for a literal underscore in text, or put mathematical expressions inside $...$. Check the source context first.";
  } else if (
    /Runaway argument|File ended while scanning|Paragraph ended before/.test(
      message,
    )
  ) {
    title = "A command or group was not closed";
    explanation =
      "LaTeX reached the end of an argument or file before the command was complete.";
    suggestion =
      "Check for missing closing braces or environment endings before the reported location.";
  } else if (!exact) {
    suggestion = log
      ? "Inspect the full compiler log below for more details."
      : "No compiler log was returned. Try again; if this continues, check that the compiler service is running.";
  }

  return {
    title,
    explanation,
    suggestion,
    exact,
    file: location?.[1],
    line: location?.[2] || contextLine?.[1],
  };
}
