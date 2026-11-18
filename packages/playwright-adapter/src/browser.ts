import { chromium, type Browser, type Page } from "playwright";
import type { Scenario, ScenarioNode, LocatorSpec } from "../../schema/src/scenario";

function locator(page: Page, l: LocatorSpec) {
  switch (l.strategy) {
    case "css": return page.locator(l.value);
    case "testId": return page.getByTestId(l.value);
    case "text": return page.getByText(l.value);
    case "role": return page.getByRole(l.role as Parameters<Page["getByRole"]>[0], { name: l.name });
  }
}
export async function openBrowser(s: Scenario): Promise<{ browser: Browser; page: Page }> {
  const browser = await chromium.launch(s.settings.browser === "edge"
    ? { channel: "msedge", headless: s.settings.headless }
    : { headless: s.settings.headless, executablePath: process.env.SCENARIO_CHROMIUM_PATH || undefined });
  const context = await browser.newContext({ viewport: s.settings.viewport });
  const page = await context.newPage();
  page.setDefaultTimeout(s.settings.timeoutMs);
  return { browser, page };
}
export async function runAction(page: Page, node: ScenarioNode): Promise<void> {
  switch (node.type) {
    case "start": case "end": return;
    case "navigate": await page.goto(node.config.url); return;
    case "click": await locator(page, node.config.locator).click({ timeout: node.config.timeoutMs }); return;
    case "fill": await locator(page, node.config.locator).fill(node.config.value, { timeout: node.config.timeoutMs }); return;
    case "assertVisible": await locator(page, node.config.locator).waitFor({ state: "visible" }); return;
    case "wait": await page.waitForTimeout(node.config.durationMs); return;
  }
}
