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
