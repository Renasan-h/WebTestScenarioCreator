import { describe, expect, it } from "vitest";
import { scenarioSchema, validateGraph, type Scenario } from "../packages/schema/src/scenario";

const base: Scenario = {
  schemaVersion: "1.0",
  metadata: { id: "test", name: "test", createdAt: "2026-01-01", updatedAt: "2026-01-01" },
  settings: { browser: "edge", headless: true, timeoutMs: 10000, viewport: { width: 1280, height: 720 } },
  variables: {},
  nodes: [
    { id: "start", label: "start", type: "start", position: { x: 0, y: 0 }, config: {} },
    { id: "end", label: "end", type: "end", position: { x: 0, y: 100 }, config: {} },
  ],
  edges: [{ id: "e", source: "start", target: "end" }],
};
describe("scenario validation", () => {
  it("parses valid scenario", () => expect(scenarioSchema.parse(base).metadata.id).toBe("test"));
  it("rejects unsupported browser", () => expect(() => scenarioSchema.parse({ ...base, settings: { ...base.settings, browser: "firefox" } })).toThrow());
  it("accepts linear flow", () => expect(validateGraph(base)).toEqual([]));
  it("detects cycles", () => expect(validateGraph({ ...base, edges: [...base.edges, { id: "cycle", source: "end", target: "start" }] })).toContain("End node has outgoing edge"));
  it("detects unreachable nodes", () => expect(validateGraph({ ...base, nodes: [...base.nodes, { id: "orphan", label: "orphan", type: "wait", position: { x: 0, y: 200 }, config: { durationMs: 10 } }] })).toContain("Unreachable node: orphan"));
});
