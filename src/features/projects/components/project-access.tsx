"use client";

import { useEffect, useState } from "react";
import { cloud } from "@/shared/http/cloud-client";
import { responses } from "@/shared/contracts/api-responses";
import { type CloudProject } from "@/shared/types/saas";

type Grant = { userId: string; email: string; role: "editor" | "viewer" };

export default function ProjectAccess({
  project,
  onUpdate,
  onDelete,
}: {
  project: CloudProject;
  onUpdate: (project: CloudProject) => void;
  onDelete: () => void;
}) {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("viewer");
  const [visibility, setVisibility] = useState(project.visibility);
  const [state, setState] = useState(project.state);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function load() {
    return cloud(
      "/api/projects/" + project.id + "/members",
      responses.grants,
    ).then(setGrants);
  }

  useEffect(() => {
    cloud("/api/projects/" + project.id + "/members", responses.grants)
      .then(setGrants)
      .catch((failure: Error) => setError(failure.message));
  }, [project.id]);

  async function grant(email: string, role: "editor" | "viewer" | null) {
    setPending(true);
    setError("");
    setMessage("");

    try {
      await cloud("/api/projects/" + project.id + "/members", responses.json, {
        method: "PUT",
        body: JSON.stringify({ email, role }),
      });
      await load();
      setMessage("Project access updated.");
      setEmail("");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "The request could not be completed.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="access-settings">
      <p className="modal-description">
        Owners and workspace administrators can manage this project. A viewer
        seat always stays read-only.
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError("");

          try {
            onUpdate(
              await cloud(
                "/api/projects/" + project.id + "/settings",
                responses.project,
                {
                  method: "PATCH",
                  body: JSON.stringify({ visibility, state }),
                },
              ),
            );
          } catch (failure) {
            setError(
              failure instanceof Error
                ? failure.message
                : "The request could not be completed.",
            );
          } finally {
            setPending(false);
          }
        }}
      >
        <label>
          Visibility
          <select
            aria-label="Project visibility"
            value={visibility}
            onChange={(event) =>
              setVisibility(
                event.target.value === "workspace" ? "workspace" : "private",
              )
            }
          >
            <option value="private">
              Private — owner and invited project members
            </option>
            <option value="workspace">
              Workspace — all active workspace members can read
            </option>
          </select>
        </label>
        <label>
          Project state
          <select
            aria-label="Project state"
            value={state}
            onChange={(event) =>
              setState(
                event.target.value === "archived" ? "archived" : "active",
              )
            }
          >
            <option value="active">Active</option>
            <option value="archived">
              Archived — editing and compilation disabled
            </option>
          </select>
        </label>
        <button className="primary-button" disabled={pending}>
          Save project settings
        </button>
      </form>
      <hr />
      <h3>Share with a workspace member</h3>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void grant(email, role);
        }}
      >
        <label>
          Email address
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Project role
          <select
            value={role}
            onChange={(event) =>
              setRole(event.target.value === "editor" ? "editor" : "viewer")
            }
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
          </select>
        </label>
        <button className="secondary-button" disabled={pending}>
          Grant project access
        </button>
      </form>
      <div className="grant-list">
        {grants.map((item) => (
          <div key={item.userId}>
            <span>
              {item.email}
              <small>{item.role}</small>
            </span>
            <button
              className="text-button"
              disabled={pending}
              onClick={() => void grant(item.email, null)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="form-success" role="status">
          {message}
        </p>
      )}
      <hr />
      {deleting ? (
        <div>
          <p className="form-error">
            Deleting this project removes its files and saved PDFs.
          </p>
          <button
            className="danger-button"
            disabled={pending}
            onClick={async () => {
              setPending(true);

              try {
                await cloud("/api/projects/" + project.id, responses.json, {
                  method: "DELETE",
                });
                onDelete();
              } catch (failure) {
                setError(
                  failure instanceof Error
                    ? failure.message
                    : "The request could not be completed.",
                );
                setPending(false);
              }
            }}
          >
            Confirm project deletion
          </button>
        </div>
      ) : (
        <button
          className="text-button danger-text"
          onClick={() => setDeleting(true)}
        >
          Delete project
        </button>
      )}
    </div>
  );
}
