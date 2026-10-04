import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/server/auth";
import AccountSettings from "@/components/account-settings";

export const dynamic = "force-dynamic";

export default async function Page() {
  const actor = await getActor(await headers());

  if (!actor || !actor.emailVerified) redirect("/sign-in");

  return (
    <AccountSettings
      name={actor.name}
      email={actor.email}
      enabled={actor.twoFactorEnabled}
    />
  );
}
