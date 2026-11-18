import { z } from "zod";

export const locatorSchema = z.discriminatedUnion("strategy", [
  z.object({ strategy: z.literal("css"), value: z.string().min(1) }),
  z.object({ strategy: z.literal("testId"), value: z.string().min(1) }),
  z.object({ strategy: z.literal("text"), value: z.string().min(1) }),
  z.object({ strategy: z.literal("role"), role: z.string().min(1), name: z.string().optional() }),
]);

const base = { id: z.string().min(1), label: z.string(), position: z.object({ x: z.number(), y: z.number() }) };
const node = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("start"), config: z.object({}) }),
  z.object({ ...base, type: z.literal("end"), config: z.object({}) }),
  z.object({ ...base, type: z.literal("navigate"), config: z.object({ url: z.string().url() }) }),
  z.object({ ...base, type: z.literal("click"), config: z.object({ locator: locatorSchema, timeoutMs: z.number().positive().optional() }) }),
  z.object({ ...base, type: z.literal("fill"), config: z.object({ locator: locatorSchema, value: z.string(), timeoutMs: z.number().positive().optional() }) }),
  z.object({ ...base, type: z.literal("assertVisible"), config: z.object({ locator: locatorSchema }) }),
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
  for (const e of s.edges) if (!ids.has(e.source) || !ids.has(e.target)) errors.push("Dangling edge: " + e.id);
  const outgoing = new Map<string, string[]>();
  for (const e of s.edges) outgoing.set(e.source, [...(outgoing.get(e.source) ?? []), e.target]);
  for (const n of s.nodes) {
    const count = outgoing.get(n.id)?.length ?? 0;
    if (n.type === "end" && count) errors.push("End node has outgoing edge");
    if (n.type !== "end" && count !== 1) errors.push("Node must have exactly one outgoing edge: " + n.id);
    if (n.type === "start" && s.edges.some(e => e.target === n.id)) errors.push("Start node has incoming edge");
  }
  if (starts.length === 1) {
    const seen = new Set<string>();
    let current: string | undefined = starts[0].id;
    while (current) {
      if (seen.has(current)) { errors.push("Cycle detected"); break; }
      seen.add(current);
      current = outgoing.get(current)?.[0];
    }
    for (const n of s.nodes) if (!seen.has(n.id)) errors.push("Unreachable node: " + n.id);
    if (!s.nodes.some(n => n.type === "end" && seen.has(n.id))) errors.push("Reachable end node required");
  }
  return errors;
}
