"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  BookOpen,
  Check,
  Circle,
  Code as Code2,
  Download,
  FilePlus as FilePlus2,
  FileText,
  FolderOpen,
  Leaf,
  CircleNotch as LoaderCircle,
  DotsThree as MoreHorizontal,
  Play,
  Plus,
  SlidersHorizontal as Settings2,
  Trash as Trash2,
  X,
  WarningCircle as AlertCircle,
  SidebarSimple as PanelLeftClose,
  SidebarSimple as PanelLeftOpen,
  ArrowLeft,
  ArrowUpRight,
  Export as PackageOpen,
  PencilSimple as Pencil,
  Keyboard,
} from "@phosphor-icons/react";
import { zipSync, strToU8 } from "fflate";
import {
  filePath,
  projectSchema,
  starterProject,
} from "@/features/projects/model";

const SourceEditor = dynamic(() => import("./source-editor"), {
  ssr: false,
  loading: () => <div className="editor-loading">Opening your document…</div>,
});

const PdfPreview = dynamic(() => import("./pdf-preview"), { ssr: false });

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cloud } from "@/shared/http/cloud-client";
import { responses } from "@/shared/contracts/api-responses";
import { authClient } from "@/features/auth/client";
import { type CloudProject, type Organization } from "@/shared/types/saas";
import {
  useProjectPersistence,
  sourceKey,
} from "@/features/editor/hooks/use-project-persistence";
import ProjectAccess from "@/features/projects/components/project-access";
import ProjectLibrary from "@/features/projects/components/project-library";
import Brand from "@/components/shared/brand";

const emptyProject: CloudProject = {
  ...starterProject,
  revision: 0,
  organizationId: "",
  ownerId: "",
  visibility: "private",
  state: "active",
  permissions: {
    read: false,
    write: false,
    compile: false,
    manage: false,
    delete: false,
  },
};

type Modal =
  | "new-project"
  | "new-file"
  | "rename-file"
  | "delete-file"
  | "help"
  | "share"
  | "new-workspace"
  | null;

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export default function Workspace({
  actor,
  initialProjects,
  initialOrganizations,
}: {
  actor: { id: string; name: string; email: string };
  initialProjects: CloudProject[];
  initialOrganizations: Organization[];
}) {
  const [projects, setProjects] = useState<CloudProject[]>(initialProjects);
  const store = useProjectPersistence(projects, setProjects);
  const router = useRouter();

  const {
    saveState,
    setSaveState,
    conflict,
    flush,
    revision: savedRevision,
  } = store;

  const [organizations, setOrganizations] = useState(initialOrganizations);

  const [organizationId, setOrganizationId] = useState(
    initialOrganizations.find((item) => item.status === "active")?.id || "",
  );

  const [cloudError, setCloudError] = useState("");
  const [cloudBusy, setCloudBusy] = useState(false);
  const [legacyAvailable, setLegacyAvailable] = useState(false);
  const organization = organizations.find((item) => item.id === organizationId);
  const [selected, setSelected] = useState(initialProjects[0]?.id || "");
  const [fileId, setFileId] = useState("main");
  const ready = true;
  const [autoCompile, setAutoCompile] = useState(true);
  const [compiling, setCompiling] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState("");
  const [buildStatus, setBuildStatus] = useState("Ready to compile");
  const [log, setLog] = useState("");
  const [showLog, setShowLog] = useState(false);
  const [sidebar, setSidebar] = useState(true);
  const [dashboard, setDashboard] = useState(true);
  const [mobileTab, setMobileTab] = useState("source");
  const [modal, setModal] = useState<Modal>(null);
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState("");
  const [editorWidth, setEditorWidth] = useState(50);

  const project =
    projects.find((item) => item.id === selected) ||
    projects[0] ||
    emptyProject;

  const file =
    project.files.find((item) => item.id === fileId) || project.files[0];

  const projectKey = sourceKey(project);
  const current = useRef(project);
  const busy = useRef(false);
  const lastAttempt = useRef("");
  const blobUrl = useRef<string | null>(null);
  const requestGeneration = useRef(0);
  const stage = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    current.current = project;
  });
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");

    const hideMobileFiles = () => {
      if (media.matches) setSidebar(false);
    };

    const timer = setTimeout(() => {
      setLegacyAvailable(!!localStorage.getItem("folio.projects.v1"));
      hideMobileFiles();
    }, 0);

    media.addEventListener("change", hideMobileFiles);

    return () => {
      clearTimeout(timer);
      media.removeEventListener("change", hideMobileFiles);

      if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
    };
  }, []);
  useEffect(() => {
    if (dashboard || !selected) return;
    let cancelled = false;
    cloud("/api/projects/" + selected + "/builds", responses.builds)
      .then((builds) => {
        const build = builds.find((item) => item.hasPdf);

        if (
          !cancelled &&
          build &&
          current.current.id === selected &&
          !blobUrl.current
        ) {
          setPdfUrl("/api/builds/" + build.id + "/pdf");
          setPreviewKey(
            build.revision === current.current.revision
              ? sourceKey(current.current)
              : "earlier-revision",
          );
          setBuildStatus("Restored saved PDF");
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [selected, dashboard]);
  useEffect(() => {
    if (modal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal]);

  function updateProject(transform: (item: CloudProject) => CloudProject) {
    if (conflict || !project.permissions.write) return;
    setSaveState("Saving…");
    setProjects((items) =>
      items.map((item) => (item.id === project.id ? transform(item) : item)),
    );
  }

  const compile = useCallback(
    async (manual = false) => {
      const snapshot = structuredClone(current.current);
      const key = sourceKey(snapshot);

      if (
        !snapshot.permissions.compile ||
        busy.current ||
        (!manual && lastAttempt.current === key)
      )
        return;
      busy.current = true;
      lastAttempt.current = key;
      setCompiling(true);
      setBuildStatus("Typesetting…");
      setLog("");
      const generation = ++requestGeneration.current;

      try {
        await flush();
        const revision = savedRevision(snapshot.id);

        const response = await fetch("/api/compile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: snapshot.id, revision }),
        });

        if (!response.ok) {
          const failure = await response.json();

          if (sourceKey(current.current) === key) {
            setBuildStatus(failure.error || "Compilation failed");
            setLog(failure.log || "");
            setShowLog(true);
          }

          return;
        }

        const result = await response.json();
        const artifact = await fetch(result.pdfUrl, { cache: "no-store" });

        if (!artifact.ok) throw new Error("PDF access is no longer available.");
        const blob = await artifact.blob();

        if (
          generation !== requestGeneration.current ||
          sourceKey(current.current) !== key
        ) {
          setBuildStatus("Source changed. Recompile to update the preview.");

          return;
        }

        const url = URL.createObjectURL(blob);

        if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
        blobUrl.current = url;
        setPdfUrl(url);
        setPreviewKey(key);
        setBuildStatus("Compiled successfully");
        setShowLog(false);
      } catch {
        if (sourceKey(current.current) === key) {
          setBuildStatus("Connection interrupted. Try compiling again.");
          setShowLog(true);
        }
      } finally {
        busy.current = false;
        setCompiling(false);
      }
    },
    [flush, savedRevision],
  );

  useEffect(() => {
    if (
      !ready ||
      !autoCompile ||
      compiling ||
      dashboard ||
      conflict ||
      !project.permissions.compile
    )
      return;

    const timer = setTimeout(() => {
      void compile();
    }, 1_200);

    return () => clearTimeout(timer);
  }, [
    projectKey,
    ready,
    autoCompile,
    compiling,
    dashboard,
    conflict,
    compile,
    project.permissions.compile,
  ]);

  function selectProject(item: CloudProject) {
    setSelected(item.id);
    setFileId(item.files[0].id);
    setDashboard(false);
    setPdfUrl(null);
    setPreviewKey("");
    setLog("");
    setBuildStatus("Ready to compile");
    lastAttempt.current = "";

    if (blobUrl.current) {
      URL.revokeObjectURL(blobUrl.current);
      blobUrl.current = null;
    }
  }

  async function switchOrganization(id: string) {
    setCloudBusy(true);
    setCloudError("");

    try {
      await flush();

      const items = await cloud(
        "/api/projects?organizationId=" + id,
        responses.projects,
      );

      setProjects(items);
      setOrganizationId(id);
      setDashboard(true);
      setSelected(items[0]?.id || "");
    } catch (failure) {
      setCloudError(
        failure instanceof Error
          ? failure.message
          : "The request could not be completed.",
      );
    } finally {
      setCloudBusy(false);
    }
  }

  async function newProject(template: "article" | "blank" | "report") {
    setCloudBusy(true);
    setInputError("");

    try {
      await flush();

      const item = await cloud("/api/projects", responses.project, {
        method: "POST",
        body: JSON.stringify({ organizationId, template }),
      });

      setProjects((items) => [...items, item]);
      selectProject(item);
      setModal(null);
    } catch (failure) {
      setInputError(
        failure instanceof Error
          ? failure.message
          : "The request could not be completed.",
      );
    } finally {
      setCloudBusy(false);
    }
  }

  async function importLegacy() {
    setCloudBusy(true);
    setCloudError("");

    try {
      const saved: unknown = JSON.parse(
        localStorage.getItem("folio.projects.v1") || "[]",
      );

      if (!Array.isArray(saved) || saved.length > 40)
        throw new Error(
          "Browser projects could not be imported. Export them from the previous version.",
        );
      await flush();

      for (let index = 0; index < saved.length; index++) {
        const legacy = projectSchema.parse(saved[index]);

        const imported = await cloud(
          "/api/projects/import",
          responses.project,
          {
            method: "POST",
            body: JSON.stringify({ organizationId, project: legacy }),
          },
        );

        setProjects((items) => [...items, imported]);
        localStorage.setItem(
          "folio.projects.v1",
          JSON.stringify(saved.slice(index + 1)),
        );
      }

      localStorage.removeItem("folio.projects.v1");
      setLegacyAvailable(false);
    } catch (failure) {
      setCloudError(
        failure instanceof Error
          ? failure.message
          : "The request could not be completed.",
      );
    } finally {
      setCloudBusy(false);
    }
  }

  function openModal(value: Modal) {
    setInput(value === "rename-file" ? file.path : "");
    setInputError("");
    setModal(value);
  }

  function submitFile(event: React.FormEvent) {
    event.preventDefault();
    const path = filePath.safeParse(input);

    if (!path.success) {
      setInputError(path.error.issues[0].message);

      return;
    }

    if (
      project.files.some(
        (item) =>
          item.path === input && (modal === "new-file" || item.id !== file.id),
      )
    ) {
      setInputError("A file with this name already exists.");

      return;
    }

    if (
      project.files.some(
        (item) =>
          (modal === "new-file" || item.id !== file.id) &&
          (input.startsWith(item.path + "/") ||
            item.path.startsWith(input + "/")),
      )
    ) {
      setInputError("A source file cannot also be a folder.");

      return;
    }

    if (modal === "new-file") {
      if (project.files.length >= 30) {
        setInputError("This workspace supports up to 30 files per project.");

        return;
      }

      const id = crypto.randomUUID();
      updateProject((item) => ({
        ...item,
        files: [
          ...item.files,
          {
            id,
            path: input,
            content: input.endsWith(".tex") ? "% Start writing here\n" : "",
          },
        ],
      }));
      setFileId(id);
    } else {
      if (project.rootFile === file.path && !input.endsWith(".tex")) {
        setInputError("The root document must remain a .tex file.");

        return;
      }

      updateProject((item) => ({
        ...item,
        rootFile: item.rootFile === file.path ? input : item.rootFile,
        files: item.files.map((f) =>
          f.id === file.id ? { ...f, path: input } : f,
        ),
      }));
    }

    setModal(null);
  }

  function exportProject() {
    const sources = Object.fromEntries(
      project.files.map((item) => [item.path, strToU8(item.content)]),
    );

    download(
      new Blob([new Uint8Array(zipSync(sources))], { type: "application/zip" }),
      project.title.replace(/[^a-zA-Z0-9_-]/g, "-") + ".zip",
    );
  }

  function resize(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const area = stage.current?.getBoundingClientRect();

    if (area)
      setEditorWidth(
        Math.min(
          72,
          Math.max(28, ((event.clientX - area.left) / area.width) * 100),
        ),
      );
  }

  const wordCount = project.files
    .filter((f) => f.path.endsWith(".tex"))
    .reduce((sum, f) => sum + f.content.split(/\s+/).filter(Boolean).length, 0);

  const editorStyle: React.CSSProperties & { "--editor-width": string } = {
    "--editor-width": editorWidth + "%",
  };

  return (
    <div
      className={"app-shell " + (dashboard ? "library-shell" : "editor-shell")}
    >
      <header className="topbar">
        <button
          className="brand"
          onClick={() => setDashboard(true)}
          aria-label="Folio projects"
        >
          <Brand />
        </button>
        <div className="topbar-divider" />
        <div className="workspace-switcher">
          <FolderOpen size={16} />
          <select
            aria-label="Workspace"
            value={organizationId}
            disabled={cloudBusy || conflict}
            onChange={(event) => void switchOrganization(event.target.value)}
          >
            {organizations.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <button
            className="icon-button"
            aria-label="Create workspace"
            onClick={() => openModal("new-workspace")}
          >
            <Plus size={15} />
          </button>
        </div>
        <div className="topbar-right">
          <span className="local-badge">
            <Circle size={7} fill="currentColor" /> {organization?.role} ·{" "}
            {organization?.plan}
          </span>
          <Link
            className="text-button"
            href={"/organizations/" + organizationId}
            onClick={async (event) => {
              event.preventDefault();

              try {
                await flush();
                router.push("/organizations/" + organizationId);
              } catch (failure) {
                setCloudError(
                  failure instanceof Error
                    ? failure.message
                    : "The request could not be completed.",
                );
              }
            }}
          >
            Team
          </Link>
          <Link
            className="text-button"
            href="/settings"
            onClick={async (event) => {
              event.preventDefault();

              try {
                await flush();
                router.push("/settings");
              } catch (failure) {
                setCloudError(
                  failure instanceof Error
                    ? failure.message
                    : "The request could not be completed.",
                );
              }
            }}
          >
            Account
          </Link>
          <button
            className="icon-button"
            onClick={() => openModal("help")}
            aria-label="Workspace help"
          >
            <Keyboard size={18} />
          </button>
          <button
            className="avatar"
            title={actor.email + " — sign out"}
            aria-label="Sign out"
            onClick={async () => {
              try {
                await flush();
                await authClient.signOut();
                router.push("/sign-in");
              } catch (failure) {
                setCloudError(
                  failure instanceof Error
                    ? failure.message
                    : "The request could not be completed.",
                );
              }
            }}
          >
            {actor.name.slice(0, 1).toUpperCase()}
          </button>
        </div>
      </header>
      {cloudError && (
        <div className="notice" role="alert">
          <AlertCircle size={16} />
          {cloudError}
          <button
            className="icon-button"
            aria-label="Dismiss error"
            onClick={() => setCloudError("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {dashboard ? (
        <>
          {conflict && (
            <div className="notice">
              <AlertCircle size={16} />
              {saveState}
              <button onClick={() => location.reload()}>Reload</button>
            </div>
          )}
          <ProjectLibrary
            projects={projects}
            organization={organization}
            busy={cloudBusy}
            blocked={conflict}
            onOpen={selectProject}
            onCreate={() => openModal("new-project")}
            onTemplates={() => openModal("new-project")}
            onNavigate={async (href) => {
              try {
                await flush();
                router.push(href);
              } catch (failure) {
                setCloudError(
                  failure instanceof Error
                    ? failure.message
                    : "The request could not be completed.",
                );
              }
            }}
          />
          {legacyAvailable && (
            <div className="legacy-import">
              <button
                className="secondary-button"
                disabled={cloudBusy || organization?.role === "viewer"}
                onClick={() => void importLegacy()}
              >
                Import previous browser projects into this account
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="workspace-titlebar">
            <div className="project-heading">
              <button
                className="icon-button back-button"
                onClick={() => setDashboard(true)}
                aria-label="Back to projects"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <input
                  aria-label="Project title"
                  className="title-input"
                  maxLength={100}
                  value={project.title}
                  disabled={conflict || !project.permissions.write}
                  onChange={(e) =>
                    updateProject((item) => ({
                      ...item,
                      title: e.target.value,
                    }))
                  }
                  onBlur={() => {
                    if (!project.title.trim())
                      updateProject((item) => ({
                        ...item,
                        title: "Untitled project",
                      }));
                  }}
                />
                <div className="save-status" aria-live="polite">
                  {!project.permissions.write && (
                    <span>
                      {project.state === "archived"
                        ? "Archived · "
                        : "Read-only · "}
                    </span>
                  )}
                  {store.retryable && (
                    <button
                      className="text-button"
                      onClick={() => void flush().catch(() => undefined)}
                    >
                      Retry save
                    </button>
                  )}
                  {saveState === "Saving…" ? (
                    <LoaderCircle size={12} className="spin" />
                  ) : (
                    <Check size={12} />
                  )}{" "}
                  {saveState}
                </div>
              </div>
            </div>
            <div className="project-actions">
              {project.permissions.manage && (
                <button
                  className="secondary-button"
                  onClick={async () => {
                    try {
                      await flush();
                      openModal("share");
                    } catch (failure) {
                      setCloudError(
                        failure instanceof Error
                          ? failure.message
                          : "The request could not be completed.",
                      );
                    }
                  }}
                >
                  Access & settings
                </button>
              )}
              <button className="secondary-button" onClick={exportProject}>
                <PackageOpen size={15} /> Export source
              </button>
              <button
                className="secondary-button download-button"
                disabled={!pdfUrl}
                onClick={async () => {
                  if (pdfUrl)
                    download(
                      await (await fetch(pdfUrl)).blob(),
                      project.title + ".pdf",
                    );
                }}
              >
                <Download size={15} /> Download PDF
              </button>
            </div>
          </div>
          {conflict && (
            <div className="notice">
              <AlertCircle size={16} />
              {saveState}
              <button onClick={() => location.reload()}>Reload</button>
            </div>
          )}
          <div className="mobile-tabs">
            <button
              className="icon-button mobile-files-toggle"
              aria-label={sidebar ? "Hide files" : "Show files"}
              onClick={() => setSidebar(!sidebar)}
            >
              <FolderOpen size={17} />
            </button>
            <button
              className={mobileTab === "source" ? "active" : ""}
              onClick={() => setMobileTab("source")}
            >
              Source
            </button>
            <button
              className={mobileTab === "preview" ? "active" : ""}
              onClick={() => setMobileTab("preview")}
            >
              PDF preview
            </button>
          </div>
          <main className={"workspace " + (sidebar ? "" : "sidebar-hidden")}>
            {sidebar && (
              <aside className="file-sidebar">
                <div className="sidebar-heading">
                  <span>Files</span>
                  <button
                    className="icon-button"
                    disabled={conflict || !project.permissions.write}
                    aria-label="Add file"
                    onClick={() => openModal("new-file")}
                  >
                    <Plus size={17} />
                  </button>
                </div>
                <div className="file-list">
                  {project.files.map((item) => (
                    <button
                      className={
                        "file-row " + (item.id === file.id ? "selected" : "")
                      }
                      key={item.id}
                      onClick={() => setFileId(item.id)}
                    >
                      <FileText size={15} />
                      <span>{item.path}</span>
                      {item.path === project.rootFile && (
                        <span className="root-dot" title="Root document" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="file-operations">
                  <button
                    disabled={conflict || !project.permissions.write}
                    onClick={() => openModal("rename-file")}
                  >
                    <Pencil size={13} /> Rename file
                  </button>
                  <button
                    disabled={
                      conflict ||
                      !project.permissions.write ||
                      file.path === project.rootFile
                    }
                    onClick={() => openModal("delete-file")}
                  >
                    <Trash2 size={13} /> Delete file
                  </button>
                </div>
                <div className="sidebar-bottom">
                  <div className="root-selector">
                    <label htmlFor="root-file">
                      <Settings2 size={13} /> Root document
                    </label>
                    <select
                      id="root-file"
                      disabled={conflict || !project.permissions.write}
                      value={project.rootFile}
                      onChange={(e) =>
                        updateProject((item) => ({
                          ...item,
                          rootFile: e.target.value,
                        }))
                      }
                    >
                      {project.files
                        .filter((item) => item.path.endsWith(".tex"))
                        .map((item) => (
                          <option key={item.id}>{item.path}</option>
                        ))}
                    </select>
                  </div>
                  <div className="workspace-tip">
                    <BookOpen size={18} />
                    <p>
                      Write. Compile. Refine.
                      <br />
                      <span>Ctrl + Enter to preview.</span>
                    </p>
                  </div>
                </div>
              </aside>
            )}
            <div
              className={"editing-stage mobile-" + mobileTab}
              ref={stage}
              style={editorStyle}
            >
              <section className="editor-panel">
                <div className="panel-toolbar">
                  <div className="editor-tab">
                    <button
                      className="icon-button"
                      aria-label={sidebar ? "Hide files" : "Show files"}
                      onClick={() => setSidebar(!sidebar)}
                    >
                      {sidebar ? (
                        <PanelLeftClose size={16} />
                      ) : (
                        <PanelLeftOpen size={16} />
                      )}
                    </button>
                    <Code2 size={15} />
                    <span>{file.path}</span>
                    <span className="tab-dot" />
                  </div>
                  <span className="language-label">LaTeX</span>
                </div>
                {conflict ? (
                  <div className="editor-loading">
                    Reload this tab to safely resume editing.
                  </div>
                ) : (
                  ready && (
                    <SourceEditor
                      fileId={project.id + "/" + file.id}
                      content={file.content}
                      readOnly={!project.permissions.write}
                      maxBytes={Math.max(
                        0,
                        600_000 -
                          project.files
                            .filter((f) => f.id !== file.id)
                            .reduce(
                              (sum, f) =>
                                sum +
                                new TextEncoder().encode(f.content).length,
                              0,
                            ),
                      )}
                      onLimit={() =>
                        setSaveState(
                          "Edit exceeds the source limit (200,000 characters per file; 600 KB per project).",
                        )
                      }
                      onChange={(content) =>
                        updateProject((item) => ({
                          ...item,
                          files: item.files.map((f) =>
                            f.id === file.id ? { ...f, content } : f,
                          ),
                        }))
                      }
                      onCompile={() => void compile(true)}
                    />
                  )
                )}
                <div className="editor-footer">
                  <span>
                    UTF-8 <span className="footer-dot">·</span>{" "}
                    {file.content.split("\n").length} lines
                  </span>
                  <span>⌘ / Ctrl + Enter to compile</span>
                </div>
              </section>
              <div
                className="resize-handle"
                role="separator"
                aria-label="Resize editor and preview"
                aria-orientation="vertical"
                tabIndex={0}
                aria-valuemin={28}
                aria-valuemax={72}
                aria-valuenow={Math.round(editorWidth)}
                onPointerDown={resize}
                onPointerMove={(e) => {
                  if (e.buttons === 1) resize(e);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                    e.preventDefault();
                    setEditorWidth((w) =>
                      Math.max(
                        28,
                        Math.min(72, w + (e.key === "ArrowLeft" ? -2 : 2)),
                      ),
                    );
                  }
                }}
              />
              <section className="preview-panel">
                <div className="panel-toolbar preview-toolbar">
                  <button
                    className="compile-button"
                    disabled={
                      compiling || conflict || !project.permissions.compile
                    }
                    onClick={() => void compile(true)}
                  >
                    {compiling ? (
                      <LoaderCircle size={14} className="spin" />
                    ) : (
                      <Play size={13} fill="currentColor" />
                    )}{" "}
                    {compiling ? "Compiling" : "Recompile"}
                  </button>
                  <label className="auto-label">
                    <input
                      type="checkbox"
                      checked={autoCompile}
                      onChange={(e) => setAutoCompile(e.target.checked)}
                    />
                    <span className="toggle-track" /> Auto compile
                  </label>
                </div>
                <PdfPreview
                  key={project.id}
                  url={pdfUrl}
                  compiling={compiling}
                />
                <button
                  className={"build-status " + (showLog ? "has-error" : "")}
                  onClick={() => setShowLog(!showLog)}
                  aria-expanded={showLog}
                >
                  <span>
                    {compiling ? (
                      <LoaderCircle size={12} className="spin" />
                    ) : showLog ? (
                      <AlertCircle size={12} />
                    ) : (
                      <Circle size={6} fill="currentColor" />
                    )}
                    {!compiling && pdfUrl && previewKey !== projectKey
                      ? "Preview from an earlier edit"
                      : buildStatus}
                  </span>
                  <MoreHorizontal size={17} />
                </button>
              </section>
            </div>
          </main>
          {showLog && (
            <section className="log-panel">
              <div>
                <strong>Compilation log</strong>
                <button
                  className="icon-button"
                  aria-label="Close compilation log"
                  onClick={() => setShowLog(false)}
                >
                  <X size={15} />
                </button>
              </div>
              <p>{buildStatus}</p>
              {log && <pre>{log}</pre>}
            </section>
          )}
          <footer className="statusbar">
            <span>
              <Leaf size={12} /> Your LaTeX workspace.
            </span>
            <span>
              {wordCount} source tokens <span className="footer-dot">·</span>{" "}
              pdfLaTeX
            </span>
          </footer>
        </>
      )}
      <dialog
        ref={dialog}
        className="modal"
        onCancel={() => setModal(null)}
        onClick={(event) => {
          if (event.target === dialog.current) setModal(null);
        }}
      >
        <div className="modal-heading">
          <h2>
            {modal === "new-project"
              ? "Create a project"
              : modal === "new-file"
                ? "Add a source file"
                : modal === "rename-file"
                  ? "Rename file"
                  : modal === "delete-file"
                    ? "Delete this file?"
                    : modal === "share"
                      ? "Project access"
                      : modal === "new-workspace"
                        ? "Create a workspace"
                        : "Workspace shortcuts"}
          </h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={() => setModal(null)}
          >
            <X size={18} />
          </button>
        </div>
        {modal === "share" ? (
          <ProjectAccess
            project={project}
            onUpdate={(item) => {
              store.replace(item);
              setModal(null);
            }}
            onDelete={() => {
              setProjects((items) =>
                items.filter((item) => item.id !== project.id),
              );
              setDashboard(true);
              setModal(null);
            }}
          />
        ) : modal === "new-workspace" ? (
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setCloudBusy(true);

              try {
                await flush();

                const item = await cloud(
                  "/api/organizations",
                  responses.organization,
                  {
                    method: "POST",
                    body: JSON.stringify({ name: input }),
                  },
                );

                setOrganizations((items) => [...items, item]);
                setOrganizationId(item.id);
                setProjects([]);
                setDashboard(true);
                setModal(null);
              } catch (failure) {
                setInputError(
                  failure instanceof Error
                    ? failure.message
                    : "The request could not be completed.",
                );
              } finally {
                setCloudBusy(false);
              }
            }}
          >
            <label htmlFor="workspace-name">Workspace name</label>
            <input
              id="workspace-name"
              required
              maxLength={80}
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            {inputError && (
              <p className="form-error" role="alert">
                {inputError}
              </p>
            )}
            <button className="primary-button" disabled={cloudBusy}>
              Create workspace
            </button>
          </form>
        ) : modal === "new-project" ? (
          <>
            <p className="modal-description">
              Choose a starting point. The rest is yours.
            </p>
            <div className="template-list">
              {(["article", "report", "blank"] as const).map((template) => (
                <button
                  key={template}
                  disabled={cloudBusy}
                  onClick={() => void newProject(template)}
                >
                  <FileText size={23} />
                  <span>
                    <strong>
                      {template === "article"
                        ? "Classic article"
                        : template === "report"
                          ? "Research report"
                          : "Blank document"}
                    </strong>
                    <small>
                      {template === "article"
                        ? "Sections, equations, and a clean start"
                        : template === "report"
                          ? "Chapters for a bigger story"
                          : "Just you and a fresh page"}
                    </small>
                  </span>
                  <ArrowUpRight size={17} />
                </button>
              ))}
            </div>
            {inputError && (
              <p className="form-error" role="alert">
                {inputError}
              </p>
            )}
          </>
        ) : modal === "new-file" || modal === "rename-file" ? (
          <form onSubmit={submitFile}>
            <label htmlFor="file-name">File path</label>
            <input
              id="file-name"
              autoFocus
              placeholder="sections/methods.tex"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <p className="modal-description">
              Use .tex, .bib, .sty, or .cls. Folder paths are supported. Update
              any references after renaming.
            </p>
            {inputError && (
              <p className="form-error" role="alert">
                {inputError}
              </p>
            )}
            <button className="primary-button" type="submit">
              <FilePlus2 size={16} />
              {modal === "new-file" ? "Create file" : "Save name"}
            </button>
          </form>
        ) : modal === "delete-file" ? (
          <>
            <p className="modal-description">
              Delete {file.path}? Export a backup first if you need to keep it.
            </p>
            <button
              className="danger-button"
              onClick={() => {
                updateProject((item) => ({
                  ...item,
                  files: item.files.filter((f) => f.id !== file.id),
                }));
                setFileId(
                  project.files.find((f) => f.path === project.rootFile)!.id,
                );
                setModal(null);
              }}
            >
              Delete file
            </button>
          </>
        ) : (
          <div className="help-content">
            <p>
              <strong>Compile</strong>
              <br />
              Press Ctrl + Enter (⌘ + Enter on Mac), or turn on Auto compile to
              refresh after a typing pause.
            </p>
            <p>
              <strong>Your files</strong>
              <br />
              Edits are saved to your account after a typing pause. Export a ZIP
              for an extra backup. A revision conflict stops edits until you
              reload.
            </p>
            <p>
              <strong>Preview</strong>
              <br />
              Compilation uses the root document. If an edit has an error, your
              last successful PDF stays visible.
            </p>
            <p>
              <strong>Team access</strong>
              <br />
              Invite people from Team settings, then grant access to private
              projects. Viewer seats and archived projects are read-only.
            </p>
          </div>
        )}
      </dialog>
    </div>
  );
}
