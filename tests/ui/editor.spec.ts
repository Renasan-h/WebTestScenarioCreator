import { test, expect } from "@playwright/test";

test("scenario editor shows main controls", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Web Test Scenario Creator")).toBeVisible();
  await expect(page.getByRole("button", { name: "新規" })).toBeVisible();
  await expect(page.getByRole("button", { name: "保存" })).toBeVisible();
  await expect(page.getByRole("button", { name: "実行", exact: false })).toBeVisible();
  await expect(page.getByLabel("ブラウザ")).toHaveValue("edge");
});
test("adds and edits a navigation node", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "＋ URL移動" }).click();
  await expect(page.getByText("ノード設定")).toBeVisible();
  await page.getByLabel("URL", { exact: true }).fill("https://example.org");
  await expect(page.getByLabel("URL", { exact: true })).toHaveValue("https://example.org");
});
test("changes browser and creates new scenario", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("ブラウザ").selectOption("chromium");
  await expect(page.getByLabel("ブラウザ")).toHaveValue("chromium");
  await page.getByRole("button", { name: "新規" }).click();
  await expect(page.getByLabel("ブラウザ")).toHaveValue("edge");
});
