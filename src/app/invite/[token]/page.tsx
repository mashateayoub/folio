import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/server/auth";
import InvitationScreen from "@/components/invitation-screen";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!(await getActor(await headers())))
    redirect("/sign-in?next=" + encodeURIComponent("/invite/" + token));

  return <InvitationScreen token={token} />;
}
