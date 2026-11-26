import { beforeEach, describe, expect, it, vi } from "vitest";
import { chromium } from "playwright";
import { openBrowser } from "../packages/playwright-adapter/src/browser";
import type { Scenario } from "../packages/schema/src/scenario";

vi.mock("playwright", () => ({ chromium: { launch: vi.fn() } }));

const scenario: Scenario = {
  schemaVersion: "1.0",
  metadata: { id: "init", name: "init", createdAt: "", updatedAt: "" },
  settings: { browser: "chromium", headless: true, timeoutMs: 5000, viewport: { width: 800, height: 600 } },
  variables: {}, nodes: [], edges: [],
};

const page = { setDefaultTimeout: vi.fn() };
const context = { newPage: vi.fn() };
const browser = { newContext: vi.fn(), close: vi.fn() };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(chromium.launch).mockResolvedValue(browser as unknown as Awaited<ReturnType<typeof chromium.launch>>);
  browser.newContext.mockResolvedValue(context);
  context.newPage.mockResolvedValue(page);
  browser.close.mockResolvedValue(undefined);
});

describe("openBrowser initialization", () => {
  it("returns the initialized browser without closing it", async () => {
    expect(await openBrowser(scenario)).toEqual({ browser, page });
    expect(browser.newContext).toHaveBeenCalledWith({ viewport: scenario.settings.viewport });
    expect(page.setDefaultTimeout).toHaveBeenCalledWith(5000);
    expect(browser.close).not.toHaveBeenCalled();
  });

  it.each(["context", "page", "timeout"] as const)("closes the browser when %s initialization fails", async stage => {
    const error = new Error(stage);
    if (stage === "context") browser.newContext.mockRejectedValue(error);
    else if (stage === "page") context.newPage.mockRejectedValue(error);
    else page.setDefaultTimeout.mockImplementation(() => { throw error; });
    await expect(openBrowser(scenario)).rejects.toBe(error);
    expect(browser.close).toHaveBeenCalledTimes(1);
  });

  it("preserves both initialization and cleanup errors", async () => {
    const initialization = new Error("initialization");
    const cleanup = new Error("cleanup");
    context.newPage.mockRejectedValue(initialization);
    browser.close.mockRejectedValue(cleanup);
    await expect(openBrowser(scenario)).rejects.toMatchObject({
      name: "AggregateError", errors: [initialization, cleanup],
    });
    expect(browser.close).toHaveBeenCalledTimes(1);
  });

  it("propagates launch failure without closing an uncreated browser", async () => {
    const error = new Error("launch");
    vi.mocked(chromium.launch).mockRejectedValue(error);
    await expect(openBrowser(scenario)).rejects.toBe(error);
    expect(browser.close).not.toHaveBeenCalled();
  });
});
