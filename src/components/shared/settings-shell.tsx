import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  Users,
  SquaresFour,
  CreditCard,
} from "@phosphor-icons/react/dist/ssr";
import Brand from "@/components/shared/brand";

export default function SettingsShell({
  children,
  current,
  organizationId,
}: {
  children: React.ReactNode;
  current: "account" | "team" | "billing";
  organizationId?: string;
}) {
  return (
    <div className="settings-shell">
      <header className="settings-header">
        <Link href="/" className="brand">
          <Brand />
        </Link>
        <Link className="secondary-button" href="/">
          <ArrowLeft size={15} /> Back to workspace
        </Link>
      </header>
      <div className="settings-layout">
        <aside className="settings-nav" aria-label="Settings navigation">
          <Link className="nav-item" href="/">
            <SquaresFour size={18} /> Projects
          </Link>
          <Link
            className={"nav-item " + (current === "account" ? "active" : "")}
            href="/settings"
          >
            <ShieldCheck size={18} /> Account & security
          </Link>
          {organizationId && (
            <Link
              className={"nav-item " + (current === "team" ? "active" : "")}
              href={"/organizations/" + organizationId}
            >
              <Users size={18} /> Team & access
            </Link>
          )}
          {organizationId && (
            <Link
              className={"nav-item " + (current === "billing" ? "active" : "")}
              href={"/organizations/" + organizationId + "/billing"}
            >
              <CreditCard size={18} /> Plans & billing
            </Link>
          )}
          <p>Keep your account secure and your workspace access intentional.</p>
        </aside>
        <main className="settings-page">{children}</main>
      </div>
    </div>
  );
}
