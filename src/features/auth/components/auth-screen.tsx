"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CircleNotch as LoaderCircle,
  ShieldCheck,
} from "@phosphor-icons/react";
import Brand from "@/components/shared/brand";
import AuthSpecimen from "@/features/auth/components/auth-specimen";
import { authClient } from "@/features/auth/client";

type Mode =
  "sign-in" | "sign-up" | "forgot-password" | "reset-password" | "two-factor";

export default function AuthScreen({
  mode,
  token = "",
  next = "/",
}: {
  mode: Mode;
  token?: string;
  next?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [backup, setBackup] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const destination = /^\/invite\/[a-f0-9]{64}$/.test(next) ? next : "/";

  const titles: Record<Mode, string> = {
    "sign-in": "Welcome back.",
    "sign-up": "Make room for your ideas.",
    "forgot-password": "A fresh start.",
    "reset-password": "Choose a new password.",
    "two-factor": "One more step.",
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");

    try {
      if (mode === "sign-up") {
        const result = await authClient.signUp.email({
          name,
          email,
          password,
          callbackURL:
            "/sign-in?verified=true&next=" + encodeURIComponent(destination),
        });

        if (result.error)
          throw new Error(
            result.error.message || "Could not create your account.",
          );
        setMessage(
          "Check your inbox to verify your email. Then sign in to your workspace.",
        );
        setPassword("");
      } else if (mode === "sign-in") {
        const result = await authClient.signIn.email({
          email,
          password,
          rememberMe: true,
        });

        if (result.error)
          throw new Error(result.error.message || "Sign-in failed.");

        if (
          result.data &&
          "twoFactorRedirect" in result.data &&
          result.data.twoFactorRedirect
        )
          router.push("/two-factor?next=" + encodeURIComponent(destination));
        else router.push(destination);
      } else if (mode === "forgot-password") {
        const result = await authClient.requestPasswordReset({
          email,
          redirectTo: "/reset-password",
        });

        if (result.error)
          throw new Error(
            result.error.message || "Could not send a recovery email.",
          );
        setMessage(
          "If an account matches that address, a password reset link is on its way.",
        );
      } else if (mode === "reset-password") {
        const result = await authClient.resetPassword({
          newPassword: password,
          token,
        });

        if (result.error)
          throw new Error(
            result.error.message || "This recovery link is invalid or expired.",
          );
        setMessage(
          "Your password was changed and previous sessions were revoked. You can sign in now.",
        );
        setPassword("");
      } else {
        const result = backup
          ? await authClient.twoFactor.verifyBackupCode({ code })
          : await authClient.twoFactor.verifyTotp({ code, trustDevice: false });

        if (result.error)
          throw new Error(
            result.error.message || "That code could not be verified.",
          );
        router.push(destination);
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Something went wrong. Try again.",
      );
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    if (!email) {
      setError("Enter your email address first.");

      return;
    }

    setPending(true);
    setError("");

    try {
      const result = await authClient.sendVerificationEmail({
        email,
        callbackURL:
          "/sign-in?verified=true&next=" + encodeURIComponent(destination),
      });

      if (result.error)
        throw new Error(result.error.message || "Could not send email.");
      setMessage(
        "If your address needs verification, check your inbox for a verification link.",
      );
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Could not send email.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-story auth-story-sequence">
        <Link href="/sign-in" className="brand">
          <Brand />
        </Link>
        <div className="auth-story-content">
          <h1>
            Make space
            <br />
            for your next idea.
          </h1>
          <p>
            Write LaTeX. See your document take shape.
            <br />
            Keep your papers and your people in one place.
          </p>
          <AuthSpecimen />
        </div>
        <span className="auth-story-footer">
          <ShieldCheck size={16} /> Your projects. Your access rules.
        </span>
      </section>
      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <span className="auth-form-mark" aria-hidden="true">
            <Brand compact />
          </span>
          <h2>{titles[mode]}</h2>
          <p className="auth-description">
            {mode === "sign-up"
              ? "Create your account to start your first paper."
              : mode === "two-factor"
                ? "Enter a code from your authenticator or a saved recovery code."
                : mode === "forgot-password"
                  ? "Enter your email. We’ll send a link to get you back in."
                  : mode === "reset-password"
                    ? "Use a new password with at least 12 characters."
                    : "Sign in to pick up where you left off."}
          </p>
          <form onSubmit={submit}>
            {mode === "sign-up" && (
              <label>
                Your name
                <input
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={80}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
            )}
            {["sign-in", "sign-up", "forgot-password"].includes(mode) && (
              <label>
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
            )}
            {["sign-in", "sign-up", "reset-password"].includes(mode) && (
              <label>
                Password
                <input
                  type="password"
                  autoComplete={
                    mode === "sign-in" ? "current-password" : "new-password"
                  }
                  required
                  minLength={mode === "sign-in" ? 1 : 12}
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                {mode !== "sign-in" && (
                  <small>Use at least 12 characters.</small>
                )}
              </label>
            )}
            {mode === "two-factor" && (
              <label>
                {backup ? "Recovery code" : "Authenticator code"}
                <input
                  autoComplete="one-time-code"
                  inputMode={backup ? "text" : "numeric"}
                  required
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                />
              </label>
            )}
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
            <button
              className="primary-button auth-submit"
              disabled={pending || (mode === "reset-password" && !token)}
            >
              {pending ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <ArrowRight size={16} />
              )}
              {mode === "sign-up"
                ? "Create account"
                : mode === "sign-in"
                  ? "Sign in"
                  : mode === "forgot-password"
                    ? "Send reset link"
                    : mode === "reset-password"
                      ? "Save new password"
                      : "Verify code"}
            </button>
          </form>
          {mode === "sign-in" && (
            <>
              <div className="auth-links">
                <Link href="/forgot-password">Forgot password?</Link>
                <button disabled={pending} onClick={resend}>
                  Resend verification
                </button>
              </div>
              <p className="auth-switch">
                New to Folio?{" "}
                <Link href={"/sign-up?next=" + encodeURIComponent(destination)}>
                  Create an account
                </Link>
              </p>
            </>
          )}
          {mode === "sign-up" && (
            <p className="auth-switch">
              Already have an account?{" "}
              <Link href={"/sign-in?next=" + encodeURIComponent(destination)}>
                Sign in
              </Link>
            </p>
          )}
          {mode === "two-factor" ? (
            <button
              className="text-button"
              onClick={() => {
                setBackup(!backup);
                setCode("");
              }}
            >
              {backup ? "Use an authenticator code" : "Use a recovery code"}
            </button>
          ) : (
            mode !== "sign-in" &&
            mode !== "sign-up" && (
              <p className="auth-switch">
                <Link href="/sign-in">Back to sign in</Link>
              </p>
            )
          )}
        </div>
      </section>
    </main>
  );
}
