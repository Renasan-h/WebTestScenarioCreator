import { describe, expect, it } from "vitest";
import { exportPlaywrightTest } from "../packages/engine/src/export";
import type { Scenario } from "../packages/schema/src/scenario";

const scenario: Scenario = {
  schemaVersion: "1.0",
  metadata: { id: "export", name: "example", createdAt: "", updatedAt: "" },
  settings: { browser: "chromium", headless: true, timeoutMs: 5000, viewport: { width: 800, height: 600 } },
  variables: {},
  nodes: [
    { id: "start", type: "start", label: "start", position: { x: 0, y: 0 }, config: {} },
    { id: "navigate", type: "navigate", label: "go", position: { x: 0, y: 0 }, config: { url: "https://example.com" } },
    { id: "fill", type: "fill", label: "fill", position: { x: 0, y: 0 }, config: { locator: { strategy: "testId", value: "username" }, value: "a\"b" } },
    { id: "end", type: "end", label: "end", position: { x: 0, y: 0 }, config: {} },
  ],
  edges: [
    { id: "e1", source: "start", target: "navigate" },
    { id: "e2", source: "navigate", target: "fill" },
    { id: "e3", source: "fill", target: "end" },
  ],
};
describe("Playwright export", () => {
  it("generates ordered executable statements and safely escapes input", () => {
    const output = exportPlaywrightTest(scenario);
    expect(output).toContain('page.goto("https://example.com")');
    expect(output).toContain('page.getByTestId("username").fill("a\\\"b")');
    expect(output.indexOf("page.goto")).toBeLessThan(output.indexOf("page.getByTestId"));
  });
  it("rejects invalid graph", () => {
    expect(() => exportPlaywrightTest({ ...scenario, edges: [] })).toThrow();
  });
});

describe("conditional Playwright export", () => {
  const branched: Scenario = {
    ...scenario,
    nodes: [
      scenario.nodes[0],
      { id: "condition", type: "condition", label: "Check", position: { x: 0, y: 0 }, config: { check: "visible", locator: { strategy: "css", value: "#ready" } }, screenshot: true },
      { id: "yes", type: "wait", label: "Yes", position: { x: 0, y: 0 }, config: { durationMs: 10 } },
      { id: "no", type: "wait", label: "No", position: { x: 0, y: 0 }, config: { durationMs: 20 } },
      scenario.nodes[3],
    ],
    edges: [
      { id: "a", source: "start", target: "condition" },
      { id: "b", source: "condition", target: "yes", sourceHandle: "true" },
      { id: "c", source: "condition", target: "no", sourceHandle: "false" },
      { id: "d", source: "yes", target: "end" },
      { id: "e", source: "no", target: "end" },
    ],
  };
  it("exports both branches and screenshot capture", () => {
    const output = exportPlaywrightTest(branched);
    expect(output).toContain('if (await page.locator("#ready").isVisible()) {');
    expect(output).toContain('page.waitForTimeout(10)');
    expect(output).toContain('} else {');
    expect(output).toContain('page.waitForTimeout(20)');
    expect(output).toContain('page.screenshot({ path: "screenshots/condition.png", fullPage: true })');
    expect(output).toContain('fs.mkdir("screenshots", { recursive: true })');
  });
});
