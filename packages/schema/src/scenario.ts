import { z } from "zod";

export const locatorSchema = z.discriminatedUnion("strategy", [
  z.object({ strategy: z.literal("css"), value: z.string().min(1) }),
  z.object({ strategy: z.literal("testId"), value: z.string().min(1) }),
  z.object({ strategy: z.literal("text"), value: z.string().min(1) }),
  z.object({ strategy: z.literal("role"), role: z.string().min(1), name: z.string().optional() }),
]);

const base = { screenshot: z.boolean().optional(), id: z.string().min(1), label: z.string(), position: z.object({ x: z.number(), y: z.number() }) };
const node = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("start"), config: z.object({}) }),
  z.object({ ...base, type: z.literal("end"), config: z.object({}) }),
  z.object({ ...base, type: z.literal("navigate"), config: z.object({ url: z.string().url() }) }),
  z.object({ ...base, type: z.literal("click"), config: z.object({ locator: locatorSchema, timeoutMs: z.number().positive().optional() }) }),
  z.object({ ...base, type: z.literal("fill"), config: z.object({ locator: locatorSchema, value: z.string(), timeoutMs: z.number().positive().optional() }) }),
  z.object({ ...base, type: z.literal("assertText"), config: z.object({ locator: locatorSchema, expected: z.string() }) }),
  z.object({ ...base, type: z.literal("assertVisible"), config: z.object({ locator: locatorSchema }) }),
  z.object({ ...base, type: z.literal("condition"), config: z.object({ locator: locatorSchema, check: z.enum(["visible", "textContains"]), expected: z.string().optional() }) }),
  z.object({ ...base, type: z.literal("wait"), config: z.object({ durationMs: z.number().int().nonnegative() }) }),
]);

export const scenarioSchema = z.object({
  schemaVersion: z.literal("1.0"),
  metadata: z.object({ id: z.string().min(1), name: z.string().min(1), description: z.string().optional(), createdAt: z.string(), updatedAt: z.string() }),
  settings: z.object({ browser: z.enum(["chromium", "edge"]), headless: z.boolean(), timeoutMs: z.number().positive(), viewport: z.object({ width: z.number().positive(), height: z.number().positive() }) }),
  variables: z.record(z.string(), z.string()),
  nodes: z.array(node),
  edges: z.array(z.object({ id: z.string(), source: z.string(), target: z.string(), sourceHandle: z.string().optional(), targetHandle: z.string().optional() })),
});
export type Scenario = z.infer<typeof scenarioSchema>;
export type ScenarioNode = Scenario["nodes"][number];
export type ScenarioEdge = Scenario["edges"][number];
export type LocatorSpec = z.infer<typeof locatorSchema>;

export function validateGraph(s: Scenario): string[] {
  const errors: string[] = [];
  const ids = new Set(s.nodes.map(n => n.id));
  if (ids.size !== s.nodes.length) errors.push("Duplicate node IDs");
  const starts = s.nodes.filter(n => n.type === "start");
  if (starts.length !== 1) errors.push("Exactly one start node required");
  const outgoing = new Map<string, ScenarioEdge[]>();
  for (const e of s.edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) errors.push("Dangling edge: " + e.id);
    outgoing.set(e.source, [...(outgoing.get(e.source) ?? []), e]);
  }
  for (const n of s.nodes) {
    const edges = outgoing.get(n.id) ?? [];
    if (n.type === "end" && edges.length) errors.push("End node has outgoing edge");
    if (n.type === "condition") {
      if (edges.length !== 2 || new Set(edges.map(e => e.sourceHandle)).size !== 2 ||
          !edges.some(e => e.sourceHandle === "true") || !edges.some(e => e.sourceHandle === "false"))
        errors.push("Condition requires true and false outgoing edges: " + n.id);
      if (n.config.check === "textContains" && !n.config.expected)
        errors.push("Condition text must not be empty: " + n.id);
    } else if (n.type !== "end" && edges.length !== 1) errors.push("Node must have exactly one outgoing edge: " + n.id);
    if (n.type === "start" && s.edges.some(e => e.target === n.id)) errors.push("Start node has incoming edge");
  }
  if (starts.length === 1) {
    const visited = new Set<string>();
    const active = new Set<string>();
    let hasEnd = false;
    function walk(id: string) {
      if (active.has(id)) { errors.push("Cycle detected"); return; }
      if (visited.has(id)) return;
      visited.add(id);
      active.add(id);
      if (s.nodes.find(n => n.id === id)?.type === "end") hasEnd = true;
      for (const e of outgoing.get(id) ?? []) if (ids.has(e.target)) walk(e.target);
      active.delete(id);
    }
    walk(starts[0].id);
    for (const n of s.nodes) if (!visited.has(n.id)) errors.push("Unreachable node: " + n.id);
    if (!hasEnd) errors.push("Reachable end node required");
  }
  return errors;
}
