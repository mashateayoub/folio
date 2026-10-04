import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getActor } from "@/lib/server/auth";
import { organizations } from "@/lib/server/saas";
import OrganizationSettings from "@/components/organization-settings";

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
