import type { LocatorSpec, Scenario, ScenarioNode } from "../../schema/src/scenario";
import { validateGraph } from "../../schema/src/scenario";

function locator(spec: LocatorSpec): string {
  switch (spec.strategy) {
    case "css": return `By.css(${JSON.stringify(spec.value)})`;
    case "testId": return `By.xpath(${JSON.stringify("//*[@data-testid=" + xpathLiteral(spec.value) + "]")})`;
    case "text": {
      const match = "contains(normalize-space(.), " + xpathLiteral(spec.value) + ")";
      return `By.xpath(${JSON.stringify("//*[" + match + " and not(*[" + match + "])]")})`;
    }
    case "role": {
      const explicit = "@role=" + xpathLiteral(spec.role);
      const implicit: Record<string, string> = {
        button: "self::button or (self::input and (@type='button' or @type='submit' or @type='reset' or @type='image'))",
        link: "self::a[@href] or self::area[@href]",
        textbox: "self::textarea or (self::input and (not(@type) or @type='text' or @type='email' or @type='tel' or @type='url'))",
        searchbox: "self::input[@type='search']",
        combobox: "self::select[not(@multiple) and (not(@size) or number(@size) <= 1)]",
        listbox: "self::select[@multiple or (number(@size) > 1)]",
        checkbox: "self::input[@type='checkbox']",
        radio: "self::input[@type='radio']",
        heading: "self::h1 or self::h2 or self::h3 or self::h4 or self::h5 or self::h6",
        img: "self::img",
      };
      const rolePredicate = implicit[spec.role] ? "(" + explicit + " or (not(@role) and (" + implicit[spec.role] + ")))" : explicit;
      const name = spec.name === undefined ? undefined : xpathLiteral(spec.name);
      const namePredicate = name === undefined ? "" : " and (@aria-label=" + name
        + " or (not(@aria-label) and ("
        + "(@aria-labelledby and normalize-space(@aria-labelledby)=//*[@id and normalize-space(.)=" + name + "]/@id)"
        + " or (not(@aria-labelledby) and ("
        + "normalize-space(.)=" + name
        + " or (self::img and @alt=" + name + ")"
        + " or (self::input and ((@type=\'image\' and @alt=" + name + ") or @value=" + name + " or @title=" + name
        + " or ancestor::label[normalize-space(.)=" + name + "]"
        + " or @id=//label[normalize-space(.)=" + name + "]/@for))"
        + ")))))";
      return `By.xpath(${JSON.stringify("//*[" + rolePredicate + namePredicate + "]")})`;
    }
  }
}

function xpathLiteral(value: string): string {
  if (!value.includes("'")) return "'" + value + "'";
  if (!value.includes('"')) return '"' + value + '"';
  return "concat(" + value.split("'").map(part => "'" + part + "'").join(", \"'\", ") + ")";
}

function statement(node: ScenarioNode): string | null {
  switch (node.type) {
    case "start": case "end": case "condition": return null;
    case "navigate": return `await driver.get(${JSON.stringify(node.config.url)});`;
    case "click": return `await (await driver.findElement(${locator(node.config.locator)})).click();`;
    case "fill": return `{
      const element = await driver.findElement(${locator(node.config.locator)});
      await element.clear();
      await element.sendKeys(${JSON.stringify(node.config.value)});
    }`;
    case "wait": return `await driver.sleep(${node.config.durationMs});`;
    case "assertVisible": return `await driver.wait(until.elementIsVisible(await driver.wait(until.elementLocated(${locator(node.config.locator)}), timeoutMs)), timeoutMs);`;
    case "assertText": return `if (!(await (await driver.findElement(${locator(node.config.locator)})).getText()).includes(${JSON.stringify(node.config.expected)})) throw new Error("Text assertion failed");`;
  }
}

export function exportSeleniumTest(s: Scenario): string {
  const errors = validateGraph(s);
  if (errors.length) throw new Error(errors.join("; "));
  const byId = new Map(s.nodes.map(node => [node.id, node]));
  const lines: string[] = [];
  function render(id: string, indent: string, visited: Set<string>): void {
    if (visited.has(id)) return;
    const node = byId.get(id);
    if (!node) throw new Error("Unknown node: " + id);
    const nextVisited = new Set(visited);
    nextVisited.add(id);
    const line = statement(node);
    if (line) lines.push(indent + line);
    if (node.screenshot) {
      const file = "screenshots/" + node.id.replace(/[^a-zA-Z0-9_-]/g, "_") + ".png";
      lines.push(indent + `await fs.mkdir("screenshots", { recursive: true });`);
      lines.push(indent + `await fs.writeFile(${JSON.stringify(file)}, await driver.takeScreenshot(), "base64");`);
    }
    if (node.type === "condition") {
      const expression = node.config.check === "visible"
        ? `await driver.findElements(${locator(node.config.locator)}).then(async els => els.length > 0 && await els[0].isDisplayed())`
        : `await driver.findElements(${locator(node.config.locator)}).then(async els => els.length > 0 && (await els[0].getText()).includes(${JSON.stringify(node.config.expected ?? "")}))`;
      lines.push(indent + `if (${expression}) {`);
      const yes = s.edges.find(edge => edge.source === id && edge.sourceHandle === "true")!;
      const no = s.edges.find(edge => edge.source === id && edge.sourceHandle === "false")!;
      render(yes.target, indent + "  ", nextVisited);
      lines.push(indent + "} else {");
      render(no.target, indent + "  ", nextVisited);
      lines.push(indent + "}");
    } else {
      const edge = s.edges.find(item => item.source === id);
      if (edge) render(edge.target, indent, nextVisited);
    }
  }
  render(s.nodes.find(node => node.type === "start")!.id, "    ", new Set());
  const browser = s.settings.browser === "edge" ? "MicrosoftEdge" : "chrome";
  const options = s.settings.browser === "edge" ? "edge.Options" : "chrome.Options";
  const builderOptions = s.settings.browser === "edge" ? "setEdgeOptions" : "setChromeOptions";
  const headless = s.settings.headless ? "options.addArguments(\"--headless=new\");\n" : "";
  return `// Generated from .pflow. Requires: npm install selenium-webdriver
import { Builder, By, until } from "selenium-webdriver";
import * as chrome from "selenium-webdriver/chrome.js";
import * as edge from "selenium-webdriver/edge.js";
import * as fs from "node:fs/promises";

const timeoutMs = ${s.settings.timeoutMs};
const options = new ${options}();
${headless}const driver = await new Builder().forBrowser(${JSON.stringify(browser)}).${builderOptions}(options).build();
try {
  await driver.manage().setTimeouts({ implicit: timeoutMs });
  await driver.manage().window().setRect({ width: ${s.settings.viewport.width}, height: ${s.settings.viewport.height} });
${lines.join("\n")}
} finally {
  await driver.quit();
}
`;
}
