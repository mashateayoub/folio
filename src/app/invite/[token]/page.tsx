import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getActor } from "@/server/auth/service";
import InvitationScreen from "@/features/invitations/components/invitation-screen";

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
