import { describe, expect, it } from "vitest";
import { scenarioSchema, type Scenario } from "../packages/schema/src/scenario";
import { exportPlaywrightTest } from "../packages/engine/src/export";
const scenario: Scenario = {
  schemaVersion: "1.0",
  metadata: { id: "text", name: "text", createdAt: "", updatedAt: "" },
  settings: { browser: "chromium", headless: true, timeoutMs: 1000, viewport: { width: 800, height: 600 } },
  variables: {},
  nodes: [
    { id: "start", type: "start", label: "start", position: { x: 0, y: 0 }, config: {} },
    { id: "assert", type: "assertText", label: "assert", position: { x: 0, y: 0 }, config: { locator: { strategy: "css", value: "h1" }, expected: 'hello "world"' } },
    { id: "end", type: "end", label: "end", position: { x: 0, y: 0 }, config: {} },
  ],
  edges: [{ id: "a", source: "start", target: "assert" }, { id: "b", source: "assert", target: "end" }],
};
describe("text assertion", () => {
  it("validates assertion nodes", () => expect(scenarioSchema.parse(scenario).nodes[1].type).toBe("assertText"));
  it("generates escaped text assertion", () => {
    const output = exportPlaywrightTest(scenario);
    expect(output).toContain('page.locator("h1").innerText()');
    expect(output).toContain(JSON.stringify('hello "world"'));
  });
  it("rejects missing locator", () => expect(() => scenarioSchema.parse({ ...scenario, nodes: scenario.nodes.map(n => n.type === "assertText" ? { ...n, config: { expected: "hi" } } : n) })).toThrow());
});
