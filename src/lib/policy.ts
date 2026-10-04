export type OrgRole = "owner" | "admin" | "member" | "viewer";

export type ProjectRole = "editor" | "viewer";

export type Action = "read" | "write" | "compile" | "manage" | "delete";

export type AccessContext = {
  actor: { id: string; emailVerified: boolean; disabled: boolean };
  organization: { id: string; status: "active" | "suspended" };
  membership: {
    organizationId: string;
    userId: string;
    role: OrgRole;
    state: "active" | "revoked";
    validUntil: string | Date | null;
  } | null;
  project: {
    organizationId: string;
    ownerId: string;
    visibility: "private" | "workspace";
    state: "active" | "archived";
  };
  grant: ProjectRole | null;
  now?: number;
};

export function allowed(context: AccessContext, action: Action): boolean {
  const { actor, organization, membership, project, grant } = context;

  if (
    !actor.emailVerified ||
    actor.disabled ||
    organization.status !== "active" ||
    !membership ||
    membership.state !== "active"
  )
    return false;

  if (
    membership.userId !== actor.id ||
    membership.organizationId !== organization.id ||
    project.organizationId !== organization.id
  )
    return false;

  if (
    membership.validUntil &&
    !(new Date(membership.validUntil).getTime() > (context.now ?? Date.now()))
  )
    return false;

  const administrator =
    membership.role === "owner" || membership.role === "admin";

  const owner = project.ownerId === actor.id;

  const visible =
    administrator ||
    owner ||
    grant !== null ||
    project.visibility === "workspace";

  if (!visible) return false;

  if (action === "read") return true;

  // A viewer seat is a ceiling: a project grant cannot elevate it.
  if (membership.role === "viewer") return false;

  if (action === "manage" || action === "delete") return administrator || owner;

  if (project.state === "archived") return false;

  return administrator || owner || grant === "editor";
}

export function permissions(context: AccessContext) {
  return {
    read: allowed(context, "read"),
    write: allowed(context, "write"),
    compile: allowed(context, "compile"),
    manage: allowed(context, "manage"),
    delete: allowed(context, "delete"),
  };
}

export function activeMembership(
  membership: AccessContext["membership"],
  now = Date.now(),
) {
  return (
    !!membership &&
    membership.state === "active" &&
    (!membership.validUntil || new Date(membership.validUntil).getTime() > now)
  );
}
