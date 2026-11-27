import { expect, test } from "@playwright/test";

for (const mode of ["paused", "running", "forced", "stop-failed", "natural", "retry-paused", "retry-running", "residual", "cleanup-unknown"] as const) {
  const active = mode === "paused" || mode === "retry-paused" ? "paused" : "running";
  test("debug cancellation preserves completed nodes and marks " + mode + " node", async ({ page }) => {
    await page.addInitScript(({ active, mode }) => {
      const fixture = {
        schemaVersion: "1.0",
        metadata: { id: "stop", name: "停止確認", createdAt: "", updatedAt: "" },
        settings: { browser: "edge", headless: true, timeoutMs: 10000, viewport: { width: 1280, height: 720 } },
        variables: {},
        nodes: [
          { id: "start", type: "start", label: "開始", position: { x: 0, y: 0 }, config: {} },
          { id: "wait", type: "wait", label: "待機", position: { x: 0, y: 150 }, config: { durationMs: 1000 } },
          { id: "end", type: "end", label: "終了", position: { x: 0, y: 300 }, config: {} },
        ],
        edges: [{ id: "a", source: "start", target: "wait" }, { id: "b", source: "wait", target: "end" }],
      };
      localStorage.setItem("scenario-directory", "C:\\scenario-files");
      const callbacks = new Map<number, (event: unknown) => void>();
      let nextId = 0;
      let stopAttempts = 0;
      let cleanupPending = false;
      let cleanupChecks = 0;
      let listener: number | undefined;
      let finish: (() => void) | undefined;
      let fail: ((reason: Error) => void) | undefined;
      const emit = (type: string, extra: object = {}) => {
        if (listener !== undefined) callbacks.get(listener)?.({ event: "scenario-log", id: listener, payload: JSON.stringify({ type, runId: "test", ...extra }) });
      };
      Object.defineProperty(window, "__TAURI_INTERNALS__", { value: {
        transformCallback: (callback: (event: unknown) => void) => { const id = ++nextId; callbacks.set(id, callback); return id; },
        unregisterCallback: (id: number) => callbacks.delete(id),
        invoke: async (command: string, args?: { handler?: number }) => {
          if (command === "list_scenario_files") return [{ path: "C:\\scenario-files\\stop.pflow", name: fixture.metadata.name, category: "" }];
          if (command === "read_scenario_file") return JSON.stringify(fixture);
          if (command === "plugin:event|listen") { listener = args?.handler; return 1; }
          if (command === "plugin:event|unlisten") { listener = undefined; return; }
          if (command === "runner_cleanup_pending") {
            if (mode === "cleanup-unknown" && ++cleanupChecks <= 2) throw new Error("Cleanup check unavailable");
            return cleanupPending;
          }
          if (command === "run_scenario") {
            return new Promise<void>((resolve, reject) => {
              finish = resolve;
              fail = reject;
              emit("run.started");
              emit("node.started", { nodeId: "start" });
              emit("node.completed", { nodeId: "start", durationMs: 1 });
              emit("node." + (active === "paused" ? "paused" : "started"), { nodeId: "wait" });
            });
          }
          if (command === "stop_scenario") {
            stopAttempts++;
            if (mode === "cleanup-unknown" && stopAttempts > 1) return;
            if (mode === "residual") {
              if (stopAttempts === 1) {
                cleanupPending = true;
                fail?.(new Error("Runner cleanup failed"));
                throw new Error("Stop failed");
              }
              if (stopAttempts === 2) throw new Error("Retry failed");
              await new Promise<void>(resolve => {
                Object.defineProperty(window, "__releaseStop", { configurable: true, value: resolve });
              });
              cleanupPending = false;
              return;
            }
            if ((mode === "retry-paused" || mode === "retry-running") && stopAttempts === 1) {
              throw new Error("Stop failed while runner remains active");
            }
            if (mode === "forced" || mode === "stop-failed" || mode === "natural") {
              if (mode === "natural") {
                emit("node.completed", { nodeId: "wait", durationMs: 1 });
                emit("node.started", { nodeId: "end" });
                emit("node.completed", { nodeId: "end", durationMs: 1 });
                emit("run.finished", { status: "completed" });
                finish?.();
              } else fail?.(new Error("Runner exited"));
              await new Promise<void>((resolve, reject) => {
                Object.defineProperty(window, "__releaseStop", { configurable: true, value: () => mode === "stop-failed" ? reject(new Error("Stop failed")) : resolve() });
              });
              return;
            }
            emit("run.finished", { status: "cancelled" });
            finish?.();
            return;
          }
          throw new Error("Unsupported command: " + command);
        },
      }, configurable: true });
      Object.defineProperty(window, "__TAURI_EVENT_PLUGIN_INTERNALS__", { value: { unregisterListener: () => {} }, configurable: true });
    }, { active, mode });
    await page.goto("/");
    await page.getByRole("complementary", { name: "シナリオ一覧" }).getByRole("button", { name: "停止確認" }).click();
    await page.getByRole("button", { name: "✎ 編集する", exact: true }).click();
    await page.getByRole("button", { name: "🐞 デバッグ" }).click();
    await page.getByRole("button", { name: "▶ デバッグ開始" }).click();
    await expect(page.locator(".debug-step--" + active)).toHaveCount(1);
    await page.getByRole("button", { name: "■ 停止", exact: true }).click();
    if (mode === "cleanup-unknown") {
      const start = page.getByRole("button", { name: "▶ デバッグ開始" });
      const retry = page.getByRole("button", { name: "■ 停止再試行", exact: true });
      await expect(retry).toBeEnabled();
      await expect(start).toBeDisabled();
      await expect(page.getByText(/ランナーの終了確認に失敗しました/).first()).toBeVisible();
      await retry.click();
      await expect(page.getByText("ランナーの終了を確認できません。停止を再試行してください").first()).toBeVisible();
      await expect(start).toBeDisabled();
      await expect(retry).toBeEnabled();
      await retry.click();
      await expect(start).toBeEnabled();
      await expect(page.getByText("残留ランナーを停止しました").first()).toBeVisible();
      await expect(page.locator(".debug-step--cancelled")).toHaveCount(1);
      return;
    }
    if (mode === "residual") {
      const start = page.getByRole("button", { name: "▶ デバッグ開始" });
      const retry = page.getByRole("button", { name: "■ 停止再試行", exact: true });
      await expect(retry).toBeEnabled();
      await expect(start).toBeDisabled();
      await expect(page.locator(".debug-summary > div").first()).toContainText("終了未確認");
      await expect(page.locator(".debug-step--passed")).toHaveCount(1);
      await expect(page.locator(".debug-step--failed")).toHaveCount(1);
      await expect(page.getByRole("button", { name: "⏭ 次のステップ" })).toBeDisabled();
      await expect(page.getByRole("button", { name: "▷ 続行" })).toBeDisabled();
      await retry.click();
      await expect(page.getByText(/停止失敗:.*Retry failed/).first()).toBeVisible();
      await expect(retry).toBeEnabled();
      await expect(start).toBeDisabled();
      await retry.click();
      await expect.poll(() => page.evaluate(() => typeof (window as unknown as { __releaseStop?: () => void }).__releaseStop)).toBe("function");
      await expect(start).toBeDisabled();
      await expect(page.getByRole("button", { name: "停止中…" })).toBeDisabled();
      await page.evaluate(() => (window as unknown as { __releaseStop: () => void }).__releaseStop());
      await expect(start).toBeEnabled();
      await expect(page.getByText("残留ランナーを停止しました").first()).toBeVisible();
      await expect(page.locator(".debug-summary > div").first()).toContainText("失敗");
      await expect(page.locator(".debug-step--failed")).toHaveCount(1);
      await expect(page.getByRole("button", { name: "■ 停止", exact: true })).toBeDisabled();
      await start.click();
      await expect(page.locator(".debug-step--running")).toHaveCount(1);
      return;
    }
    if (mode === "retry-paused" || mode === "retry-running") {
      await expect(page.getByText(/停止失敗:.*Stop failed while runner remains active/).first()).toBeVisible();
      await expect(page.getByRole("button", { name: "▶ デバッグ開始" })).toBeDisabled();
      await expect(page.locator(".debug-step--" + active)).toHaveCount(1);
      await expect(page.locator(".debug-step--passed")).toHaveCount(1);
      await expect(page.locator(".debug-step--cancelled")).toHaveCount(0);
      await expect(page.locator(".debug-step--failed")).toHaveCount(0);
      const step = page.getByRole("button", { name: "⏭ 次のステップ" });
      const resume = page.getByRole("button", { name: "▷ 続行" });
      if (mode === "retry-paused") {
        await expect(step).toBeEnabled();
        await expect(resume).toBeEnabled();
      } else {
        await expect(step).toBeDisabled();
        await expect(resume).toBeDisabled();
      }
      const stop = page.getByRole("button", { name: "■ 停止", exact: true });
      await expect(stop).toBeEnabled();
      await stop.click();
    }
    if (mode === "forced" || mode === "stop-failed" || mode === "natural") {
      await expect.poll(() => page.evaluate(() => typeof (window as unknown as { __releaseStop?: () => void }).__releaseStop)).toBe("function");
      await expect(page.getByRole("button", { name: "▶ デバッグ開始" })).toBeDisabled();
      await page.evaluate(() => (window as unknown as { __releaseStop: () => void }).__releaseStop());
      await expect(page.getByRole("button", { name: "▶ デバッグ開始" })).toBeEnabled();
      if (mode === "natural") {
        await expect(page.locator(".debug-summary > div").first()).toContainText("完了");
        await expect(page.locator(".debug-step--passed")).toHaveCount(3);
        await expect(page.locator(".debug-step--cancelled")).toHaveCount(0);
        return;
      }
      if (mode === "stop-failed") {
        await expect(page.locator(".debug-summary > div").first()).toContainText("失敗");
        await expect(page.locator(".debug-step--failed")).toHaveCount(1);
        await expect(page.locator(".debug-step--passed")).toHaveCount(1);
        await expect(page.locator(".debug-step--cancelled")).toHaveCount(0);
        return;
      }
    }
    await expect(page.locator(".debug-summary > div").first()).toContainText("停止");
    await expect(page.locator(".debug-step--passed")).toHaveCount(1);
    await expect(page.locator(".debug-step--cancelled")).toContainText("■ 停止");
    await expect(page.locator(".debug-node--cancelled")).toHaveCount(1);
    await expect(page.locator(".debug-step--failed")).toHaveCount(0);
    await expect(page.locator(".debug-step").last()).toContainText("未実行");
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "33");
    if (mode !== "forced") await expect(page.getByRole("log", { name: "デバッグログ" })).toContainText("run.finished / cancelled");
    await expect(page.getByRole("button", { name: "▶ デバッグ開始" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "⏭ 次のステップ" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "▷ 続行" })).toBeDisabled();
  });
}
