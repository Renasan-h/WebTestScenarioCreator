import type { Scenario } from "../../schema/src/scenario";
import { toRecordedNode, type RecordedAction } from "./record";

/** Append a captured action to the existing linear flow, immediately before its end node. */
export function appendRecordedAction(s: Scenario, action: RecordedAction): Scenario {
  const start = s.nodes.find(n => n.type === "start");
  const end = s.nodes.find(n => n.type === "end");
  if (!start || !end) throw new Error("Recording requires a start and an end node");
  const incomingEnd = s.edges.find(e => e.target === end.id);
  const outgoingStart = s.edges.find(e => e.source === start.id);
  if (s.edges.length && !incomingEnd) throw new Error("Cannot append to a graph without a connected end node");
  if (!incomingEnd && outgoingStart) throw new Error("Start already has an outgoing edge");
  const predecessor = incomingEnd?.source ?? start.id;
  const node = toRecordedNode(action, s.nodes.length);
  node.position = { x: 200, y: 140 + (s.nodes.length - 2) * 110 };
  const edges = s.edges.filter(e => e.id !== incomingEnd?.id);
  return {
    ...s,
    nodes: [...s.nodes, node],
    edges: [
      ...edges,
      { id: crypto.randomUUID(), source: predecessor, target: node.id },
      { id: crypto.randomUUID(), source: node.id, target: end.id },
    ],
  };
}
