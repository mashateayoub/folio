import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getActor } from "@/server/auth/service";
import { organizations } from "@/server/workspaces/service";
import OrganizationSettings from "@/features/workspaces/components/organization-settings";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getActor(await headers());

  if (!actor || !actor.emailVerified) redirect("/sign-in");
  const { id } = await params;

  const organization = (await organizations(actor)).find(
    (item) => item.id === id,
  );

  if (!organization) notFound();

  return <OrganizationSettings id={id} role={organization.role} />;
}
