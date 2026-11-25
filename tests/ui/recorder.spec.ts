import { test, expect } from "@playwright/test";
import { attachRecorder, type RecordedAction } from "../../packages/playwright-adapter/src/record";
import { runAction } from "../../packages/playwright-adapter/src/browser";
import { appendRecordedAction } from "../../packages/playwright-adapter/src/record-graph";
import { exportPlaywrightTest } from "../../packages/engine/src/export";
import { executeScenario } from "../../packages/engine/src/execute";
import { validateGraph, type Scenario } from "../../packages/schema/src/scenario";

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
  const initial: Scenario = {
    schemaVersion: "1.0",
    metadata: { id: "replay", name: "Recorded replay", createdAt: "", updatedAt: "" },
    settings: { browser: "chromium", headless: true, timeoutMs: 5000, viewport: { width: 800, height: 600 } },
    variables: {},
    nodes: [
      { id: "start", type: "start", label: "Start", position: { x: 0, y: 0 }, config: {} },
      { id: "end", type: "end", label: "End", position: { x: 0, y: 100 }, config: {} },
    ],
    edges: [],
  };
  const scenario = actions.reduce((graph, action) => appendRecordedAction(graph, action),
    appendRecordedAction(initial, { type: "navigate", url: "https://recording.example/start" }));
  expect(validateGraph(scenario)).toEqual([]);
  await executeScenario(scenario, node => runAction(replay, node), () => {});
  await expect(replay.locator("#result")).toHaveText("Done");
  await replay.close();
});

test("records quoted test IDs as valid selectors", async ({ page }) => {
  await page.goto("about:blank");
  await page.setContent('<button data-testid=\'say"hello\'>Hello</button>');
  const actions: RecordedAction[] = [];
  const detach = await attachRecorder(page, action => actions.push(action));
  await page.getByRole("button", { name: "Hello" }).click();
  await expect.poll(() => actions.length).toBe(1);
  const click = actions[0];
  expect(click.type).toBe("click");
  if (click.type === "click") {
    await expect(page.locator(click.selector)).toHaveCount(1);
  }
  await detach();
});


test("exported Playwright actions preserve node timeouts and missing-text NO branch", async ({ page }) => {
  const scenario: Scenario = {
    schemaVersion: "1.0",
    metadata: { id: "export", name: "Export parity", createdAt: "", updatedAt: "" },
    settings: { browser: "chromium", headless: true, timeoutMs: 5000, viewport: { width: 800, height: 600 } },
    variables: {},
    nodes: [
      { id: "start", type: "start", label: "Start", position: { x: 0, y: 0 }, config: {} },
      { id: "branch", type: "condition", label: "Branch", position: { x: 0, y: 100 }, config: { check: "textContains", expected: "Ready", locator: { strategy: "css", value: "#missing" } } },
      { id: "yes", type: "click", label: "Yes", position: { x: 0, y: 200 }, config: { locator: { strategy: "css", value: "#yes" }, timeoutMs: 800 } },
      { id: "no", type: "fill", label: "No", position: { x: 200, y: 200 }, config: { locator: { strategy: "css", value: "#result" }, value: "NO", timeoutMs: 900 } },
      { id: "end", type: "end", label: "End", position: { x: 0, y: 300 }, config: {} },
    ],
    edges: [
      { id: "a", source: "start", target: "branch" },
      { id: "b", source: "branch", target: "yes", sourceHandle: "true" },
      { id: "c", source: "branch", target: "no", sourceHandle: "false" },
      { id: "d", source: "yes", target: "end" },
      { id: "e", source: "no", target: "end" },
    ],
  };
  const code = exportPlaywrightTest(scenario);
  expect(code).toContain('.click({"timeout":800})');
  expect(code).toContain('.fill("NO", {"timeout":900})');
  await page.setContent('<input id="result">');
  page.setDefaultTimeout(300);
  // Execute the generated test body against the real browser fixture.
  const marker = "async ({ page }) => {";
  const body = code.slice(code.indexOf(marker) + marker.length, code.lastIndexOf("});"));
  await new Function("page", "return (async () => {" + body + "})();")(page);
  await expect(page.locator("#result")).toHaveValue("NO");
});
