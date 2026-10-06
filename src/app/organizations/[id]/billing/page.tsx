import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getActor } from "@/server/auth/service";
import { organizations } from "@/server/workspaces/service";
import { billingSummary } from "@/server/billing/service";
import BillingSettings from "@/features/billing/components/billing-settings";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getActor(await headers());

  if (!actor || !actor.emailVerified) redirect("/sign-in");
  const { id } = await params;

  if (
    !(await organizations(actor)).some(
      (item) => item.id === id && item.status === "active",
    )
  )
    notFound();

  return <BillingSettings initial={await billingSummary(actor, id)} />;
}
