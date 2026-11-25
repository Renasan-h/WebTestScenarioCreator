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
}
