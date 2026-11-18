import { describe, expect, it } from "vitest";
import { appendRecordedAction } from "../packages/playwright-adapter/src/record-graph";
import { validateGraph, type Scenario } from "../packages/schema/src/scenario";

const base: Scenario = {
  schemaVersion: "1.0",
  metadata: { id: "record", name: "record", createdAt: "", updatedAt: "" },
  settings: { browser: "chromium", headless: false, timeoutMs: 5000, viewport: { width: 800, height: 600 } },
  variables: {},
  nodes: [
    { id: "start", type: "start", label: "start", position: { x: 0, y: 0 }, config: {} },
    { id: "end", type: "end", label: "end", position: { x: 0, y: 100 }, config: {} },
  ],
  edges: [],
};
describe("recording graph", () => {
  it("connects a first action between start and end", () => {
    const result = appendRecordedAction(base, { type: "navigate", url: "https://example.com" });
    expect(result.nodes).toHaveLength(3);
    expect(validateGraph(result)).toEqual([]);
    expect(result.edges.some(e => e.source === "start" && e.target === result.nodes[2].id)).toBe(true);
  });
  it("appends multiple actions in the order recorded", () => {
    const first = appendRecordedAction(base, { type: "navigate", url: "https://example.com" });
    const second = appendRecordedAction(first, { type: "click", selector: "#submit" });
    const third = appendRecordedAction(second, { type: "fill", selector: "#name", value: "Alice" });
    expect(validateGraph(third)).toEqual([]);
    const order = [third.nodes[2].id, third.nodes[3].id, third.nodes[4].id];
    for (let i = 0; i < order.length - 1; i++) {
      expect(third.edges.some(e => e.source === order[i] && e.target === order[i + 1])).toBe(true);
    }
    expect(third.edges.some(e => e.source === order[2] && e.target === "end")).toBe(true);
  });
  it("preserves a pre-existing chain", () => {
    const initial = appendRecordedAction(base, { type: "navigate", url: "https://example.org" });
    const next = appendRecordedAction(initial, { type: "click", selector: "button" });
    expect(validateGraph(next)).toEqual([]);
    expect(next.edges.some(e => e.source === initial.nodes[2].id && e.target === next.nodes[3].id)).toBe(true);
  });
});
