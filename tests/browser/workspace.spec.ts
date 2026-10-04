import {
  test,
  expect,
  request,
  type APIRequestContext,
} from "@playwright/test";

import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { emailLink } from "../mail-helper";

let authenticated: APIRequestContext;

let cookies: Awaited<ReturnType<APIRequestContext["storageState"]>>["cookies"];

let userId: string;

let orgId: string;

let accountEmail: string;

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3001";

test.beforeAll(async () => {
  authenticated = await request.newContext({
    baseURL,
    extraHTTPHeaders: { Origin: baseURL },
  });

  const email = "browser-" + randomUUID() + "@example.test",
    password = "Browser-acceptance-password!";

  accountEmail = email;

  const signup = await authenticated.post("/api/auth/sign-up/email", {
    data: { name: "Browser writer", email, password, callbackURL: "/sign-in" },
  });

  expect(signup.status()).toBe(200);
  userId = (await signup.json()).user.id;
  await authenticated.get(await emailLink(email, "Verify"));
  expect(
    (
      await authenticated.post("/api/auth/sign-in/email", {
        data: { email, password },
      })
    ).status(),
  ).toBe(200);
  cookies = (await authenticated.storageState()).cookies;
  orgId = (await (await authenticated.get("/api/organizations")).json())[0].id;
});

test.afterAll(async () => {
  const db = new Pool({ connectionString: process.env.DATABASE_URL });

  if (userId) {
    await db.query("DELETE FROM organizations WHERE owner_id=$1", [userId]);
    await db.query('DELETE FROM "user" WHERE id=$1', [userId]);
  }

  await db.end();
  await authenticated?.dispose();
});

test.beforeEach(async ({ context, page }, info) => {
  await context.addCookies(cookies);

  const created = await authenticated.post("/api/projects", {
    data: { organizationId: orgId, template: "article" },
  });

  expect(created.status()).toBe(201);
  const project = await created.json();
  const title = "Acceptance " + info.title;

  const saved = await authenticated.put("/api/projects/" + project.id, {
    data: {
      expectedRevision: project.revision,
      project: {
        id: project.id,
        title,
        rootFile: project.rootFile,
        files: project.files,
      },
    },
  });

  expect(saved.status()).toBe(200);
  await page.goto("/");
  await page
    .getByRole("button", {
      name: new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    })
    .click();
});

async function reopen(page: import("@playwright/test").Page, title: string) {
  await page.goto("/");
  await page.getByRole("button", { name: new RegExp(title) }).click();
}

test("billing shows workspace plans and usage on desktop and mobile", async ({
  page,
}) => {
  await page.goto("/organizations/" + orgId + "/billing");
  await expect(
    page.getByRole("heading", { name: "Room for your next chapter." }),
  ).toBeVisible();
  await expect(
    page.getByRole("table", { name: "Workspace plan comparison" }),
  ).toBeVisible();
  await expect(
    page.getByText("Compilation allowance resets", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Refresh status" }).click();
  await expect(page.getByRole("status")).toHaveText("Plan and usage updated.");
  await page.screenshot({
    path: "test-results/billing-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.getByRole("table")).toBeVisible();
  await page.screenshot({
    path: "test-results/billing-mobile.png",
    fullPage: true,
  });

  const response = await authenticated.post(
    "/api/organizations/" + orgId + "/billing/checkout",
    { data: { plan: "team", priceId: "forged", customerId: "forged" } },
  );

  expect(response.status()).toBe(400);

  const foreign = await authenticated.post(
    "/api/organizations/" + orgId + "/billing/portal",
    { data: {}, headers: { Origin: "https://untrusted.example" } },
  );

  expect(foreign.status()).toBe(403);
});

test("edits, saves, reloads, renders a PDF and preserves it on LaTeX failure", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await expect(page.getByRole("button", { name: "Download PDF" })).toBeEnabled({
    timeout: 40_000,
  });
  await expect(page.getByLabel("PDF preview, page 1")).toBeVisible();
  await expect(page.getByLabel("PDF preview, page 1")).toHaveAttribute(
    "data-rendered",
    "true",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= innerHeight + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/editor-preview.png",
    fullPage: true,
  });
  await page.getByLabel("Auto compile").uncheck();
  await page.getByLabel("Project title").fill("Browser acceptance project");
  const editor = page.getByRole("textbox", { name: "LaTeX source editor" });
  await editor.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("\n% durable browser edit");
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await reopen(page, "Browser acceptance project");
  await expect(page.getByLabel("Project title")).toHaveValue(
    "Browser acceptance project",
  );
  await page.getByRole("textbox", { name: "LaTeX source editor" }).click();
  await page.keyboard.press("Control+End");
  await expect(
    page.getByRole("textbox", { name: "LaTeX source editor" }),
  ).toContainText("durable browser edit");
  await expect(page.getByRole("button", { name: "Download PDF" })).toBeEnabled({
    timeout: 40_000,
  });
  await page.getByLabel("Auto compile").uncheck();
  await page.getByRole("textbox", { name: "LaTeX source editor" }).click();
  await page.keyboard.press("Control+Home");
  await page.keyboard.type("\\undefinedcommand\n");
  await page.getByRole("button", { name: "Recompile", exact: true }).click();
  await expect(page.getByText("Compilation log", { exact: true })).toBeVisible({
    timeout: 40_000,
  });
  await expect(page.locator(".log-panel pre")).toContainText(
    "Undefined control sequence",
  );
  await expect(
    page.getByRole("button", { name: "Download PDF" }),
  ).toBeEnabled();
  await expect(page.getByLabel("PDF preview, page 1")).toBeVisible();
  expect(errors).toEqual([]);
  await page.screenshot({ path: "test-results/workspace.png", fullPage: true });
});

test("creates a project, manages files, exports and supports small screens", async ({
  page,
}) => {
  await page.getByLabel("Auto compile").uncheck();
  await page.getByRole("button", { name: "Folio projects" }).click();
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByRole("button", { name: /Blank document/ }).click();
  await expect(page.getByLabel("Project title")).toHaveValue(
    "Untitled project",
  );
  await page.getByRole("button", { name: "Add file" }).click();
  await page.getByLabel("File path").fill("../escape.tex");
  await page.getByRole("button", { name: "Create file" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
  await page.getByLabel("File path").fill("sections/methods.tex");
  await page.getByRole("button", { name: "Create file" }).click();
  await expect(page.locator(".file-row.selected")).toContainText(
    "sections/methods.tex",
  );
  await page.getByRole("button", { name: "Rename file", exact: true }).click();
  await page.getByLabel("File path").fill("sections/results.tex");
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.locator(".file-row.selected")).toContainText(
    "sections/results.tex",
  );
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export source" }).click();
  expect((await downloaded).suggestedFilename()).toMatch(/\.zip$/);
  await page.getByRole("button", { name: "Delete file", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete file", exact: true })
    .last()
    .click();
  await expect(page.locator(".file-row")).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".file-sidebar")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Source", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "PDF preview", exact: true }).click();
  await expect(page.locator(".preview-panel")).toBeVisible();
  await expect(page.locator(".editor-panel")).not.toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollHeight <= innerHeight + 1 &&
        document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Show files", exact: true }).click();
  await expect(page.locator(".file-sidebar")).toBeVisible();
  await page.getByRole("button", { name: "Hide files", exact: true }).click();
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
});

test("rejects a stale build completion when the source changes while compiling", async ({
  page,
}) => {
  await expect(page.getByRole("button", { name: "Download PDF" })).toBeEnabled({
    timeout: 40000,
  });
  await page.getByLabel("Auto compile").uncheck();
  let release: (() => void) | undefined;

  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });

  await page.route("**/api/compile", async (route) => {
    const response = await route.fetch();
    await blocked;
    await route.fulfill({ response });
  });
  await page.getByRole("button", { name: "Recompile", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Compiling", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Project title").fill("Changed during build");
  release!();
  await expect(
    page.getByRole("button", { name: "Recompile", exact: true }),
  ).toBeEnabled({ timeout: 40_000 });
  await page
    .getByRole("button", { name: "Preview from an earlier edit" })
    .click();
  await expect(page.locator(".log-panel")).toContainText(
    "Source changed. Recompile to update the preview.",
  );
});

test("does not overwrite another tab's saved projects", async ({
  page,
  context,
}) => {
  await page.getByLabel("Auto compile").uncheck();
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  const other = await context.newPage();
  await reopen(other, "Acceptance does not overwrite");
  await other.getByLabel("Auto compile").uncheck();
  await other.getByLabel("Project title").fill("Edited in another tab");
  await expect(other.locator(".save-status")).toContainText(
    "All changes saved",
  );
  await page.getByLabel("Project title").fill("Conflicting tab edit");
  await expect(page.locator(".notice")).toContainText(
    "changed in another session",
  );
  await expect(page.getByLabel("Project title")).toBeDisabled();
  await other.close();
});

test("rejects oversized edits before they can corrupt a saved library", async ({
  page,
}) => {
  await page.getByLabel("Auto compile").uncheck();
  await page
    .getByRole("textbox", { name: "LaTeX source editor" })
    .fill("x".repeat(200_001));
  await expect(page.locator(".save-status")).toContainText(
    "Edit exceeds the source limit",
  );
  await reopen(page, "Acceptance rejects oversized");
  await expect(
    page.getByRole("textbox", { name: "LaTeX source editor" }),
  ).toContainText("\\documentclass");
  await expect(page.locator(".notice")).toHaveCount(0);
});

test("compile endpoint rejects cross-origin and unsafe projects", async () => {
  const request = authenticated;

  const origin = await request.post("/api/compile", {
    headers: { Origin: "https://example.com" },
    data: {},
  });

  expect(origin.status()).toBe(403);

  const invalid = await request.post("/api/compile", {
    data: {
      id: "test",
      title: "Unsafe",
      rootFile: "../escape.tex",
      files: [{ id: "f", path: "../escape.tex", content: "" }],
    },
  });

  expect(invalid.status()).toBe(400);
});

test("project library searches, filters, and fits mobile screens", async ({
  page,
}) => {
  await page.getByLabel("Auto compile").uncheck();
  await page.getByRole("button", { name: "Folio projects" }).click();
  await page.getByLabel("Search projects").fill("Acceptance project library");
  await expect(page.locator(".project-row")).toHaveCount(1);
  await page.screenshot({
    path: "test-results/library-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Archived", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No matching projects" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel("Search projects")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/library-mobile.png",
    fullPage: true,
  });
});

test("account and team screens support signing out and signing back in", async ({
  page,
}) => {
  await page.getByLabel("Auto compile").uncheck();
  await page.getByRole("link", { name: "Account", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Two-factor authentication" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/account-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/account-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole("link", { name: "Back to workspace" }).click();
  await page.getByRole("link", { name: "Team", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Invite your people" }),
  ).toBeVisible();
  await expect(page.locator(".member-list").first()).toContainText(
    accountEmail,
  );
  await page.screenshot({
    path: "test-results/team-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/team-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole("link", { name: "Back to workspace" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/auth-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/auth-mobile.png",
    fullPage: true,
  });
  await page.getByLabel("Email address").fill(accountEmail);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Browser-acceptance-password!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A home for your ideas." }),
  ).toBeVisible();
});
