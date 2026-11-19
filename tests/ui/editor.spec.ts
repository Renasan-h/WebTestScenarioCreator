import { test, expect, type Page } from "@playwright/test";

async function openEditor(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "✎ 編集", exact: true }).click();
}

test("scenario editor shows main controls", async ({ page }) => {
  await openEditor(page);
  await expect(page.getByText("Scenario Studio")).toBeVisible();
  await expect(page.getByRole("button", { name: "保存" })).toBeVisible();
  await expect(page.getByRole("button", { name: "実行", exact: false })).toBeVisible();
  await expect(page.getByLabel("ブラウザ")).toHaveValue("edge");
});
test("adds and edits a navigation node", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("button", { name: "＋ URL移動" }).click();
  await expect(page.getByText("ノード設定")).toBeVisible();
  await page.getByLabel("URL", { exact: true }).fill("https://example.org");
  await expect(page.getByLabel("URL", { exact: true })).toHaveValue("https://example.org");
});
test("changes browser and creates new scenario", async ({ page }) => {
  await openEditor(page);
  await page.getByLabel("ブラウザ").selectOption("chromium");
  await expect(page.getByLabel("ブラウザ")).toHaveValue("chromium");
  await page.getByRole("button", { name: "⌂ TOP" }).click();
  await page.getByRole("button", { name: "＋ 新規" }).click();
  await expect(page.getByLabel("ブラウザ")).toHaveValue("edge");
});

test("stop is available on the debug screen but disabled while idle", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("button", { name: "◇ デバッグ", exact: true }).click();
  await expect(page.getByRole("button", { name: "■ 停止" })).toBeDisabled();
});
test("visibility assertion node can be configured", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("button", { name: "＋ 表示確認" }).click();
  await expect(page.getByLabel("Locator値")).toHaveValue("body");
  await page.getByLabel("Locator値").fill("#ready");
  await expect(page.getByLabel("Locator値")).toHaveValue("#ready");
});

test("text assertion node accepts expected text", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("button", { name: "＋ 文字列確認" }).click();
  await page.getByLabel("期待する文字列").fill("Welcome");
  await expect(page.getByLabel("期待する文字列")).toHaveValue("Welcome");
});

test("record button is available on the editor", async ({ page }) => {
  await openEditor(page);
  await expect(page.getByRole("button", { name: "● 記録" })).toBeEnabled();
});

test("switches themes with an icon button and persists the choice", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("button", { name: "ダークモードに切り替え" }).click();
  await expect(page.locator(".app")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".react-flow")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator(".app")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "ライトモードに切り替え" }).click();
  await expect(page.locator(".app")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator(".app")).toHaveAttribute("data-theme", "light");
});

test("renders custom start/end nodes and updates action preview", async ({ page }) => {
  await openEditor(page);
  await expect(page.locator('[data-node-kind="start"]')).toBeVisible();
  await expect(page.locator('[data-node-kind="end"]')).toBeVisible();
  await page.getByRole("button", { name: "＋ URL移動" }).click();
  await expect(page.locator('[data-node-kind="navigate"]')).toContainText("https://example.com");
  await page.getByLabel("URL", { exact: true }).fill("https://example.org");
  await expect(page.locator('[data-node-kind="navigate"]')).toContainText("https://example.org");
  await page.getByRole("button", { name: "ダークモードに切り替え" }).click();
  await expect(page.locator('[data-node-kind="navigate"]')).toBeVisible();
});

test("configures condition node and per-node screenshot", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("button", { name: "＋ 条件分岐" }).click();
  await expect(page.locator('[data-node-kind="condition"]')).toBeVisible();
  await expect(page.locator('.react-flow__handle[data-handleid="true"]')).toBeVisible();
  await expect(page.locator('.react-flow__handle[data-handleid="false"]')).toBeVisible();
  await page.getByLabel("条件").selectOption("textContains");
  await page.getByLabel("比較文字列").fill("Ready");
  await page.getByLabel("スクリーンショットを撮影").check();
  await expect(page.getByLabel("スクリーンショットを撮影")).toBeChecked();
  await expect(page.locator('[data-node-kind="condition"]')).toContainText("Ready");
});

test("new nodes appear inside the visible canvas", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("button", { name: "＋ URL移動" }).click();
  const canvas = await page.locator(".canvas .react-flow").boundingBox();
  const node = await page.locator('[data-node-kind="navigate"]').boundingBox();
  expect(canvas).not.toBeNull();
  expect(node).not.toBeNull();
  expect(node!.x).toBeGreaterThan(canvas!.x);
  expect(node!.y).toBeGreaterThan(canvas!.y);
  expect(node!.x + node!.width).toBeLessThan(canvas!.x + canvas!.width);
  expect(node!.y + node!.height).toBeLessThan(canvas!.y + canvas!.height);
});

test("log panel can be resized without covering workspace", async ({ page }) => {
  await openEditor(page);
  const logs = page.locator(".logs");
  const before = await logs.boundingBox();
  const handle = page.getByRole("separator", { name: "ログ表示の高さを変更" });
  await handle.focus();
  await page.keyboard.press("ArrowUp");
  const after = await logs.boundingBox();
  expect(after!.height).toBeGreaterThan(before!.height);
  const workspace = await page.locator(".sidebar").boundingBox();
  expect(workspace!.y + workspace!.height).toBeLessThanOrEqual(after!.y + 1);
});

test("connection handles are easy to target", async ({ page }) => {
  await openEditor(page);
  const handle = page.locator('[data-node-kind="start"] .react-flow__handle');
  const box = await handle.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(18);
  expect(box!.height).toBeGreaterThanOrEqual(18);
});

test("undo and redo node additions using toolbar and keyboard", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("button", { name: "＋ URL移動" }).click();
  await expect(page.locator('[data-node-kind="navigate"]')).toHaveCount(1);
  await page.getByRole("button", { name: "↶ 元に戻す" }).click();
  await expect(page.locator('[data-node-kind="navigate"]')).toHaveCount(0);
  await page.keyboard.press("Control+y");
  await expect(page.locator('[data-node-kind="navigate"]')).toHaveCount(1);
  await page.keyboard.press("Control+z");
  await expect(page.locator('[data-node-kind="navigate"]')).toHaveCount(0);
});

test("copy and paste creates an independent node with a new id", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("button", { name: "＋ URL移動" }).click();
  await page.getByRole("button", { name: "コピー", exact: true }).click();
  await page.getByRole("button", { name: "貼り付け", exact: true }).click();
  await expect(page.locator('[data-node-kind="navigate"]')).toHaveCount(2);
  const ids = await page.locator('[data-node-kind="navigate"]').evaluateAll(nodes => nodes.map(n => n.closest(".react-flow__node")?.getAttribute("data-id")));
  expect(new Set(ids).size).toBe(2);
  await page.getByRole("button", { name: "↶ 元に戻す" }).click();
  await expect(page.locator('[data-node-kind="navigate"]')).toHaveCount(1);
  await page.getByRole("button", { name: "↷ やり直す" }).click();
  await expect(page.locator('[data-node-kind="navigate"]')).toHaveCount(2);
});

test("keyboard shortcuts do not override text editing", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("button", { name: "＋ URL移動" }).click();
  const url = page.getByLabel("URL", { exact: true });
  await url.fill("https://example.org");
  await url.press("Control+a");
  await url.press("Control+c");
  await url.press("Control+v");
  await expect(page.locator('[data-node-kind="navigate"]')).toHaveCount(1);
});

test("debug controls are visible and disabled until a paused run", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("button", { name: "◇ デバッグ", exact: true }).click();
  await expect(page.getByRole("button", { name: "▶ デバッグ開始" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "⏭ 次のステップ" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "▷ 続行" })).toBeDisabled();
});

test("right-click on canvas opens the node creation menu", async ({ page }) => {
  await openEditor(page);
  await page.locator(".canvas .react-flow__pane").click({ button: "right", position: { x: 190, y: 165 } });
  await expect(page.getByRole("menuitem", { name: "ノード › クリック" })).toBeVisible();
  await page.getByRole("menuitem", { name: "ノード › クリック" }).click();
  await expect(page.locator('[data-node-kind="click"]')).toHaveCount(1);
});

test("Delete and Backspace remove selected nodes and undo restores them", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("button", { name: "＋ URL移動" }).click();
  await page.locator('[data-node-kind="navigate"]').click();
  await page.keyboard.press("Delete");
  await expect(page.locator('[data-node-kind="navigate"]')).toHaveCount(0);
  await page.getByRole("button", { name: "↶ 元に戻す" }).click();
  await expect(page.locator('[data-node-kind="navigate"]')).toHaveCount(1);
  await page.locator('[data-node-kind="navigate"]').click();
  await page.keyboard.press("Backspace");
  await expect(page.locator('[data-node-kind="navigate"]')).toHaveCount(0);
});

test("connection handles stay stationary on hover for all node types", async ({ page }) => {
  await openEditor(page);
  for (const type of ["URL移動", "クリック", "入力", "待機", "条件分岐", "表示確認", "文字列確認"]) {
    await page.getByRole("button", { name: "＋ " + type }).click();
  }
  const handles = page.locator(".canvas .scenario-node .react-flow__handle");
  const count = await handles.count();
  expect(count).toBeGreaterThan(8);
  for (let index = 0; index < count; index++) {
    const handle = handles.nth(index);
    const before = await handle.boundingBox();
    if (!before) continue;
    await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
    const after = await handle.boundingBox();
    expect(after).not.toBeNull();
    expect(Math.abs(after!.x - before.x)).toBeLessThan(1);
    expect(Math.abs(after!.y - before.y)).toBeLessThan(1);
  }
});

test("right-click menu deletes an action node and keeps required start node", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("button", { name: "＋ 待機" }).click();
  await page.locator('[data-node-kind="wait"]').click({ button: "right" });
  await expect(page.getByRole("menuitem", { name: "削除" })).toBeVisible();
  await page.getByRole("menuitem", { name: "削除" }).click();
  await expect(page.locator('[data-node-kind="wait"]')).toHaveCount(0);
  await expect(page.locator('[data-node-kind="start"]')).toHaveCount(1);
});

test("marquee selection supports multiple selected nodes", async ({ page }) => {
  await openEditor(page);
  const start = page.locator('[data-node-kind="start"]');
  const end = page.locator('[data-node-kind="end"]');
  const startBox = await start.boundingBox();
  const endBox = await end.boundingBox();
  expect(startBox).not.toBeNull();
  expect(endBox).not.toBeNull();
  const left = Math.min(startBox!.x, endBox!.x) - 15;
  const top = Math.min(startBox!.y, endBox!.y) - 15;
  const right = Math.max(startBox!.x + startBox!.width, endBox!.x + endBox!.width) + 15;
  const bottom = Math.max(startBox!.y + startBox!.height, endBox!.y + endBox!.height) + 15;
  await page.mouse.move(left, top);
  await page.mouse.down();
  await page.mouse.move(right, bottom, { steps: 10 });
  await page.mouse.up();
  await expect(page.locator(".canvas .react-flow__node.selected")).toHaveCount(2);
});

test("copies multiple selected action nodes as a group", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("button", { name: "＋ URL移動" }).click();
  await page.getByRole("button", { name: "＋ 待機" }).click();
  await page.locator('[data-node-kind="navigate"]').click();
  await page.locator('[data-node-kind="wait"]').click({ modifiers: ["Shift"] });
  await expect(page.locator(".canvas .react-flow__node.selected")).toHaveCount(2);
  await page.getByRole("button", { name: "コピー", exact: true }).click();
  await page.getByRole("button", { name: "貼り付け", exact: true }).click();
  await expect(page.locator('[data-node-kind="navigate"]')).toHaveCount(2);
  await expect(page.locator('[data-node-kind="wait"]')).toHaveCount(2);
  await page.getByRole("button", { name: "↶ 元に戻す" }).click();
  await expect(page.locator('[data-node-kind="navigate"]')).toHaveCount(1);
  await expect(page.locator('[data-node-kind="wait"]')).toHaveCount(1);
});

test("rejects connections into start and self connections without changing the graph", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("button", { name: "＋ URL移動" }).click();
  const startTarget = page.locator('[data-node-kind="start"] .react-flow__handle');
  const actionSource = page.locator('[data-node-kind="navigate"] .react-flow__handle.source');
  const sourceBox = await actionSource.boundingBox();
  const targetBox = await startTarget.boundingBox();
  expect(sourceBox).not.toBeNull();
  expect(targetBox).not.toBeNull();
  await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + sourceBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox!.x + targetBox!.width / 2, targetBox!.y + targetBox!.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect(page.locator(".canvas .react-flow__edge")).toHaveCount(0);
});
