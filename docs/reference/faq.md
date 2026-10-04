# Frequently asked questions

**Is the preview a real PDF?** Yes. latexmk/pdflatex runs in a short-lived Docker job, then PDF.js renders persisted/downloaded bytes. It is not a simulated HTML preview.

**Is every keystroke saved/compiled instantly?** No. Autosave waits 600 ms; auto compilation waits 1,200 ms and flushes a saved revision first. Network and typesetting time follow. Manual compile is available.

**Can two people edit simultaneously?** They can be authorized for the same project, but concurrent saves use revision conflicts. There is no simultaneous collaboration protocol or automatic merge.

**Can I upload images or import ZIPs?** Not yet. Supported source files are textual TeX/Bib/style/class files. Source ZIP export and legacy browser project import exist.

**Why can a viewer with an editor grant not edit?** Workspace viewer is an explicit ceiling. Role, membership expiry, resource tenant, and project state are all checked on the server.

**Why is archived project capacity still used?** Archive keeps data and only blocks write/compile. Delete releases project capacity.

**Does one Team purchase upgrade my account?** It upgrades one workspace's recognized entitlement. Other workspaces keep their own plans.

**Why am I Free after successful checkout?** The redirect is not proof of paid access. Check signed webhook delivery and reconcile current provider state; expiry, status, mismatched configuration, or conflicting subscriptions can deny Team.

**Does a cancellation remove projects?** No. Capacity/compile admission changes; existing source and members remain. Access is still subject to ordinary authorization.

**Is local Compose production-ready hosting?** It builds production Next, but its infrastructure is local and explicitly allows HTTP. Public HTTPS/SMTP/backups/isolation/capacity/scheduling still need setup.

**Where are secrets and PDFs?** Secrets are private environment values. Source/accounts and finished PDFs are in PostgreSQL. Scratch files are temporary. Generated previews/test screenshots are not authoritative database backups.

**Why did a test pass on retry?** Inspect its actual failure. Overlapping authentication suites can hit enforced rate limits. Only rerun after the limit window when evidence identifies that cause; do not treat every failure as flaky.

**Are old anti-slop diagnostics current?** No. They preserve the 752-finding installation baseline; current combined lint passes with all rules enabled.

**What should I read next?** [Quick start](../getting-started/quick-start.md), [system](../architecture/system.md), [API](api-routes.md), or [troubleshooting](../operations/troubleshooting.md), depending on your task.
