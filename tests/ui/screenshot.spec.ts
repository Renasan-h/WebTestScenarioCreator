import { test, expect } from "@playwright/test";
import { readdir, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { runAction } from "../../packages/playwright-adapter/src/browser";

test("captures a PNG after an action and evaluates both condition outcomes", async ({ page }) => {
  await page.setContent('<main><h1 id="ready">Ready</h1><p id="missing" hidden>Hidden</p></main>');
  const directory = resolve("screenshots");
  const before = new Set(await readdir(directory).catch(() => []));
  const nodeId = "screenshot-e2e";
  try {
    await runAction(page, {
      id: nodeId, type: "assertVisible", label: "Visible", position: { x: 0, y: 0 },
      config: { locator: { strategy: "css", value: "#ready" } }, screenshot: true,
    });
    const created = (await readdir(directory)).filter(name => !before.has(name) && name.endsWith("-" + nodeId + ".png"));
    expect(created).toHaveLength(1);
    const bytes = await readFile(resolve(directory, created[0]));
    expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    const condition = {
      id: "branch", type: "condition" as const, label: "Branch", position: { x: 0, y: 0 },
      config: { check: "visible" as const, locator: { strategy: "css" as const, value: "#ready" } },
    };
    expect(await runAction(page, condition)).toBe(true);
    expect(await runAction(page, { ...condition, config: { ...condition.config, locator: { strategy: "css" as const, value: "#absent" } } })).toBe(false);
  } finally {
    for (const name of (await readdir(directory).catch(() => [])).filter(name => !before.has(name) && name.endsWith("-" + nodeId + ".png"))) {
      await rm(resolve(directory, name), { force: true });
    }
  }
});
