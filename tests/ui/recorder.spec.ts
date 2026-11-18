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

test("records navigation after a click and can replay captured actions", async ({ page, browser }) => {
  await page.route("https://recording.example/**", async route => {
    const url = new URL(route.request().url());
    await route.fulfill({ status: 200, contentType: "text/html", body: url.pathname === "/next"
      ? '<h1 id="result">Done</h1>'
      : '<a id="next" href="/next">Next</a>' });
  });
  await page.goto("https://recording.example/start");
  const actions: RecordedAction[] = [];
  const detach = await attachRecorder(page, action => actions.push(action));
  await page.locator("#next").click();
  await expect(page.locator("#result")).toHaveText("Done");
  await expect.poll(() => actions.some(a => a.type === "navigate" && a.url.endsWith("/next"))).toBe(true);
  const clickIndex = actions.findIndex(a => a.type === "click" && a.selector === "#next");
  const navigationIndex = actions.findIndex(a => a.type === "navigate" && a.url.endsWith("/next"));
  expect(clickIndex).toBeGreaterThanOrEqual(0);
  expect(navigationIndex).toBeGreaterThan(clickIndex);
  await detach();
  const replay = await browser.newPage();
  await replay.route("https://recording.example/**", async route => {
    const url = new URL(route.request().url());
    await route.fulfill({ status: 200, contentType: "text/html", body: url.pathname === "/next"
      ? '<h1 id="result">Done</h1>'
      : '<a id="next" href="/next">Next</a>' });
  });
  await replay.goto("https://recording.example/start");
  for (const action of actions) {
    if (action.type === "click") await replay.locator(action.selector).click();
    if (action.type === "fill") await replay.locator(action.selector).fill(action.value);
    if (action.type === "navigate") await replay.goto(action.url);
  }
  await expect(replay.locator("#result")).toHaveText("Done");
  await replay.close();
});
