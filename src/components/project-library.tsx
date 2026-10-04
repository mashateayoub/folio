"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Archive,
  FileText,
  FolderOpen,
  LockSimple,
  MagnifyingGlass,
  Plus,
  SquaresFour,
  Users,
  SlidersHorizontal,
  ArrowRight,
  CreditCard,
} from "@phosphor-icons/react";
import type { CloudProject, Organization } from "@/lib/saas-types";

type Filter = "all" | "private" | "workspace" | "archived";

export default function ProjectLibrary({
  projects,
  organization,
  busy,
  blocked,
  onOpen,
  onCreate,
  onTemplates,
  onNavigate,
}: {
  projects: CloudProject[];
  organization?: Organization;
  busy: boolean;
  blocked: boolean;
  onOpen: (project: CloudProject) => void;
  onCreate: () => void;
  onTemplates: () => void;
  onNavigate: (href: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState("created");

  const visible = projects.filter(
    (project) =>
      project.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()) &&
      (filter === "all" ||
        (filter === "archived"
          ? project.state === "archived"
          : project.visibility === filter && project.state === "active")),
  );

  const sorted =
    sort === "name"
      ? [...visible].sort((a, b) => a.title.localeCompare(b.title))
      : visible;

  const canCreate =
    !blocked &&
    !busy &&
    organization?.role !== "viewer" &&
    organization?.status === "active";

  return (
    <div className="library-layout">
      <aside className="library-nav" aria-label="Project navigation">
        <div className="library-nav-main">
          <span className="nav-section-label">Workspace</span>
          <button
            className="nav-item active"
            aria-current="page"
            onClick={() => {
              setFilter("all");
              setQuery("");
            }}
          >
            <SquaresFour size={18} /> Projects <span>{projects.length}</span>
          </button>
          <button
            className="nav-item"
            onClick={onTemplates}
            disabled={!canCreate}
          >
            <FileText size={18} /> Templates <ArrowUpRight size={14} />
          </button>
          {organization && (
            <Link
              className="nav-item"
              href={"/organizations/" + organization.id}
              onClick={(event) => {
                event.preventDefault();
                void onNavigate("/organizations/" + organization.id);
              }}
            >
              <Users size={18} /> Team & access
            </Link>
          )}
          {organization && (
            <Link
              className="nav-item"
              href={"/organizations/" + organization.id + "/billing"}
              onClick={(event) => {
                event.preventDefault();
                void onNavigate(
                  "/organizations/" + organization.id + "/billing",
                );
              }}
            >
              <CreditCard size={18} /> Plans & billing
            </Link>
          )}
          <Link
            className="nav-item"
            href="/settings"
            onClick={(event) => {
              event.preventDefault();
              void onNavigate("/settings");
            }}
          >
            <SlidersHorizontal size={18} /> Account settings
          </Link>
        </div>
        <div className="library-nav-foot">
          <span className="role-badge">
            {organization?.plan || "free"} workspace
          </span>
          <p>
            Your work stays with your account. Export source files whenever you
            need a copy.
          </p>
          <span className="nav-role">
            Signed in as {organization?.role || "member"}
          </span>
        </div>
      </aside>
      <main className="dashboard">
        <div className="dashboard-heading">
          <div>
            <h1>A home for your ideas.</h1>
            <p>Your papers, from first draft to final PDF.</p>
          </div>
          <button
            className="primary-button"
            disabled={!canCreate}
            onClick={onCreate}
          >
            <Plus size={17} /> New project
          </button>
        </div>
        <div className="library-toolbar">
          <div className="library-filters" aria-label="Filter projects">
            {(["all", "private", "workspace", "archived"] as const).map(
              (value) => (
                <button
                  key={value}
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {value === "all"
                    ? "All projects"
                    : value === "workspace"
                      ? "Shared"
                      : value[0].toUpperCase() + value.slice(1)}
                </button>
              ),
            )}
          </div>
          <div className="library-tools">
            <label className="project-search">
              <MagnifyingGlass size={17} />
              <input
                aria-label="Search projects"
                placeholder="Search projects…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <select
              aria-label="Sort projects"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="created">Creation order</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
        </div>
        <div className="project-list" aria-busy={busy}>
          <div className="project-list-heading" aria-hidden="true">
            <span>Project</span>
            <span>Source files</span>
            <span>Access</span>
            <span>Revision</span>
            <span />
          </div>
          {sorted.map((project) => (
            <button
              className="project-row"
              key={project.id}
              onClick={() => onOpen(project)}
            >
              <span className="project-row-title">
                <span
                  className={
                    "document-mark " +
                    (project.state === "archived" ? "archived" : "")
                  }
                >
                  <FileText size={23} />
                </span>
                <span>
                  <strong>{project.title}</strong>
                  <small>
                    {project.rootFile}
                    {project.state === "archived" && " · Archived"}
                  </small>
                </span>
              </span>
              <span className="project-row-files">
                {project.files.length}{" "}
                {project.files.length === 1 ? "file" : "files"}
              </span>
              <span className="project-row-access">
                {project.state === "archived" ? (
                  <Archive size={14} />
                ) : project.visibility === "private" ? (
                  <LockSimple size={14} />
                ) : (
                  <Users size={14} />
                )}
                {project.visibility === "private" ? "Private" : "Workspace"}
              </span>
              <span className="project-row-revision">r{project.revision}</span>
              <ArrowUpRight size={18} className="project-row-arrow" />
            </button>
          ))}
          {!sorted.length && (
            <div className="library-empty">
              <FolderOpen size={36} />
              <h2>
                {query || filter !== "all"
                  ? "No matching projects"
                  : "Your next paper starts here."}
              </h2>
              <p>
                {query || filter !== "all"
                  ? "Try another search or show all projects."
                  : organization?.role === "viewer"
                    ? "Projects shared with you will appear here. Ask your team to grant access."
                    : "Start with a blank document or choose an article template."}
              </p>
              {query || filter !== "all" ? (
                <button
                  className="secondary-button"
                  onClick={() => {
                    setQuery("");
                    setFilter("all");
                  }}
                >
                  Clear filters
                </button>
              ) : (
                canCreate && (
                  <button className="primary-button" onClick={onCreate}>
                    <Plus size={16} /> Create a project
                  </button>
                )
              )}
            </div>
          )}
        </div>
        <div className="library-bottom">
          <p>
            {visible.length} {visible.length === 1 ? "project" : "projects"}
            {filter !== "all" || query
              ? " matching your filters"
              : " in this workspace"}
          </p>
          <button
            className="text-button"
            disabled={!canCreate}
            onClick={onTemplates}
          >
            Start from a template <ArrowRight size={15} />
          </button>
        </div>
        <div className="library-note">
          <LockSimple size={16} />
          <p>
            Private by default. Share a project from its access settings when
            you’re ready.
          </p>
        </div>
      </main>
    </div>
  );
}
