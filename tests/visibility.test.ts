import { describe, expect, it } from "vitest";
import { scenarioSchema, type Scenario } from "../packages/schema/src/scenario";
import { exportPlaywrightTest } from "../packages/engine/src/export";

const s: Scenario = {
  schemaVersion: "1.0",
  metadata: { id: "visible", name: "visible", createdAt: "", updatedAt: "" },
  settings: { browser: "chromium", headless: true, timeoutMs: 1000, viewport: { width: 800, height: 600 } },
  variables: {},
  nodes: [
    { id: "a", label: "start", type: "start", position: { x: 0, y: 0 }, config: {} },
    { id: "b", label: "visible", type: "assertVisible", position: { x: 0, y: 0 }, config: { locator: { strategy: "testId", value: "ready" } } },
    { id: "c", label: "end", type: "end", position: { x: 0, y: 0 }, config: {} },
  ],
  edges: [{ id: "ab", source: "a", target: "b" }, { id: "bc", source: "b", target: "c" }],
};
describe("visibility assertion", () => {
  it("parses the new node", () => expect(scenarioSchema.parse(s).nodes[1].type).toBe("assertVisible"));
  it("exports waitFor visible assertion", () => expect(exportPlaywrightTest(s)).toContain('page.getByTestId("ready").waitFor({ state: "visible" })'));
  it("rejects empty locator", () => expect(() => scenarioSchema.parse({ ...s, nodes: s.nodes.map(n => n.type === "assertVisible" ? { ...n, config: { locator: { strategy: "css", value: "" } } } : n) })).toThrow());
});
