"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { cloud, CloudError } from "@/lib/cloud-client";
import { responses } from "@/lib/api-responses";
import type { CloudProject } from "@/lib/saas-types";
import type { Project } from "@/lib/project";

export function source(project: Project): Project {
  return {
    id: project.id,
    title: project.title.trim() || "Untitled project",
    rootFile: project.rootFile,
    files: project.files,
  };
}

export function sourceKey(project: Project) {
  return JSON.stringify(source(project));
}

export function useProjectPersistence(
  projects: CloudProject[],
  setProjects: Dispatch<SetStateAction<CloudProject[]>>,
) {
  const latest = useRef(projects);

  const persisted = useRef(
    new Map(
      projects.map((project) => [
        project.id,
        { revision: project.revision, key: sourceKey(project) },
      ]),
    ),
  );

  const pending = useRef<Promise<void> | null>(null);
  const blocked = useRef(false);
  const [saveState, setSaveState] = useState("All changes saved");
  const [conflict, setConflict] = useState(false);
  const [retryable, setRetryable] = useState(false);

  const flush = useCallback(
    function save(): Promise<void> {
      if (pending.current) return pending.current.then(() => save());

      if (blocked.current)
        return Promise.reject(new Error("Reload before editing further."));

      const work = async () => {
        while (true) {
          const project = latest.current.find(
            (item) => persisted.current.get(item.id)?.key !== sourceKey(item),
          );

          if (!project) {
            setSaveState("All changes saved");
            setRetryable(false);

            return;
          }

          const saved = persisted.current.get(project.id);

          if (!saved)
            throw new Error("Project state is missing. Reload the workspace.");
          const payload = source(project);
          const key = JSON.stringify(payload);
          setSaveState("Saving…");

          try {
            const result = await cloud(
              "/api/projects/" + project.id,
              responses.project,
              {
                method: "PUT",
                body: JSON.stringify({
                  project: payload,
                  expectedRevision: saved.revision,
                }),
              },
            );

            persisted.current.set(project.id, {
              revision: result.revision,
              key,
            });
            setProjects((items) =>
              items.map((item) =>
                item.id === project.id
                  ? {
                      ...item,
                      revision: result.revision,
                      permissions: result.permissions,
                    }
                  : item,
              ),
            );
          } catch (failure) {
            const error =
              failure instanceof Error
                ? failure
                : new Error(
                    "Could not save. Your edits are still in this tab.",
                  );

            const status = failure instanceof CloudError ? failure.status : 0;

            if ([401, 403, 404, 409].includes(status)) {
              blocked.current = true;
              setConflict(true);
            } else setRetryable(true);
            setSaveState(
              error.message ||
                "Could not save. Your edits are still in this tab.",
            );
            throw error;
          }
        }
      };

      const promise = work().finally(() => {
        pending.current = null;
      });

      pending.current = promise;

      return promise;
    },
    [setProjects],
  );

  useEffect(() => {
    latest.current = projects;

    for (const project of projects)
      if (!persisted.current.has(project.id))
        persisted.current.set(project.id, {
          revision: project.revision,
          key: sourceKey(project),
        });

    if (
      blocked.current ||
      !projects.some(
        (item) => persisted.current.get(item.id)?.key !== sourceKey(item),
      )
    )
      return;

    const timer = setTimeout(() => {
      void flush().catch(() => undefined);
    }, 600);

    return () => clearTimeout(timer);
  }, [projects, flush]);
  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (
        latest.current.some(
          (item) => persisted.current.get(item.id)?.key !== sourceKey(item),
        )
      ) {
        event.preventDefault();
        event.returnValue = "";
      }
    }

    window.addEventListener("beforeunload", beforeUnload);

    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);

  function replace(project: CloudProject) {
    persisted.current.set(project.id, {
      revision: project.revision,
      key: sourceKey(project),
    });
    setProjects((items) =>
      items.map((item) => (item.id === project.id ? project : item)),
    );
  }

  const revision = useCallback(
    (id: string) => persisted.current.get(id)?.revision,
    [],
  );

  return {
    flush,
    saveState,
    setSaveState,
    conflict,
    retryable,
    revision,
    replace,
  };
}
