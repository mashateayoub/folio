"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, CreditCard } from "@phosphor-icons/react";
import SettingsShell from "@/components/shared/settings-shell";
import { cloud } from "@/shared/http/cloud-client";
import { responses } from "@/shared/contracts/api-responses";
import { type z } from "zod";

type Summary = z.infer<typeof responses.billing>;

function money(amount: number, currency: string) {
  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  });

  const digits = ["isk", "ugx"].includes(currency)
    ? 2
    : formatter.resolvedOptions().maximumFractionDigits;

  return formatter.format(amount / 10 ** (digits ?? 2));
}

export default function BillingSettings({ initial }: { initial: Summary }) {
  const [detail, setDetail] = useState(initial);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const endpoint = "/api/organizations/" + detail.organization.id + "/billing";
  useEffect(() => {
    if (
      new URLSearchParams(window.location.search).get("checkout") !== "success"
    )
      return;
    let stopped = false;
    let attempts = 0;

    const timer = setInterval(() => {
      if (++attempts > 10) {
        clearInterval(timer);

        return;
      }

      cloud(endpoint, responses.billing)
        .then((value) => {
          if (stopped) return;
          setDetail(value);

          if (value.organization.plan === "team") clearInterval(timer);
        })
        .catch(() => {
          /* Manual refresh remains available. */
        });
    }, 3000);

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [endpoint]);

  async function open(kind: "checkout" | "portal") {
    setBusy(kind);
    setError("");

    try {
      const value = await cloud(endpoint + "/" + kind, responses.redirect, {
        method: "POST",
        body: JSON.stringify(kind === "checkout" ? { plan: "team" } : {}),
      });

      window.location.assign(value.url);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "The request could not be completed.",
      );
      setBusy("");
    }
  }

  async function refresh() {
    setBusy("refresh");
    setError("");
    setNotice("");

    try {
      setDetail(
        await cloud(
          endpoint +
            (detail.canManage && detail.portalAvailable ? "/sync" : ""),
          responses.billing,
          detail.canManage && detail.portalAvailable
            ? { method: "POST", body: "{}" }
            : {},
        ),
      );
      setNotice("Plan and usage updated.");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "The request could not be completed.",
      );
    } finally {
      setBusy("");
    }
  }

  const scheduledEnd =
    detail.subscription.cancelAt ||
    (detail.subscription.cancelAtPeriodEnd
      ? detail.subscription.periodEnd
      : null);

  const pending = !["none", "canceled", "incomplete_expired"].includes(
    detail.subscription.status,
  );

  return (
    <SettingsShell current="billing" organizationId={detail.organization.id}>
      <h1>Room for your next chapter.</h1>
      <p className="settings-intro">
        Plans and usage for {detail.organization.name}. One subscription covers
        the whole workspace.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="form-success" role="status">
          {notice}
        </p>
      )}
      <section className="settings-card">
        <div className="billing-current">
          <div>
            <h2>
              <CreditCard size={21} />{" "}
              {detail.plans[detail.organization.plan].name} plan
            </h2>
            <p>
              {detail.subscription.status === "none"
                ? "Your workspace is on the free plan."
                : "Subscription: " +
                  detail.subscription.status.replaceAll("_", " ") +
                  "."}
              {detail.subscription.periodEnd &&
                " " +
                  (scheduledEnd
                    ? "Scheduled to end "
                    : "Current period ends ") +
                  new Date(
                    scheduledEnd || detail.subscription.periodEnd,
                  ).toLocaleDateString() +
                  "."}
            </p>
          </div>
          <button
            className="secondary-button"
            disabled={Boolean(busy)}
            onClick={() => void refresh()}
          >
            {busy === "refresh" ? "Refreshing…" : "Refresh status"}
          </button>
        </div>
        {!detail.canManage && (
          <p>Your workspace owner manages payments and plan changes.</p>
        )}
        {detail.canManage && detail.portalAvailable && (
          <button
            className="secondary-button"
            disabled={Boolean(busy)}
            onClick={() => void open("portal")}
          >
            {busy === "portal" ? "Opening portal…" : "Manage billing"}
            <ArrowUpRight size={16} />
          </button>
        )}
        {detail.organization.plan === "free" && pending && (
          <p className="billing-note">
            Your subscription needs attention. Open billing to review payment
            details. Free limits apply until paid access is confirmed.
          </p>
        )}
      </section>
      <section className="settings-card">
        <h2>What your workspace is using</h2>
        <dl className="billing-usage">
          {(["projects", "seats", "compiles"] as const).map((key) => (
            <div key={key}>
              <dt>
                {key === "compiles"
                  ? "Compilations this month"
                  : key === "seats"
                    ? "Active members"
                    : "Projects"}
              </dt>
              <dd>
                {detail.usage[key].toLocaleString()}{" "}
                <span>/ {detail.limits[key].toLocaleString()}</span>
              </dd>
            </div>
          ))}
        </dl>
        <p>
          Compilation allowance resets on the first day of each month, in UTC.
          Pending invitations do not reserve a seat.
        </p>
      </section>
      <section className="settings-card">
        <h2>A plan for the way you write</h2>
        <div className="billing-table-wrap">
          <table className="billing-table">
            <caption className="sr-only">Workspace plan comparison</caption>
            <thead>
              <tr>
                <th scope="col">Included</th>
                <th scope="col">
                  Free
                  {detail.organization.plan === "free" && (
                    <span className="role-badge">Current plan</span>
                  )}
                </th>
                <th scope="col">
                  Team
                  {detail.organization.plan === "team" && (
                    <span className="role-badge">Current plan</span>
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Price per workspace</th>
                <td>Free</td>
                <td>
                  {detail.price
                    ? money(detail.price.amount, detail.price.currency) +
                      " / month"
                    : "Currently unavailable"}
                </td>
              </tr>
              {(["projects", "seats", "compiles"] as const).map((key) => (
                <tr key={key}>
                  <th scope="row">
                    {key === "compiles"
                      ? "Compilations / month"
                      : key === "seats"
                        ? "Active members"
                        : "Projects"}
                  </th>
                  <td>{detail.plans.free[key].toLocaleString()}</td>
                  <td>{detail.plans.team[key].toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {detail.canManage &&
          detail.organization.plan === "free" &&
          !pending && (
            <button
              className="primary-button"
              disabled={Boolean(busy) || !detail.checkoutAvailable}
              onClick={() => void open("checkout")}
            >
              {busy === "checkout" ? "Opening checkout…" : "Choose Team"}
              <ArrowUpRight size={16} />
            </button>
          )}
        <p className="billing-note">
          Plan changes keep your projects and members. If usage exceeds your new
          limits, you can keep editing existing projects; additional projects
          and seats require space within the allowance. Payments, invoices, and
          cancellation are managed through Stripe.
        </p>
      </section>
    </SettingsShell>
  );
}
