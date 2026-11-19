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

describe("branching and screenshots", () => {
  const branching: Scenario = {
    ...base,
    nodes: [
      base.nodes[0],
      { id: "condition", type: "condition", label: "条件", position: { x: 0, y: 50 }, config: { locator: { strategy: "css", value: "#ready" }, check: "visible" }, screenshot: true },
      { id: "yes", type: "wait", label: "yes", position: { x: 0, y: 100 }, config: { durationMs: 1 } },
      { id: "no", type: "wait", label: "no", position: { x: 100, y: 100 }, config: { durationMs: 1 } },
      base.nodes[1],
    ],
    edges: [
      { id: "a", source: "start", target: "condition" },
      { id: "b", source: "condition", target: "yes", sourceHandle: "true" },
      { id: "c", source: "condition", target: "no", sourceHandle: "false" },
      { id: "d", source: "yes", target: "end" },
      { id: "e", source: "no", target: "end" },
    ],
  };
  it("accepts both branches and screenshot flags", () => {
    expect(scenarioSchema.parse(branching).nodes[1].screenshot).toBe(true);
    expect(validateGraph(branching)).toEqual([]);
  });
  it("rejects missing false branch", () => {
    expect(validateGraph({ ...branching, edges: branching.edges.filter(e => e.id !== "c") })).toContain("Condition requires true and false outgoing edges: condition");
  });
  it("rejects branch cycles", () => {
    const edges = branching.edges.map(e => e.id === "d" ? { ...e, target: "condition" } : e);
    expect(validateGraph({ ...branching, edges })).toContain("Cycle detected");
  });
});
