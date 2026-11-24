import { expect, test } from "@playwright/test";

test("starts on TOP with scenario browser and compact navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("main", { name: "TOP画面" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "シナリオ一覧" })).toBeVisible();
  await expect(page.getByRole("button", { name: "▣ ディレクトリを選択" })).toBeVisible();
  await expect(page.getByRole("button", { name: "＋ 新規" })).toBeVisible();
  await expect(page.getByRole("button", { name: "↗ 開く" })).toBeVisible();
  await expect(page.getByRole("button", { name: "ダークモードに切り替え" })).toBeVisible();
  await expect(page.getByRole("button", { name: "▶ 実行" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "保存" })).toHaveCount(0);
});

test("creates an editor scenario and navigates between three screens", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "＋ 新規" }).click();
  await expect(page.getByRole("main", { name: "TOP画面" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "保存" })).toBeVisible();
  await expect(page.locator('[data-node-kind="start"]')).toBeVisible();
  await page.getByRole("button", { name: "🐞 デバッグ" }).click();
  await expect(page.getByRole("main", { name: "デバッグ画面" })).toBeVisible();
  await expect(page.getByRole("button", { name: "⏭ 次のステップ" })).toBeDisabled();
  await page.getByRole("button", { name: "⌂ TOPへ" }).click();
  await expect(page.getByRole("main", { name: "TOP画面" })).toBeVisible();
});

test("scenario directory selection persists as a preference", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("scenario-directory", "C:\\scenario-files");
    (window as typeof window & { __TAURI_INTERNALS__?: { invoke: (command: string) => Promise<unknown> } }).__TAURI_INTERNALS__ = {
      invoke: async (command: string) => {
        if (command === "list_scenario_files") return [
          { path: "C:\\scenario-files\\checkout.pflow", name: "注文フロー", category: "購入" },
          { path: "C:\\scenario-files\\login.pflow", name: "ログイン確認", category: "認証" },
        ];
        if (command === "read_scenario_file") return JSON.stringify({
          schemaVersion: "1.0",
          metadata: { id: "sample", name: "注文フロー", createdAt: "", updatedAt: "" },
          settings: { browser: "edge", headless: false, timeoutMs: 10000, viewport: { width: 1280, height: 720 } },
          variables: {},
          nodes: [
            { id: "start", type: "start", label: "開始", position: { x: 120, y: 100 }, config: {} },
            { id: "end", type: "end", label: "終了", position: { x: 120, y: 300 }, config: {} },
          ],
          edges: [{ id: "connection", source: "start", target: "end" }],
        });
        throw new Error("Unsupported command: " + command);
      },
    };
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "注文フロー" })).toBeVisible();
  await expect(page.getByRole("button", { name: "ログイン確認" })).toBeVisible();
  await page.getByRole("button", { name: "注文フロー" }).click();
  await expect(page.getByRole("heading", { name: "注文フロー" })).toBeVisible();
  await expect(page.getByRole("button", { name: "▶ 実行" })).toBeEnabled();
  await expect(page.getByText("C:\\scenario-files", { exact: true })).toBeVisible();
});


test("saving and reopening a branched scenario preserves graph and edited settings", async ({ page }) => {
  const filePath = "C:\\scenario-files\\branch.pflow";
  const fixture = {
    schemaVersion: "1.0",
    metadata: { id: "branch", name: "分岐確認", createdAt: "", updatedAt: "" },
    settings: { browser: "edge", headless: false, timeoutMs: 10000, viewport: { width: 1280, height: 720 } },
    variables: {},
    nodes: [
      { id: "start", type: "start", label: "開始", position: { x: 0, y: 0 }, config: {} },
      { id: "condition", type: "condition", label: "条件分岐", position: { x: 240, y: 0 }, config: { locator: { strategy: "css", value: "body" }, check: "textContains", expected: "Ready" } },
      { id: "end", type: "end", label: "終了", position: { x: 480, y: 0 }, config: {} },
    ],
    edges: [
      { id: "entry", source: "start", target: "condition" },
      { id: "yes", source: "condition", target: "end", sourceHandle: "true" },
      { id: "no", source: "condition", target: "end", sourceHandle: "false" },
    ],
  };
  await page.addInitScript(({ filePath, fixture }) => {
    localStorage.setItem("scenario-directory", "C:\\scenario-files");
    const storageKey = "test-pflow-content";
    if (!localStorage.getItem(storageKey)) localStorage.setItem(storageKey, JSON.stringify(fixture));
    Object.defineProperty(window, "__TAURI_INTERNALS__", { value: {
      invoke: async (command: string, args?: { path?: string; content?: string }) => {
        if (command === "list_scenario_files") return [{ path: filePath, name: fixture.metadata.name, category: "" }];
        if (command === "read_scenario_file" && args?.path === filePath) return localStorage.getItem(storageKey);
        if (command === "write_scenario_file" && args?.path === filePath && typeof args.content === "string") {
          localStorage.setItem(storageKey, args.content);
          return;
        }
        throw new Error("Unsupported command: " + command);
      },
    } });
  }, { filePath, fixture });
  await page.goto("/");
  await page.getByRole("button", { name: "分岐確認", exact: true }).click();
  await expect(page.getByRole("heading", { name: "分岐確認" })).toBeVisible();
  await page.getByRole("button", { name: "✎ 編集", exact: true }).click();
  await page.locator('[data-node-kind="condition"]').click();
  await page.getByLabel("比較文字列").fill("Completed");
  await page.getByLabel("スクリーンショットを撮影").check();
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByRole("contentinfo")).toContainText("保存しました");
  const saved = JSON.parse(await page.evaluate(() => localStorage.getItem("test-pflow-content")!));
  expect(saved.nodes).toEqual(fixture.nodes.map(node => node.id === "condition"
    ? { ...node, screenshot: true, config: { ...node.config, expected: "Completed" } }
    : node));
  expect(saved.edges).toEqual(fixture.edges);
  await page.reload();
  await page.getByRole("button", { name: "分岐確認", exact: true }).click();
  await expect(page.getByRole("heading", { name: "分岐確認" })).toBeVisible();
  await page.getByRole("button", { name: "✎ 編集", exact: true }).click();
  await expect(page.locator(".canvas .react-flow__edge")).toHaveCount(3);
  await page.locator('[data-node-kind="condition"]').click();
  await expect(page.getByLabel("比較文字列")).toHaveValue("Completed");
  await expect(page.getByLabel("スクリーンショットを撮影")).toBeChecked();
});
