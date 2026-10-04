"use client";

import { useState } from "react";
import SettingsShell from "./settings-shell";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Key as KeyRound,
  SignOut as LogOut,
} from "@phosphor-icons/react";
import { authClient } from "@/lib/auth-client";

export default function AccountSettings({
  name,
  email,
  enabled,
}: {
  name: string;
  email: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [twoFactor, setTwoFactor] = useState(enabled);
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [setup, setSetup] = useState<{
    totpURI: string;
    backupCodes: string[];
  } | null>(null);

  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function perform(work: () => Promise<void>) {
    setPending(true);
    setError("");
    setMessage("");

    try {
      await work();
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
    <SettingsShell current="account">
      <h1>Keep your space secure.</h1>
      <p className="settings-intro">
        {name} · {email}
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
      <section className="settings-card">
        <h2>
          <ShieldCheck size={21} /> Two-factor authentication
        </h2>
        <p>
          {twoFactor
            ? "Your account requires an authenticator code at sign-in."
            : "Add an authenticator app to protect your account."}
        </p>
        <label>
          Current password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {twoFactor ? (
          <button
            className="secondary-button"
            disabled={pending || !password}
            onClick={() =>
              void perform(async () => {
                const result = await authClient.twoFactor.disable({ password });

                if (result.error) throw new Error(result.error.message);
                setTwoFactor(false);
                setPassword("");
                setMessage("Two-factor authentication disabled.");
              })
            }
          >
            Disable two-factor authentication
          </button>
        ) : !setup ? (
          <button
            className="primary-button"
            disabled={pending || !password}
            onClick={() =>
              void perform(async () => {
                const result = await authClient.twoFactor.enable({
                  password,
                  method: "totp",
                });

                if (result.error) throw new Error(result.error.message);

                if (result.data && "totpURI" in result.data)
                  setSetup({
                    totpURI: result.data.totpURI,
                    backupCodes: result.data.backupCodes,
                  });
                setPassword("");
              })
            }
          >
            Set up authenticator
          </button>
        ) : null}
        {setup && (
          <div className="two-factor-setup">
            <p>
              Add this account manually to an authenticator app such as Google
              Authenticator, 1Password, or Bitwarden. Use time-based codes (30
              seconds).
            </p>
            <label>
              Authenticator setup key
              <code>{new URL(setup.totpURI).searchParams.get("secret")}</code>
            </label>
            <label>
              Authenticator code
              <input
                autoComplete="one-time-code"
                inputMode="numeric"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </label>
            {!twoFactor && (
              <button
                className="primary-button"
                disabled={pending || !code}
                onClick={() =>
                  void perform(async () => {
                    const result = await authClient.twoFactor.verifyTotp({
                      code,
                    });

                    if (result.error) throw new Error(result.error.message);
                    setTwoFactor(true);
                    setCode("");
                    setMessage(
                      "Authenticator verified. Save your recovery codes below before leaving.",
                    );
                  })
                }
              >
                Verify authenticator
              </button>
            )}
            {twoFactor && (
              <>
                <h3>Save your recovery codes</h3>
                <p>
                  Each code can be used once. Keep these somewhere private. They
                  disappear when you leave this page.
                </p>
                <div className="recovery-codes">
                  {setup.backupCodes.map((item) => (
                    <code key={item}>{item}</code>
                  ))}
                </div>
                <button
                  className="secondary-button"
                  onClick={() => {
                    const blob = new Blob([setup.backupCodes.join("\n")], {
                      type: "text/plain",
                    });

                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "folio-recovery-codes.txt";
                    link.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  }}
                >
                  Download recovery codes
                </button>
              </>
            )}
          </div>
        )}
      </section>
      <section className="settings-card">
        <h2>
          <KeyRound size={21} /> Change password
        </h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void perform(async () => {
              const result = await authClient.changePassword({
                currentPassword: password,
                newPassword,
                revokeOtherSessions: true,
              });

              if (result.error) throw new Error(result.error.message);
              setPassword("");
              setNewPassword("");
              setMessage("Password changed. Other sessions were revoked.");
            });
          }}
        >
          <label>
            Current password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label>
            New password
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </label>
          <button className="primary-button" disabled={pending}>
            Change password
          </button>
        </form>
      </section>
      <section className="settings-card">
        <h2>
          <LogOut size={21} /> Sessions
        </h2>
        <p>Lost access to another device? End its session here.</p>
        <button
          className="secondary-button"
          disabled={pending}
          onClick={() =>
            void perform(async () => {
              const result = await authClient.revokeOtherSessions();

              if (result.error) throw new Error(result.error.message);
              setMessage("Other sessions were revoked.");
            })
          }
        >
          Sign out other devices
        </button>
        <button
          className="text-button"
          disabled={pending}
          onClick={() =>
            void perform(async () => {
              await authClient.signOut();
              router.push("/sign-in");
            })
          }
        >
          Sign out this device
        </button>
      </section>
    </SettingsShell>
  );
}
