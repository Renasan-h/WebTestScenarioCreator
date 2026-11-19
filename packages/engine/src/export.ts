import type { Scenario, ScenarioNode, LocatorSpec } from "../../schema/src/scenario";
import { validateGraph } from "../../schema/src/scenario";

function loc(l: LocatorSpec): string {
  switch (l.strategy) {
    case "css": return `page.locator(${JSON.stringify(l.value)})`;
    case "testId": return `page.getByTestId(${JSON.stringify(l.value)})`;
    case "text": return `page.getByText(${JSON.stringify(l.value)})`;
    case "role": return `page.getByRole(${JSON.stringify(l.role)}, { name: ${l.name === undefined ? "undefined" : JSON.stringify(l.name)} })`;
  }
}
function statement(n: ScenarioNode): string | null {
  switch (n.type) {
    case "start": case "end": case "condition": return null;
    case "navigate": return `await page.goto(${JSON.stringify(n.config.url)});`;
    case "click": return `await ${loc(n.config.locator)}.click();`;
    case "fill": return `await ${loc(n.config.locator)}.fill(${JSON.stringify(n.config.value)});`;
    case "assertText": return `if (!(await ${loc(n.config.locator)}.innerText()).includes(${JSON.stringify(n.config.expected)})) throw new Error("Text assertion failed");`;
    case "assertVisible": return `await ${loc(n.config.locator)}.waitFor({ state: "visible" });`;
    case "wait": return `await page.waitForTimeout(${n.config.durationMs});`;
  }
}
export function exportPlaywrightTest(s: Scenario): string {
  const errors = validateGraph(s);
  if (errors.length) throw new Error(errors.join("; "));
  const byId = new Map(s.nodes.map(n => [n.id, n]));
  const statements: string[] = [];
  function render(id: string, indent: string, visited: Set<string>) {
    if (visited.has(id)) return;
    const nextVisited = new Set(visited);
    nextVisited.add(id);
    const node = byId.get(id)!;
    const line = statement(node);
    if (line) statements.push(indent + line);
    if (node.screenshot) {
      const safeId = node.id.replace(/[^a-zA-Z0-9_-]/g, "_");
      statements.push(indent + `await page.screenshot({ path: ${JSON.stringify("screenshots/" + safeId + ".png")}, fullPage: true });`);
    }
    if (node.type === "condition") {
      const target = loc(node.config.locator);
      const expression = node.config.check === "visible"
        ? `await ${target}.isVisible()`
        : `(await ${target}.textContent())?.includes(${JSON.stringify(node.config.expected ?? "")}) ?? false`;
      statements.push(indent + `if (${expression}) {`);
      const yes = s.edges.find(e => e.source === id && e.sourceHandle === "true")!;
      const no = s.edges.find(e => e.source === id && e.sourceHandle === "false")!;
      render(yes.target, indent + "  ", nextVisited);
      statements.push(indent + "} else {");
      render(no.target, indent + "  ", nextVisited);
      statements.push(indent + "}");
    } else {
      const edge = s.edges.find(e => e.source === id);
      if (edge) render(edge.target, indent, nextVisited);
    }
  }
  render(s.nodes.find(n => n.type === "start")!.id, "  ", new Set());
  if (s.nodes.some(n => n.screenshot)) {
    statements.unshift('  await import("node:fs/promises").then(fs => fs.mkdir("screenshots", { recursive: true }));');
  }
  const browser = s.settings.browser === "edge" ? "  // Edge: configure channel: 'msedge' in playwright.config.ts\n" : "";
  return `import { test } from "@playwright/test";\n\ntest(${JSON.stringify(s.metadata.name)}, async ({ page }) => {\n${browser}${statements.join("\n")}\n});\n`;
}
