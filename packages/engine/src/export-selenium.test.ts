import ts from "typescript";
import { exportPlaywrightTest } from "./export";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import type { Scenario } from "../../schema/src/scenario";
import { exportSeleniumTest } from "./export-selenium";
import { exportSeleniumLanguage } from "./export-selenium-languages";
import { exportPlaywrightLanguage } from "./export-languages";

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
    expect(code).toContain('await waitVisible(driver, By.css("#result"), timeoutMs)');
    expect(code).toContain("await driver.wait(async () => matches(driver, locator, null), timeoutMs)");
    expect(code).toContain("setTimeouts({ implicit: 0 })");
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
    expect(code).toContain("@type='image'");
    expect(code).toContain("@role='button'");
    expect(code).toContain("not(@role)");
    expect(code).toContain("normalize-space(.)='Save'");
    expect(code).toContain("@value='Save'");
    expect(code).toContain("(@type='image' and @alt='Save')");
    expect(code).toContain("(self::img and @alt='Save')");
    expect(code).toContain("normalize-space(@aria-labelledby)=//*[@id and normalize-space(.)='Save']/@id");
    expect(code).toContain("not(@aria-label)");
    expect(code).toContain("not(@aria-labelledby)");
    // XPath括弧の崩れを検出するため、生成文字列の括弧数を検証する。
    const xpath = JSON.parse(code.match(/By\.xpath\(("(?:\\.|[^"\\])*")\)/)?.[1] ?? "null") as string | null;
    expect(xpath).not.toBeNull();
    // XPath文字列リテラル内の括弧は構文上の括弧ではない。
    let depth = 0;
    let quote: "'" | '"' | null = null;
    for (const char of xpath ?? "") {
      if (quote !== null) {
        if (char === quote) quote = null;
      } else if (char === "'" || char === '"') {
        quote = char;
      } else if (char === "(") {
        depth++;
      } else if (char === ")") {
        depth--;
        expect(depth).toBeGreaterThanOrEqual(0);
      }
    }
    expect(quote).toBeNull();
    expect(depth).toBe(0);
    expect(code).toContain("ancestor::label[normalize-space(.)='Save']");
    expect(code).toContain("@id=//label[normalize-space(.)='Save']/@for");
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


describe("Selenium named role XPath validation", () => {
  it("keeps named role XPath parentheses balanced for implicit and explicit roles", () => {
    for (const role of ["button", "link", "textbox", "searchbox", "combobox", "listbox", "checkbox", "radio", "heading", "img", "dialog"]) {
      const graph: Scenario = {
        ...base,
        nodes: base.nodes.map(node => node.type === "navigate"
          ? { id: "click", type: "click", label: "Click", position: node.position, config: { locator: { strategy: "role", role, name: "Save (draft)" } } }
          : node),
        edges: base.edges.map(edge => ({
          ...edge,
          source: edge.source === "navigate" ? "click" : edge.source,
          target: edge.target === "navigate" ? "click" : edge.target,
        })),
      };
      const code = exportSeleniumTest(graph);
      const xpath = JSON.parse(code.match(/By\.xpath\(("(?:\\.|[^"\\])*")\)/)?.[1] ?? "null") as string | null;
      expect(xpath).not.toBeNull();
      let depth = 0;
      let quote: "'" | '"' | null = null;
      for (const char of xpath ?? "") {
        if (quote !== null) {
          if (char === quote) quote = null;
        } else if (char === "'" || char === '"') {
          quote = char;
        } else if (char === "(") {
          depth++;
        } else if (char === ")") {
          depth--;
          expect(depth, role).toBeGreaterThanOrEqual(0);
        }
      }
      expect(quote, role).toBeNull();
      expect(depth, role).toBe(0);
    }
  });
});

describe("Selenium searchbox implicit role", () => {
  it("maps search inputs to searchbox without treating them as textboxes", () => {
    const makeGraph = (role: string): Scenario => ({
      ...base,
      nodes: base.nodes.map(node => node.type === "navigate"
        ? { id: "click", type: "click", label: "Click", position: node.position, config: { locator: { strategy: "role", role } } }
        : node),
      edges: base.edges.map(edge => ({
        ...edge,
        source: edge.source === "navigate" ? "click" : edge.source,
        target: edge.target === "navigate" ? "click" : edge.target,
      })),
    });
    const searchbox = exportSeleniumTest(makeGraph("searchbox"));
    const textbox = exportSeleniumTest(makeGraph("textbox"));
    expect(searchbox).toContain("self::input[@type='search']");
    expect(textbox).not.toContain("@type='search'");
  });
});

describe("Selenium select implicit roles", () => {
  it("exports combobox and listbox predicates for select elements", () => {
    const graphFor = (role: string): Scenario => ({
      ...base,
      nodes: base.nodes.map(node => node.type === "navigate"
        ? { id: "click", type: "click", label: "Click", position: node.position, config: { locator: { strategy: "role", role } } }
        : node),
      edges: base.edges.map(edge => ({
        ...edge,
        source: edge.source === "navigate" ? "click" : edge.source,
        target: edge.target === "navigate" ? "click" : edge.target,
      })),
    });
    expect(exportSeleniumTest(graphFor("combobox"))).toContain("self::select[not(@multiple) and (not(@size) or number(@size) <= 1)]");
    expect(exportSeleniumTest(graphFor("listbox"))).toContain("self::select[@multiple or (number(@size) > 1)]");
  });
});

describe("Selenium image implicit role", () => {
  it("exports an img role with an alt-based accessible name", () => {
    const graph: Scenario = {
      ...base,
      nodes: base.nodes.map(node => node.type === "navigate"
        ? { id: "click", type: "click", label: "Click", position: node.position, config: { locator: { strategy: "role", role: "img", name: "Logo" } } }
        : node),
      edges: base.edges.map(edge => ({
        ...edge,
        source: edge.source === "navigate" ? "click" : edge.source,
        target: edge.target === "navigate" ? "click" : edge.target,
      })),
    };
    const code = exportSeleniumTest(graph);
    expect(code).toContain("self::img");
    expect(code).toContain("(self::img and @alt='Logo')");
  });
});

describe("Selenium role name escaping", () => {
  it("preserves names containing both quote characters", () => {
    const name = `Bob's "Save (draft)" button`;
    const graph: Scenario = {
      ...base,
      nodes: base.nodes.map(node => node.type === "navigate"
        ? { id: "click", type: "click", label: "Click", position: node.position, config: { locator: { strategy: "role", role: "button", name } } }
        : node),
      edges: base.edges.map(edge => ({
        ...edge,
        source: edge.source === "navigate" ? "click" : edge.source,
        target: edge.target === "navigate" ? "click" : edge.target,
      })),
    };
    const code = exportSeleniumTest(graph);
    const xpath = JSON.parse(code.match(/By\.xpath\(("(?:\\.|[^"\\])*")\)/)?.[1] ?? "null") as string | null;
    expect(xpath).not.toBeNull();
    expect(xpath).toContain(`concat('Bob', "'", 's "Save (draft)" button')`);
    const result = spawnSync(process.execPath, ["--check", "--input-type=module"], { input: code, encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
  });
});


describe("multi-language exports", () => {
  const graph: Scenario = {
    ...base,
    settings: { ...base.settings, browser: "edge", headless: true },
    nodes: [
      base.nodes[0], base.nodes[1],
      { id: "fill", type: "fill", label: "Fill", position: { x: 0, y: 150 }, config: { locator: { strategy: "testId", value: "input" }, value: "日本語\"\\", timeoutMs: 800 }, screenshot: true },
      { id: "branch", type: "condition", label: "Branch", position: { x: 0, y: 180 }, config: { locator: { strategy: "css", value: "#status" }, check: "visible" } },
      base.nodes[2],
    ],
    edges: [
      base.edges[0], { id: "f", source: "navigate", target: "fill" },
      { id: "g", source: "fill", target: "branch" },
      { id: "yes", source: "branch", target: "end", sourceHandle: "true" },
      { id: "no", source: "branch", target: "end", sourceHandle: "false" },
    ],
  };
  it.each(["python", "java"] as const)("generates Playwright and Selenium %s", language => {
    const pw = exportPlaywrightLanguage(graph, language);
    const se = exportSeleniumLanguage(graph, language);
    for (const code of [pw, se]) {
      expect(code).toContain("https://example.com");
      expect(code).toContain("日本語");
      expect(code).toContain("screenshots/fill.png");
      expect(code).toContain(language === "python" ? "else:" : "} else {");
    }
    expect(pw).toContain("msedge");
    expect(se).toContain("EdgeOptions");
    expect(se).toContain(language === "python" ? "element.clear()" : "WebElement element_");
    if (language === "python") {
      expect(pw).toContain("        else:\n            pass");
      expect(se).toContain("        else:\n            pass");
    }
  });
  it.each([["Playwright", exportPlaywrightTest(graph)], ["Selenium", exportSeleniumLanguage(graph, "typescript")]])("checks %s TypeScript syntax", (_name, code) => {
    const result = ts.transpileModule(code, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
      reportDiagnostics: true,
    });
    expect(result.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error) ?? []).toEqual([]);
  });
  const python = [process.platform === "win32" ? "py" : "python3", "python"].find(command =>
    spawnSync(command, ["--version"], { encoding: "utf8" }).status === 0);
  it.skipIf(!python).each([["Playwright", exportPlaywrightLanguage(graph, "python")], ["Selenium", exportSeleniumLanguage(graph, "python")]])("checks %s Python syntax", (_name, code) => {
    const result = spawnSync(python!, ["-c", "import ast, sys; ast.parse(sys.stdin.buffer.read().decode('utf-8'))"], { input: code, encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
  });
  for (const [name, envKey, code] of [
    ["Playwright", "PLAYWRIGHT_JAVA_CLASSPATH", exportPlaywrightLanguage(graph, "java")],
    ["Selenium", "SELENIUM_JAVA_CLASSPATH", exportSeleniumLanguage(graph, "java")],
  ]) {
  const classpath = process.env[envKey];
  it.skipIf(!classpath)(`compiles ${name} Java`, () => {
    const directory = mkdtempSync(join(tmpdir(), "pflow-java-"));
    try {
      const source = join(directory, "ScenarioTest.java");
      writeFileSync(source, code, "utf8");
      const result = spawnSync("javac", ["-encoding", "UTF-8", "-cp", classpath!, "-d", directory, source], { encoding: "utf8", timeout: 60000 });
      expect(result.error).toBeUndefined();
      expect(result.status, result.stderr).toBe(0);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }, 70000);
  }
  it("restores the common implicit timeout after an individually configured fill", () => {
    for (const language of ["typescript", "javascript", "python", "java"] as const) {
      const code = exportSeleniumLanguage(graph, language);
      const override = language === "python" ? "driver.implicitly_wait(800 / 1000)" : language === "java" ? "implicitlyWait(Duration.ofMillis(800))" : "setTimeouts({ implicit: 800 })";
      const restore = language === "python" ? "driver.implicitly_wait(timeout)" : language === "java" ? "implicitlyWait(timeout)" : "setTimeouts({ implicit: timeoutMs })";
      const start = code.indexOf(override);
      expect(start).toBeGreaterThanOrEqual(0);
      const cleanup = code.indexOf("finally", start);
      expect(cleanup).toBeGreaterThan(start);
      expect(code.indexOf(restore, cleanup)).toBeGreaterThan(cleanup);
      expect(code.indexOf("screenshots/fill.png", cleanup)).toBeGreaterThan(code.indexOf(restore, cleanup));
    }
  });
  it("uses individual click timeouts and leaves the common timeout unchanged when unspecified", () => {
    const makeGraph = (timeoutMs?: number): Scenario => ({
      ...base,
      nodes: base.nodes.map(node => node.type === "navigate"
        ? { ...node, type: "click", config: { locator: { strategy: "css", value: "#submit" }, timeoutMs } }
        : node),
    });
    for (const language of ["typescript", "javascript", "python", "java"] as const) {
      const override = language === "python" ? "driver.implicitly_wait(750 / 1000)" : language === "java" ? "implicitlyWait(Duration.ofMillis(750))" : "setTimeouts({ implicit: 750 })";
      const restore = language === "python" ? "driver.implicitly_wait(timeout)" : language === "java" ? "implicitlyWait(timeout)" : "setTimeouts({ implicit: timeoutMs })";
      const individual = exportSeleniumLanguage(makeGraph(750), language);
      const common = exportSeleniumLanguage(makeGraph(), language);
      expect(individual).toContain(override);
      expect(individual.indexOf(".click()", individual.indexOf(override))).toBeGreaterThan(individual.indexOf(override));
      expect(individual.lastIndexOf(restore)).toBeGreaterThan(individual.indexOf(".click()"));
      expect(common).not.toContain(override);
      expect(common.split(restore)).toHaveLength(2);
      expect(common).toContain(".click()");
    }
  });
  it("retains the Selenium TypeScript and JavaScript export", () => {
    expect(exportSeleniumLanguage(graph, "typescript")).toContain(exportSeleniumTest(graph));
    expect(exportSeleniumLanguage(graph, "javascript")).toBe(exportSeleniumTest(graph));
  });
  it("rejects invalid graphs in all new exporters", () => {
    for (const language of ["python", "java"] as const) {
      expect(() => exportPlaywrightLanguage({ ...graph, edges: [] }, language)).toThrow();
      expect(() => exportSeleniumLanguage({ ...graph, edges: [] }, language)).toThrow();
    }
  });
});

describe("Selenium navigation timeout", () => {
  it("sets the common page load timeout before navigation in all four languages", () => {
    const scenario = { ...base, settings: { ...base.settings, timeoutMs: 4321 } };
    for (const language of ["javascript", "typescript", "python", "java"] as const) {
      const code = exportSeleniumLanguage(scenario, language);
      const setting = language === "python" ? "driver.set_page_load_timeout(timeout)" : language === "java" ? "pageLoadTimeout(timeout)" : "setTimeouts({ pageLoad: timeoutMs })";
      expect(code).toContain("4321");
      expect(code.indexOf(setting)).toBeGreaterThanOrEqual(0);
      expect(code.indexOf("driver.get(")).toBeGreaterThan(code.indexOf(setting));
    }
  });
});

describe("Selenium condition error handling", () => {
  it("returns false for missing or stale elements and propagates unrelated errors", async () => {
    const code = exportSeleniumTest(base);
    const helper = code.slice(code.indexOf("async function matches("), code.indexOf("const timeoutMs ="));
    class StaleElementReferenceError extends Error {}
    const matches = new Function("error", helper + "\nreturn matches;")({ StaleElementReferenceError });
    const driver = (elements: unknown[]) => ({ findElements: async () => elements });
    expect(await matches(driver([]), null, null)).toBe(false);
    expect(await matches(driver([{ isDisplayed: async () => true }]), null, null)).toBe(true);
    expect(await matches(driver([{ getText: async () => "日本語" }]), null, "日本")).toBe(true);
    const stale = async () => { throw new StaleElementReferenceError(); };
    expect(await matches(driver([{ isDisplayed: stale }]), null, null)).toBe(false);
    expect(await matches(driver([{ getText: stale }]), null, "日本")).toBe(false);
    const failure = new Error("driver disconnected");
    await expect(matches({ findElements: async () => { throw failure; } }, null, null)).rejects.toBe(failure);
  });
});

it("restores implicit waiting after visible assertion success or failure", async () => {
  const code = exportSeleniumTest(base);
  const helper = code.slice(code.indexOf("async function waitVisible("), code.indexOf("const timeoutMs ="));
  const waitVisible = new Function("error", helper + "\nreturn waitVisible;")({ StaleElementReferenceError: class extends Error {} });
  for (const fail of [false, true]) {
    const settings: number[] = [];
    const failure = new Error("timeout");
    const driver = {
      manage: () => ({ setTimeouts: async ({ implicit }: { implicit: number }) => { settings.push(implicit); } }),
      findElements: async () => [{ isDisplayed: async () => true }],
      wait: async (check: () => Promise<boolean>) => {
        expect(settings).toEqual([0]);
        expect(await check()).toBe(true);
        if (fail) throw failure;
      },
    };
    if (fail) await expect(waitVisible(driver, null, 500)).rejects.toBe(failure);
    else await waitVisible(driver, null, 500);
    expect(settings).toEqual([0, 500]);
  }
});
