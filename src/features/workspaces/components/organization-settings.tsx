"use client";

import { useEffect, useState } from "react";
import SettingsShell from "@/components/shared/settings-shell";
import { Users, ShieldCheck, Pulse as Activity } from "@phosphor-icons/react";
import { cloud } from "@/shared/http/cloud-client";
import { responses } from "@/shared/contracts/api-responses";

type InvitationInput = { email: string; role: string; expiresInDays?: number };

type Detail = import("zod").infer<typeof responses.team>;

export default function OrganizationSettings({
  id,
  role,
}: {
  id: string;
  role: string;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [duration, setDuration] = useState("");
  const [pending, setPending] = useState(false);
  const isAdmin = role === "owner" || role === "admin";

  function load() {
    return cloud("/api/organizations/" + id, responses.team).then(setDetail);
  }

  useEffect(() => {
    if (isAdmin)
      cloud("/api/organizations/" + id, responses.team)
        .then(setDetail)
        .catch((failure: Error) => setError(failure.message));
  }, [id, isAdmin]);

  async function perform(work: () => Promise<void>) {
    setPending(true);
    setError("");
    setMessage("");

    try {
      await work();
      await load();
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
    <SettingsShell current="team" organizationId={id}>
      <h1>{detail?.organization.name || "Your team."}</h1>
      <p className="settings-intro">
        Membership, access, and activity in one place.
      </p>
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
      {isAdmin && !detail && !error && (
        <div aria-label="Loading team settings" aria-busy="true">
          <div className="skeleton skeleton-row" />
          <div className="skeleton skeleton-row" />
          <div className="skeleton skeleton-row" />
        </div>
      )}
      {!isAdmin ? (
        <section className="settings-card">
          <h2>
            <ShieldCheck size={20} /> Your workspace role: {role}
          </h2>
          <p>
            Ask your workspace owner or administrator to manage members and
            invitations.
          </p>
        </section>
      ) : detail ? (
        <>
          <section className="settings-card">
            <h2>
              <Users size={21} /> Invite your people
            </h2>
            <form
              className="invite-form"
              onSubmit={(event) => {
                event.preventDefault();
                void perform(async () => {
                  const invitation: InvitationInput = {
                    email,
                    role: inviteRole,
                  };

                  if (duration) invitation.expiresInDays = Number(duration);
                  await cloud(
                    "/api/organizations/" + id + "/invitations",
                    responses.json,
                    {
                      method: "POST",
                      body: JSON.stringify(invitation),
                    },
                  );
                  setEmail("");
                  setMessage(
                    "Invitation sent. They must accept with a verified account matching this email.",
                  );
                });
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
                Role
                <select
                  aria-label="Invitation role"
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value)}
                >
                  <option value="member">Member — can create projects</option>
                  <option value="viewer">Viewer — read-only seat</option>
                  {role === "owner" && (
                    <option value="admin">Admin — manages the workspace</option>
                  )}
                </select>
              </label>
              <label>
                Membership access
                <select
                  aria-label="Membership duration"
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                >
                  <option value="">Until revoked</option>
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                </select>
              </label>
              <button className="primary-button" disabled={pending}>
                Send invitation
              </button>
            </form>
          </section>
          <section className="settings-card">
            <h2>Members</h2>
            <div className="member-list">
              {detail?.members.map((member) => (
                <div key={member.userId}>
                  <span>
                    <strong>{member.name}</strong>
                    <small>
                      {member.email} · {member.state}
                      {member.validUntil &&
                        " · until " +
                          new Date(member.validUntil).toLocaleDateString()}
                    </small>
                  </span>
                  {member.role === "owner" ||
                  (role !== "owner" && member.role === "admin") ? (
                    <span className="role-badge">{member.role}</span>
                  ) : (
                    <select
                      aria-label={"Role for " + member.email}
                      disabled={pending}
                      value={member.role}
                      onChange={(event) =>
                        void perform(async () => {
                          await cloud(
                            "/api/organizations/" +
                              id +
                              "/members/" +
                              member.userId,
                            responses.json,
                            {
                              method: "PATCH",
                              body: JSON.stringify({
                                role: event.target.value,
                                state: member.state,
                              }),
                            },
                          );
                        })
                      }
                    >
                      {role === "owner" && <option value="admin">Admin</option>}
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  )}
                  {member.role !== "owner" &&
                    (role === "owner" || member.role !== "admin") && (
                      <button
                        className="text-button"
                        disabled={pending}
                        onClick={() =>
                          void perform(async () => {
                            await cloud(
                              "/api/organizations/" +
                                id +
                                "/members/" +
                                member.userId,
                              responses.json,
                              {
                                method: "PATCH",
                                body: JSON.stringify({
                                  role: member.role,
                                  state:
                                    member.state === "active"
                                      ? "revoked"
                                      : "active",
                                }),
                              },
                            );
                          })
                        }
                      >
                        {member.state === "active" ? "Revoke" : "Restore"}
                      </button>
                    )}
                </div>
              ))}
            </div>
            {detail?.invitations.length ? (
              <>
                <h3>Pending invitations</h3>
                <div className="member-list">
                  {detail.invitations.map((invite) => (
                    <div key={invite.id}>
                      <span>
                        {invite.email}
                        <small>{invite.role}</small>
                      </span>
                      <button
                        className="text-button"
                        disabled={pending}
                        onClick={() =>
                          void perform(async () => {
                            await cloud(
                              "/api/organizations/" +
                                id +
                                "/invitations/" +
                                invite.id,
                              responses.json,
                              { method: "DELETE" },
                            );
                          })
                        }
                      >
                        Revoke invitation
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </section>
          <section className="settings-card">
            <h2>
              <Activity size={21} /> Usage and activity
            </h2>
            <p>
              {detail?.usage || 0} / {detail?.compileLimit || 1000} compilation
              requests this month · {detail?.organization.plan || "free"} plan
            </p>
            <p>
              Project access also checks membership expiry, project visibility,
              archive state, and tenant status.
            </p>
            <div className="audit-list">
              {detail?.events.map((event) => (
                <div key={event.id}>
                  <span>
                    {event.action}
                    <small>{event.actor || "Former member"}</small>
                  </span>
                  <time>{new Date(event.createdAt).toLocaleString()}</time>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </SettingsShell>
  );
}
