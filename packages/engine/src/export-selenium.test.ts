import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import type { Scenario } from "../../schema/src/scenario";
import { exportSeleniumTest } from "./export-selenium";

const base: Scenario = {
  schemaVersion: "1.0",
  metadata: { id: "scenario", name: "Selenium export", createdAt: "2026-01-01", updatedAt: "2026-01-01" },
  settings: { browser: "chromium", headless: false, timeoutMs: 10000, viewport: { width: 1280, height: 720 } },
  variables: {},
  nodes: [
    { id: "start", type: "start", label: "Start", position: { x: 0, y: 0 }, config: {} },
    { id: "navigate", type: "navigate", label: "Navigate", position: { x: 0, y: 100 }, config: { url: "https://example.com" } },
    { id: "end", type: "end", label: "End", position: { x: 0, y: 200 }, config: {} },
  ],
  edges: [
    { id: "e1", source: "start", target: "navigate" },
    { id: "e2", source: "navigate", target: "end" },
  ],
};

describe("exportSeleniumTest", () => {
  it("generates a Selenium WebDriver script from a valid pflow graph", () => {
    const code = exportSeleniumTest(base);
    expect(code).toContain('from "selenium-webdriver"');
    expect(code).toContain('forBrowser("chrome")');
    expect(code).toContain('await driver.get("https://example.com")');
    expect(code).toContain("await driver.quit()");
  });

  it("rejects invalid graphs before generating code", () => {
    expect(() => exportSeleniumTest({ ...base, edges: [] })).toThrow();
  });

  it("exports the condition YES and NO paths", () => {
    const graph: Scenario = {
      ...base,
      nodes: [
        base.nodes[0],
        { id: "condition", type: "condition", label: "Condition", position: { x: 0, y: 50 }, config: { locator: { strategy: "css", value: "#status" }, check: "visible" } },
        { id: "yes", type: "wait", label: "Yes", position: { x: 0, y: 100 }, config: { durationMs: 100 } },
        { id: "no", type: "wait", label: "No", position: { x: 0, y: 150 }, config: { durationMs: 200 } },
        base.nodes[2],
      ],
      edges: [
        { id: "a", source: "start", target: "condition" },
        { id: "b", source: "condition", sourceHandle: "true", target: "yes" },
        { id: "c", source: "condition", sourceHandle: "false", target: "no" },
        { id: "d", source: "yes", target: "end" },
        { id: "e", source: "no", target: "end" },
      ],
    };
    const code = exportSeleniumTest(graph);
    expect(code).toContain("await driver.sleep(100)");
    expect(code).toContain("await driver.sleep(200)");
    expect(code).toContain("} else {");
  });
});

describe("Selenium browser options", () => {
  it("uses Edge options and enables headless mode when requested", () => {
    const code = exportSeleniumTest({
      ...base,
      settings: { ...base.settings, browser: "edge", headless: true },
    });
    expect(code).toContain('forBrowser("MicrosoftEdge")');
    expect(code).toContain("new edge.Options()");
    expect(code).toContain('options.addArguments("--headless=new")');
    expect(code).toContain(".setEdgeOptions(options)");
  });

  it("uses Chrome options without headless arguments when disabled", () => {
    const code = exportSeleniumTest(base);
    expect(code).toContain("new chrome.Options()");
    expect(code).toContain(".setChromeOptions(options)");
    expect(code).not.toContain('options.addArguments("--headless=new")');
  });
});

describe("generated Selenium JavaScript syntax", () => {
  it("passes the Node.js ES Module syntax check", () => {
    const code = exportSeleniumTest(base);
    const result = spawnSync(process.execPath, ["--check", "--input-type=module"], {
      input: code,
      encoding: "utf8",
    });
    expect(result.status, result.stderr).toBe(0);
  });

  it("passes syntax checking with conditions and screenshots", () => {
    const graph: Scenario = {
      ...base,
      nodes: base.nodes.map(node => node.type === "navigate" ? { ...node, screenshot: true } : node),
    };
    const result = spawnSync(process.execPath, ["--check", "--input-type=module"], {
      input: exportSeleniumTest(graph),
      encoding: "utf8",
    });
    expect(result.status, result.stderr).toBe(0);
  });
});

describe("Selenium fill semantics", () => {
  it("clears the existing value before entering new text", () => {
    const graph: Scenario = {
      ...base,
      nodes: base.nodes.map(node => node.type === "navigate"
        ? { id: "fill", type: "fill", label: "Fill", position: node.position, config: { locator: { strategy: "css", value: "#name" }, value: "updated" } }
        : node),
      edges: base.edges.map(edge => ({
        ...edge,
        source: edge.source === "navigate" ? "fill" : edge.source,
        target: edge.target === "navigate" ? "fill" : edge.target,
      })),
    };
    const code = exportSeleniumTest(graph);
    expect(code).toContain('driver.findElement(By.css("#name"))');
    expect(code).toContain("await element.clear();");
    expect(code).toContain('await element.sendKeys("updated");');
    expect(code.indexOf("await element.clear()")).toBeLessThan(code.indexOf("await element.sendKeys"));
  });
});

describe("Selenium testId locator escaping", () => {
  it("preserves backslashes and double quotes in test IDs", () => {
    const testId = 'a\\\\b"c';
    const graph: Scenario = {
      ...base,
      nodes: base.nodes.map(node => node.type === "navigate"
        ? { id: "click", type: "click", label: "Click", position: node.position, config: { locator: { strategy: "testId", value: testId } } }
        : node),
      edges: base.edges.map(edge => ({
        ...edge,
        source: edge.source === "navigate" ? "click" : edge.source,
        target: edge.target === "navigate" ? "click" : edge.target,
      })),
    };
    const code = exportSeleniumTest(graph);
    expect(code).toContain("By.xpath(");
    expect(code).toContain("@data-testid=");
    expect(code).toContain(JSON.stringify("//*[@data-testid=\'" + testId + "\']"));
    const result = spawnSync(process.execPath, ["--check", "--input-type=module"], { input: code, encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
  });
});

describe("Selenium visible assertion", () => {
  it("waits for the element to exist before waiting for visibility", () => {
    const graph: Scenario = {
      ...base,
      nodes: base.nodes.map(node => node.type === "navigate"
        ? { id: "visible", type: "assertVisible", label: "Visible", position: node.position, config: { locator: { strategy: "css", value: "#result" } } }
        : node),
      edges: base.edges.map(edge => ({
        ...edge,
        source: edge.source === "navigate" ? "visible" : edge.source,
        target: edge.target === "navigate" ? "visible" : edge.target,
      })),
    };
    const code = exportSeleniumTest(graph);
    expect(code).toContain('until.elementLocated(By.css("#result"))');
    expect(code).toContain("until.elementIsVisible(await driver.wait(");
    expect(code).not.toContain('elementIsVisible(await driver.findElement(By.css("#result")))');
    const result = spawnSync(process.execPath, ["--check", "--input-type=module"], { input: code, encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
  });
});

describe("Selenium text locator", () => {
  it("excludes ancestors with matching descendant elements", () => {
    const graph: Scenario = {
      ...base,
      nodes: base.nodes.map(node => node.type === "navigate"
        ? { id: "click", type: "click", label: "Click", position: node.position, config: { locator: { strategy: "text", value: "Submit" } } }
        : node),
      edges: base.edges.map(edge => ({
        ...edge,
        source: edge.source === "navigate" ? "click" : edge.source,
        target: edge.target === "navigate" ? "click" : edge.target,
      })),
    };
    const code = exportSeleniumTest(graph);
    expect(code).toContain("and not(*[contains(normalize-space(.), 'Submit')])");
    const result = spawnSync(process.execPath, ["--check", "--input-type=module"], { input: code, encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
  });
});

describe("Selenium role locator", () => {
  it("supports implicit button roles and a visible text name", () => {
    const graph: Scenario = {
      ...base,
      nodes: base.nodes.map(node => node.type === "navigate"
        ? { id: "click", type: "click", label: "Click", position: node.position, config: { locator: { strategy: "role", role: "button", name: "Save" } } }
        : node),
      edges: base.edges.map(edge => ({
        ...edge,
        source: edge.source === "navigate" ? "click" : edge.source,
        target: edge.target === "navigate" ? "click" : edge.target,
      })),
    };
    const code = exportSeleniumTest(graph);
    expect(code).toContain("self::button");
    expect(code).toContain("@role='button'");
    expect(code).toContain("normalize-space(.)='Save'");
    const result = spawnSync(process.execPath, ["--check", "--input-type=module"], { input: code, encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
  });

  it("supports implicit link and checkbox roles", () => {
    for (const [role, xpathPart] of [["link", "self::a[@href]"], ["checkbox", "self::input[@type='checkbox']"]] as const) {
      const graph: Scenario = {
        ...base,
        nodes: base.nodes.map(node => node.type === "navigate"
          ? { id: "click", type: "click", label: "Click", position: node.position, config: { locator: { strategy: "role", role } } }
          : node),
        edges: base.edges.map(edge => ({
          ...edge,
          source: edge.source === "navigate" ? "click" : edge.source,
          target: edge.target === "navigate" ? "click" : edge.target,
        })),
      };
      expect(exportSeleniumTest(graph)).toContain(xpathPart);
    }
  });
});
