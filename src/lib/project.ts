import { z } from "zod";

export const filePath = z
  .string()
  .min(1)
  .max(160)
  .refine(
    (value) =>
      !value.startsWith("output/") &&
      value
        .split("/")
        .every((part) => /^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(part)) &&
      /\.(tex|bib|sty|cls)$/.test(value),
    "Use a relative .tex, .bib, .sty, or .cls path without spaces or traversal.",
  );

export const fileSchema = z.object({
  id: z.string().min(1),
  path: filePath,
  content: z.string().max(200_000),
});

export const projectSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().trim().min(1).max(100),
    rootFile: filePath,
    files: z.array(fileSchema).min(1).max(30),
  })
  .superRefine((project, context) => {
    if (
      !project.rootFile.endsWith(".tex") ||
      !project.files.some((file) => file.path === project.rootFile)
    )
      context.addIssue({
        code: "custom",
        message: "Select an existing .tex root document.",
      });

    if (
      new Set(project.files.map((file) => file.path)).size !==
        project.files.length ||
      new Set(project.files.map((file) => file.id)).size !==
        project.files.length
    )
      context.addIssue({
        code: "custom",
        message: "File names and identifiers must be unique.",
      });

    if (
      project.files.some((file) =>
        project.files.some((other) => other.path.startsWith(file.path + "/")),
      )
    )
      context.addIssue({
        code: "custom",
        message: "A source file cannot also be a folder.",
      });

    if (
      project.files.reduce(
        (sum, file) => sum + new TextEncoder().encode(file.content).length,
        0,
      ) > 600_000
    )
      context.addIssue({
        code: "custom",
        message: "Project sources must be under 600 KB.",
      });
  });

export type Project = z.infer<typeof projectSchema>;

export type SourceFile = Project["files"][number];

export const starterProject: Project = {
  id: "first-project",
  title: "A little room for big ideas",
  rootFile: "main.tex",
  files: [
    {
      id: "main",
      path: "main.tex",
      content: [
        "\\documentclass[11pt,a4paper]{article}",
        "\\usepackage[margin=1in]{geometry}",
        "\\usepackage{amsmath,amssymb}",
        "\\usepackage{xcolor}",
        "\\definecolor{forest}{HTML}{286354}",
        "",
        "\\title{A little room for big ideas}",
        "\\author{Your name}",
        "\\date{\\today}",
        "",
        "\\begin{document}",
        "\\maketitle",
        "",
        "\\begin{abstract}",
        "Every great paper starts with a first sentence.",
        "This is your space to think, write, and bring",
        "your ideas into focus.",
        "\\end{abstract}",
        "",
        "\\input{sections/introduction}",
        "",
        "\\section{A beautiful equation}",
        "Some ideas are best expressed with a little mathematics:",
        "\\begin{equation}",
        "  e^{i\\pi} + 1 = 0",
        "\\end{equation}",
        "And some need room to grow:",
        "\\[",
        "  \\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}",
        "\\]",
        "",
        "\\section{What's next?}",
        "Write a sentence. Add a section. Make it yours.",
        "Your PDF will follow along as you write.",
        "",
        "\\end{document}",
        "",
      ].join("\n"),
    },
    {
      id: "intro",
      path: "sections/introduction.tex",
      content: [
        "\\section{Introduction}",
        "Welcome to your next great idea. With \\LaTeX{},",
        "you can spend more time on what you want to say",
        "and less time on how it should look.",
        "",
        "\\textcolor{forest}{Start editing on the left and watch",
        "your document take shape on the right.}",
        "",
      ].join("\n"),
    },
    {
      id: "refs",
      path: "references.bib",
      content:
        "@book{knuth1984,\n  author = {Donald E. Knuth},\n  title = {The TeXbook},\n  year = {1984},\n  publisher = {Addison-Wesley}\n}\n",
    },
  ],
};

export function createProject(
  template: "article" | "blank" | "report",
): Project {
  const project = structuredClone(starterProject);
  project.id = crypto.randomUUID();
  project.title =
    template === "blank"
      ? "Untitled project"
      : template === "report"
        ? "My research report"
        : "My first article";

  if (template === "blank")
    project.files = [
      {
        id: crypto.randomUUID(),
        path: "main.tex",
        content:
          "\\documentclass{article}\n\\begin{document}\nHello, world!\n\\end{document}\n",
      },
    ];

  if (template === "report")
    project.files[0].content = project.files[0].content
      .replace("{article}", "{report}")
      .replace("A little room for big ideas", "My research report")
      .replace(
        "\\input{sections/introduction}",
        "\\chapter{Getting started}\n\\input{sections/introduction}",
      );

  return project;
}
