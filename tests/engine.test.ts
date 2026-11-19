import { describe, expect, it } from "vitest";
import { executeScenario } from "../packages/engine/src/execute";
import type { Scenario } from "../packages/schema/src/scenario";

const s: Scenario = {
  schemaVersion: "1.0",
  metadata: { id: "test", name: "test", createdAt: "", updatedAt: "" },
  settings: { browser: "edge", headless: true, timeoutMs: 1000, viewport: { width: 800, height: 600 } },
  variables: {},
  nodes: [
    { id: "end", type: "end", label: "end", position: { x: 0, y: 0 }, config: {} },
    { id: "start", type: "start", label: "start", position: { x: 0, y: 0 }, config: {} },
    { id: "wait", type: "wait", label: "wait", position: { x: 0, y: 0 }, config: { durationMs: 1 } },
  ],
  edges: [{ id: "a", source: "start", target: "wait" }, { id: "b", source: "wait", target: "end" }],
};
describe("engine", () => {
  it("executes edge order rather than array order", async () => {
    const visited: string[] = [];
    const events: string[] = [];
    await executeScenario(s, async n => { visited.push(n.id); }, e => events.push(e.type), "run1");
    expect(visited).toEqual(["start", "wait", "end"]);
    expect(events.at(-1)).toBe("run.finished");
  });
  it("emits failure and rejects", async () => {
    const events: string[] = [];
    await expect(executeScenario(s, async n => { if (n.id === "wait") throw Error("failed"); }, e => events.push(e.type))).rejects.toThrow("failed");
    expect(events).toContain("node.failed");
    expect(events.at(-1)).toBe("run.finished");
  });
});

describe("condition execution", () => {
  const branch: Scenario = {
    ...s,
    nodes: [
      ...s.nodes,
      { id: "condition", type: "condition", label: "condition", position: { x: 0, y: 0 }, config: { check: "visible", locator: { strategy: "css", value: "#ready" } }, screenshot: true },
      { id: "other", type: "wait", label: "other", position: { x: 0, y: 0 }, config: { durationMs: 1 } },
    ],
    edges: [
      { id: "a", source: "start", target: "condition" },
      { id: "yes", source: "condition", target: "wait", sourceHandle: "true" },
      { id: "no", source: "condition", target: "other", sourceHandle: "false" },
      { id: "b", source: "wait", target: "end" },
      { id: "c", source: "other", target: "end" },
    ],
  };
  for (const answer of [true, false]) {
    it(`follows the ${answer ? "true" : "false"} branch`, async () => {
      const visited: string[] = [];
      await executeScenario(branch, async n => {
        visited.push(n.id);
        if (n.type === "condition") return answer;
      }, () => {});
      expect(visited).toEqual(["start", "condition", answer ? "wait" : "other", "end"]);
    });
  }
});

describe("step debugger", () => {
  it("waits before each node until the debug gate is released", async () => {
    const visited: string[] = [];
    const pending: Array<() => void> = [];
    const events: string[] = [];
    const execution = executeScenario(s, async n => { visited.push(n.id); }, e => events.push(e.type), "debug", async (_node, notifyPaused) => {
      notifyPaused();
      await new Promise<void>(resolve => { pending.push(resolve); });
    });
    await Promise.resolve();
    expect(visited).toEqual([]);
    expect(events).toContain("node.paused");
    for (const id of ["start", "wait", "end"]) {
      pending.shift()?.();
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(visited).toContain(id);
    }
    await execution;
    expect(visited).toEqual(["start", "wait", "end"]);
    expect(events.at(-1)).toBe("run.finished");
  });
});
