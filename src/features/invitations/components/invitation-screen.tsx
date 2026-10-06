"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, CircleNotch as LoaderCircle } from "@phosphor-icons/react";
import Brand from "@/components/shared/brand";
import { cloud } from "@/shared/http/cloud-client";
import { responses } from "@/shared/contracts/api-responses";

export default function InvitationScreen({ token }: { token: string }) {
  const router = useRouter();

  const [invite, setInvite] = useState<{ name: string; role: string } | null>(
    null,
  );

  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  useEffect(() => {
    cloud("/api/invitations/" + token, responses.invitation)
      .then(setInvite)
      .catch((failure: Error) => setError(failure.message));
  }, [token]);

  return (
    <main className="invitation-page">
      <Link className="brand" href="/">
        <Brand />
      </Link>
      <section className="settings-card invitation-card">
        <Users size={36} />
        <h1>{invite ? "Join " + invite.name : "Your workspace invitation"}</h1>
        {invite && (
          <p>
            You’ve been invited as a {invite.role}. Accept to start working with
            your team.
          </p>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="primary-button"
          disabled={!invite || pending}
          onClick={async () => {
            setPending(true);

            try {
              await cloud("/api/invitations/" + token, responses.json, {
                method: "POST",
              });
              router.push("/");
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
          {pending && <LoaderCircle size={15} className="spin" />}Accept
          invitation
        </button>
        <p>
          <Link href="/">Back to workspace</Link>
        </p>
      </section>
    </main>
  );
}
