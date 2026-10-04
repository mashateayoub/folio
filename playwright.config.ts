import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3001",
    headless: true,
    screenshot: "only-on-failure",
    channel: process.env.PLAYWRIGHT_CHANNEL,
  },
});
