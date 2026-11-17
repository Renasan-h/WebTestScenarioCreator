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
