import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
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
  try {
    const context = await browser.newContext({ viewport: s.settings.viewport });
    const page = await context.newPage();
    page.setDefaultTimeout(s.settings.timeoutMs);
    return { browser, page };
  } catch (error) {
    try {
      await browser.close();
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "Browser initialization and cleanup failed");
    }
    throw error;
  }
}
export async function runAction(page: Page, node: ScenarioNode): Promise<boolean | void> {
  let conditionResult: boolean | undefined;
  switch (node.type) {
    case "start": case "end": break;
    case "navigate": await page.goto(node.config.url); break;
    case "click": await locator(page, node.config.locator).click({ timeout: node.config.timeoutMs }); break;
    case "fill": await locator(page, node.config.locator).fill(node.config.value, { timeout: node.config.timeoutMs }); break;
    case "assertText": {
      const actual = await locator(page, node.config.locator).innerText();
      if (!actual.includes(node.config.expected)) throw new Error(`Expected text ${JSON.stringify(node.config.expected)} in ${JSON.stringify(actual)}`);
      break;
    }
    case "assertVisible": await locator(page, node.config.locator).waitFor({ state: "visible" }); break;
    case "wait": await page.waitForTimeout(node.config.durationMs); break;
    case "condition": {
      const target = locator(page, node.config.locator);
      conditionResult = node.config.check === "visible"
        ? await target.isVisible()
        : (await target.textContent().catch(() => null))?.includes(node.config.expected ?? "") ?? false;
      break;
    }
  }
  if (node.screenshot) {
    const directory = resolve("screenshots");
    await mkdir(directory, { recursive: true });
    const safeId = node.id.replace(/[^a-zA-Z0-9_-]/g, "_");
    await page.screenshot({ path: resolve(directory, `${Date.now()}-${safeId}.png`), fullPage: true });
  }
  return conditionResult;
}
