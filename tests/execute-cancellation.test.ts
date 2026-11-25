import { describe, expect, it, vi } from "vitest";
import { executeScenario, type ExecutionEvent } from "../packages/engine/src/execute";
import type { Scenario } from "../packages/schema/src/scenario";

const scenario: Scenario = {
  schemaVersion: "1.0",
  metadata: { id: "cancel", name: "cancel", createdAt: "", updatedAt: "" },
  settings: { browser: "chromium", headless: true, timeoutMs: 1000, viewport: { width: 800, height: 600 } },
  variables: {},
  nodes: [
    { id: "start", type: "start", label: "Start", position: { x: 0, y: 0 }, config: {} },
    { id: "wait", type: "wait", label: "Wait", position: { x: 0, y: 100 }, config: { durationMs: 10 } },
    { id: "end", type: "end", label: "End", position: { x: 0, y: 200 }, config: {} },
  ],
  edges: [{ id: "a", source: "start", target: "wait" }, { id: "b", source: "wait", target: "end" }],
};

describe("executeScenario cancellation", () => {
  it.each(["before", "paused", "action", "rejected"] as const)("stops at %s without running later nodes", async mode => {
    const controller = new AbortController();
    const events: ExecutionEvent[] = [];
    const action = vi.fn(async () => {
      controller.abort();
      if (mode === "rejected") throw new Error("browser closed");
    });
    if (mode === "before") controller.abort();
    await executeScenario(scenario, action, e => events.push(e), "test",
      mode === "paused" ? async (_node, notify) => { notify(); controller.abort(); } : undefined,
      controller.signal);
    expect(action).toHaveBeenCalledTimes(mode === "action" || mode === "rejected" ? 1 : 0);
    expect(events.filter(e => e.type === "run.finished")).toEqual([{ type: "run.finished", runId: "test", status: "failed" }]);
    expect(events.filter(e => e.type === "node.completed" || e.type === "node.failed")).toEqual([]);
    expect(events.filter(e => e.type === "node.started").map(e => e.nodeId)).toEqual(mode === "action" || mode === "rejected" ? ["start"] : []);
  });

  it("completes normally without cancellation", async () => {
    const events: ExecutionEvent[] = [];
    const action = vi.fn(async () => {});
    await executeScenario(scenario, action, e => events.push(e), "test");
    expect(action).toHaveBeenCalledTimes(3);
    expect(events.at(-1)).toEqual({ type: "run.finished", runId: "test", status: "completed" });
  });
});
