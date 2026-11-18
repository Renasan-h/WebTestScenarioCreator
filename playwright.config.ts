import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/ui",
  use: { baseURL: "http://127.0.0.1:1420", browserName: "chromium" },
  webServer: { command: "pnpm dev --host 127.0.0.1", url: "http://127.0.0.1:1420", reuseExistingServer: !process.env.CI, timeout: 60000 },
  reporter: "list",
});
