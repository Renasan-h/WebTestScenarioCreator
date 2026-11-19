import type { Scenario, ScenarioNode } from "../../schema/src/scenario";
import { validateGraph } from "../../schema/src/scenario";

export type ExecutionEvent =
  | { type: "run.started"; runId: string }
  | { type: "node.paused"; runId: string; nodeId: string }
  | { type: "node.started"; runId: string; nodeId: string }
  | { type: "node.completed"; runId: string; nodeId: string; durationMs: number }
  | { type: "node.failed"; runId: string; nodeId: string; message: string }
  | { type: "run.finished"; runId: string; status: "completed" | "failed" };
export type ExecuteAction = (node: ScenarioNode) => Promise<boolean | void>;

export async function executeScenario(s: Scenario, action: ExecuteAction, emit: (e: ExecutionEvent) => void, runId = crypto.randomUUID(), beforeNode?: (node: ScenarioNode, notifyPaused: () => void) => Promise<void>): Promise<void> {
  const problems = validateGraph(s);
  if (problems.length) throw new Error(problems.join("; "));
  const nodes = new Map(s.nodes.map(n => [n.id, n]));
  const next = new Map(s.edges.filter(e => e.sourceHandle !== "true" && e.sourceHandle !== "false").map(e => [e.source, e.target]));
  let id: string | undefined = s.nodes.find(n => n.type === "start")!.id;
  emit({ type: "run.started", runId });
  while (id) {
    const node = nodes.get(id)!;
    if (beforeNode) {
      await beforeNode(node, () => emit({ type: "node.paused", runId, nodeId: id }));
    }
    const started = Date.now();
    emit({ type: "node.started", runId, nodeId: id });
    try {
      const result = await action(node);
      if (node.type === "condition") {
        const branch = result === true ? "true" : "false";
        const edge = s.edges.find(e => e.source === node.id && e.sourceHandle === branch);
        if (!edge) throw new Error("Missing condition branch: " + branch);
        next.set(node.id, edge.target);
      }
      emit({ type: "node.completed", runId, nodeId: id, durationMs: Date.now() - started });
    } catch (error) {
      emit({ type: "node.failed", runId, nodeId: id, message: String(error) });
      emit({ type: "run.finished", runId, status: "failed" });
      throw error;
    }
    id = next.get(id);
  }
  emit({ type: "run.finished", runId, status: "completed" });
}
