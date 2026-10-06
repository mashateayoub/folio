import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getActor } from "@/server/auth/service";
import { organizations } from "@/server/workspaces/service";
import { listProjects } from "@/server/projects/service";
import Workspace from "@/features/editor/components/workspace";

export const dynamic = "force-dynamic";

export default async function Home() {
  const actor = await getActor(await headers());

  if (!actor || !actor.emailVerified) redirect("/sign-in");
  const workspaces = await organizations(actor);

  const workspace = workspaces.find(
    (organization) => organization.status === "active",
  );

  const projects = workspace ? await listProjects(actor, workspace.id) : [];

  return (
    <Workspace
      actor={{ id: actor.id, name: actor.name, email: actor.email }}
      initialOrganizations={workspaces}
      initialProjects={projects}
    />
  );
}
