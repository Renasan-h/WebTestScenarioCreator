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
    case "start": case "end": return null;
    case "navigate": return `await page.goto(${JSON.stringify(n.config.url)});`;
    case "click": return `await ${loc(n.config.locator)}.click();`;
    case "fill": return `await ${loc(n.config.locator)}.fill(${JSON.stringify(n.config.value)});`;
    case "assertVisible": return `await ${loc(n.config.locator)}.waitFor({ state: "visible" });`;
    case "wait": return `await page.waitForTimeout(${n.config.durationMs});`;
  }
}
export function exportPlaywrightTest(s: Scenario): string {
  const errors = validateGraph(s);
  if (errors.length) throw new Error(errors.join("; "));
  const byId = new Map(s.nodes.map(n => [n.id, n]));
  const next = new Map(s.edges.map(e => [e.source, e.target]));
  let id: string | undefined = s.nodes.find(n => n.type === "start")!.id;
  const statements: string[] = [];
  while (id) {
    const node = byId.get(id)!;
    const line = statement(node);
    if (line) statements.push("  " + line);
    id = next.get(id);
  }
  const browser = s.settings.browser === "edge" ? "  // Edge: configure channel: 'msedge' in playwright.config.ts\n" : "";
  return `import { test } from "@playwright/test";\n\ntest(${JSON.stringify(s.metadata.name)}, async ({ page }) => {\n${browser}${statements.join("\n")}\n});\n`;
}
