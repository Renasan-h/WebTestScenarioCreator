import { test, expect } from "@playwright/test";
import { attachRecorder, type RecordedAction } from "../../packages/playwright-adapter/src/record";

test("records real browser click and input while excluding passwords", async ({ page }) => {
  await page.goto("about:blank");
  await page.setContent('<input id="name"><input id="secret" type="password"><input id="card" autocomplete="cc-number"><button id="submit">Submit</button>');
  const actions: RecordedAction[] = [];
  const detach = await attachRecorder(page, action => actions.push(action));
  await page.locator("#name").fill("Alice");
  await page.locator("#name").dispatchEvent("change");
  await page.locator("#secret").fill("private");
  await page.locator("#secret").dispatchEvent("change");
  await page.locator("#card").fill("4111111111111111");
  await page.locator("#card").dispatchEvent("change");
  await page.locator("#submit").click();
  await expect.poll(() => actions.length).toBeGreaterThanOrEqual(2);
  expect(actions).toContainEqual({ type: "fill", selector: "#name", value: "Alice" });
  expect(actions).toContainEqual({ type: "click", selector: "#submit" });
  expect(actions.some(a => a.type === "fill" && a.selector === "#secret")).toBe(false);
  expect(actions.some(a => a.type === "fill" && a.selector === "#card")).toBe(false);
  await detach();
});
