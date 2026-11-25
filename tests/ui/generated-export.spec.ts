import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { test, expect } from "@playwright/test";
import { exportPlaywrightTest } from "../../packages/engine/src/export";
import type { Scenario } from "../../packages/schema/src/scenario";

for (const ready of [true, false]) {
  const scenario: Scenario = {
    schemaVersion: "1.0",
    metadata: { id: "generated", name: "Generated branch " + ready, createdAt: "", updatedAt: "" },
    settings: { browser: "chromium", headless: true, timeoutMs: 5000, viewport: { width: 800, height: 600 } },
    variables: {},
    nodes: [
      { id: "start", type: "start", label: "Start", position: { x: 0, y: 0 }, config: {} },
      { id: "fill", type: "fill", label: "Fill", position: { x: 0, y: 100 }, config: { locator: { strategy: "testId", value: "name" }, value: "日本語", timeoutMs: 1500 } },
      { id: "click", type: "click", label: "Click", position: { x: 0, y: 200 }, config: { locator: { strategy: "role", role: "button", name: "Submit" }, timeoutMs: 1500 } },
      { id: "branch", type: "condition", label: "Branch", position: { x: 0, y: 300 }, config: { locator: { strategy: "css", value: "#status" }, check: "textContains", expected: "Ready" } },
      { id: "yes", type: "assertText", label: "Yes", position: { x: 0, y: 400 }, config: { locator: { strategy: "css", value: "#status" }, expected: "Ready: 日本語" } },
      { id: "no", type: "assertText", label: "No", position: { x: 200, y: 400 }, config: { locator: { strategy: "css", value: "#status" }, expected: "Rejected: 日本語" } },
      { id: "end", type: "end", label: "End", position: { x: 0, y: 500 }, config: {} },
    ],
    edges: [
      { id: "a", source: "start", target: "fill" },
      { id: "b", source: "fill", target: "click" },
      { id: "c", source: "click", target: "branch" },
      { id: "d", source: "branch", target: "yes", sourceHandle: "true" },
      { id: "e", source: "branch", target: "no", sourceHandle: "false" },
      { id: "f", source: "yes", target: "end" },
      { id: "g", source: "no", target: "end" },
    ],
  };
  test("generated Playwright flow executes " + (ready ? "YES" : "NO") + " branch", async ({ page }) => {
    await page.setContent('<input data-testid="name" value="old"><button>Submit</button><div id="status"></div>');
    await page.evaluate(prefix => {
      document.querySelector("button")!.addEventListener("click", () => {
        document.querySelector("#status")!.textContent = prefix + ": " + document.querySelector("input")!.value;
      });
    }, ready ? "Ready" : "Rejected");
    const code = exportPlaywrightTest(scenario);
    const marker = "async ({ page }) => {";
    expect(code).toContain(marker);
    const body = code.slice(code.indexOf(marker) + marker.length, code.lastIndexOf("});"));
    await new Function("page", "return (async () => {" + body + "})();")(page);
    await expect(page.getByTestId("name")).toHaveValue("日本語");
    await expect(page.locator("#status")).toHaveText((ready ? "Ready" : "Rejected") + ": 日本語");
  });
  test("standalone generated Playwright file executes " + (ready ? "YES" : "NO"), async () => {
    test.setTimeout(90000);
    const directory = await mkdtemp(join(resolve("."), ".generated-export-"));
    try {
      const html = '<input data-testid="name" value="old"><button onclick="document.querySelector(\'#status\').textContent='
        + (ready ? "\'Ready: \'" : "\'Rejected: \'")
        + '+document.querySelector(\'input\').value">Submit</button><div id="status"></div>';
      const standalone: Scenario = {
        ...scenario,
        nodes: [...scenario.nodes, { id: "nav", type: "navigate", label: "Navigate", position: { x: 100, y: 0 }, config: { url: "data:text/html;charset=utf-8," + encodeURIComponent(html) } }],
        edges: [...scenario.edges.map(edge => edge.source === "start" ? { ...edge, target: "nav" } : edge), { id: "nav-fill", source: "nav", target: "fill" }],
      };
      await writeFile(join(directory, "generated.spec.ts"), exportPlaywrightTest(standalone), "utf8");
      await writeFile(join(directory, "playwright.config.ts"), 'export default { testDir: ".", workers: 1, reporter: "json", retries: 0 };', "utf8");
      const cli = createRequire(import.meta.url).resolve("@playwright/test/cli");
      const { stdout } = await promisify(execFile)(process.execPath, [cli, "test", "--config", join(directory, "playwright.config.ts")], { cwd: directory, timeout: 60000, maxBuffer: 4 * 1024 * 1024 });
      const report = JSON.parse(stdout);
      expect(report.stats.expected).toBe(1);
      expect(report.stats.unexpected).toBe(0);
      expect(report.stats.skipped).toBe(0);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
}
