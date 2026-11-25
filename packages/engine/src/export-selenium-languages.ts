import { validateGraph, type Scenario, type LocatorSpec } from "../../schema/src/scenario";
import { locator, exportSeleniumTest } from "./export-selenium";

export function exportSeleniumLanguage(s: Scenario, language: "typescript" | "python" | "java" | "javascript"): string {
  if (language === "javascript") return exportSeleniumTest(s);
  if (language === "typescript") return "export {};\n" + exportSeleniumTest(s);
  const errors = validateGraph(s);
  if (errors.length) throw new Error(errors.join("; "));
  const py = language === "python";
  const q = JSON.stringify;
  const lines: string[] = [];
  const loc = (l: LocatorSpec) => {
    const expression = locator(l);
    if (py) return expression.replace(/^By.css\(/, "(By.CSS_SELECTOR, ").replace(/^By.xpath\(/, "(By.XPATH, ");
    return expression.replace(/^By.css\(/, "By.cssSelector(");
  };
  function render(id: string, indent: string) {
    const n = s.nodes.find(node => node.id === id)!;
    const timeout = (n.type === "click" || n.type === "fill") ? n.config.timeoutMs : undefined;
    const originalIndent = indent;
    const emit = (line: string) => lines.push(indent + line + (py ? "" : ";"));
    const find = (l: LocatorSpec) => "driver." + (py ? "find_element(*" : "findElement(") + loc(l) + ")";
    if (timeout !== undefined) {
      emit(py ? "driver.implicitly_wait(" + timeout + " / 1000)" : "driver.manage().timeouts().implicitlyWait(Duration.ofMillis(" + timeout + "))");
      lines.push(indent + (py ? "try:" : "try {"));
      indent += "    ";
    }
    switch (n.type) {
      case "navigate": emit("driver.get(" + q(n.config.url) + ")"); break;
      case "click": emit(find(n.config.locator) + ".click()"); break;
      case "fill":
        emit((py ? "element = " : "WebElement element_" + lines.length + " = ") + find(n.config.locator));
        const element = py ? "element" : "element_" + (lines.length - 1);
        emit(element + ".clear()");
        emit(element + (py ? ".send_keys(" : ".sendKeys(") + q(n.config.value) + ")"); break;
      case "wait": emit(py ? "time.sleep(" + n.config.durationMs + " / 1000)" : "Thread.sleep(" + n.config.durationMs + ")"); break;
      case "assertVisible": emit(py ? "WebDriverWait(driver, timeout).until(EC.visibility_of_element_located(" + loc(n.config.locator) + "))" : "new WebDriverWait(driver, timeout).until(ExpectedConditions.visibilityOfElementLocated(" + loc(n.config.locator) + "))"); break;
      case "assertText": emit(py ? "assert " + q(n.config.expected) + " in " + find(n.config.locator) + ".text" : "if (!" + find(n.config.locator) + ".getText().contains(" + q(n.config.expected) + ")) throw new AssertionError(\"Text assertion failed\")"); break;
    }
    if (timeout !== undefined) {
      indent = originalIndent;
      lines.push(indent + (py ? "finally:" : "} finally {"));
      indent += "    ";
      emit(py ? "driver.implicitly_wait(timeout)" : "driver.manage().timeouts().implicitlyWait(timeout)");
      indent = originalIndent;
      if (!py) lines.push(indent + "}");
    }
    if (n.screenshot) {
      const path = q("screenshots/" + n.id.replace(/[^a-zA-Z0-9_-]/g, "_") + ".png");
      emit(py ? "driver.save_screenshot(" + path + ")" : "Files.write(Paths.get(" + path + "), ((TakesScreenshot) driver).getScreenshotAs(OutputType.BYTES))");
    }
    if (n.type === "condition") {
      const expr = "matches(driver, " + loc(n.config.locator) + ", " + (n.config.check === "visible" ? (py ? "None" : "null") : q(n.config.expected ?? "")) + ")";
      lines.push(indent + (py ? "if " + expr + ":" : "if (" + expr + ") {"));
      for (const branch of ["true", "false"]) {
        if (branch === "false") lines.push(indent + (py ? "else:" : "} else {"));
        const before = lines.length;
        render(s.edges.find(e => e.source === id && e.sourceHandle === branch)!.target, indent + "    ");
        if (py && before === lines.length) lines.push(indent + "    pass");
      }
      if (!py) lines.push(indent + "}");
    } else {
      const edge = s.edges.find(e => e.source === id);
      if (edge) render(edge.target, indent);
    }
  }
  const { browser, headless, timeoutMs, viewport } = s.settings;
  const edge = browser === "edge";
  render(s.nodes.find(n => n.type === "start")!.id, "        ");
  if (py) return [
    "from selenium import webdriver", "from selenium.webdriver.common.by import By", "from selenium.webdriver.support.ui import WebDriverWait", "from selenium.webdriver.support import expected_conditions as EC", "from selenium.common.exceptions import StaleElementReferenceException", "from pathlib import Path", "import time", "",
    "def matches(driver, locator, expected):", "    try:", "        elements = driver.find_elements(*locator)", "        return bool(elements) and (elements[0].is_displayed() if expected is None else expected in elements[0].text)", "    except StaleElementReferenceException:", "        return False", "",
    "def test_scenario():", "    timeout = " + timeoutMs + " / 1000", "    options = webdriver." + (edge ? "EdgeOptions" : "ChromeOptions") + "()",
    ...(headless ? ['    options.add_argument("--headless=new")'] : []),
    "    driver = webdriver." + (edge ? "Edge" : "Chrome") + "(options=options)", "    try:", "        driver.implicitly_wait(timeout)", "        driver.set_page_load_timeout(timeout)", "        driver.set_window_size(" + viewport.width + ", " + viewport.height + ")", '        Path("screenshots").mkdir(exist_ok=True)', ...lines, "    finally:", "        driver.quit()", "", 'if __name__ == "__main__":', "    test_scenario()", "",
  ].join("\n");
  const name = edge ? "Edge" : "Chrome";
  return [
    "import org.openqa.selenium.*;", "import org.openqa.selenium.support.ui.*;", "import org.openqa.selenium." + name.toLowerCase() + ".*;", "import java.time.Duration;", "import java.nio.file.*;", "",
    "class ScenarioTest {", "    static boolean matches(WebDriver driver, By locator, String expected) {", "        try {", "            var elements = driver.findElements(locator);", "            return !elements.isEmpty() && (expected == null ? elements.get(0).isDisplayed() : elements.get(0).getText().contains(expected));", "        } catch (StaleElementReferenceException e) { return false; }", "    }",
    "    public static void main(String[] args) throws Exception {", "      Duration timeout = Duration.ofMillis(" + timeoutMs + ");", "      " + name + "Options options = new " + name + "Options();", ...(headless ? ['      options.addArguments("--headless=new");'] : []), "      WebDriver driver = new " + name + "Driver(options);", "      try {", "        driver.manage().timeouts().implicitlyWait(timeout);", "        driver.manage().timeouts().pageLoadTimeout(timeout);", "        driver.manage().window().setSize(new Dimension(" + viewport.width + ", " + viewport.height + "));", '        Files.createDirectories(Paths.get("screenshots"));', ...lines, "      } finally { driver.quit(); }", "    }", "}", "",
  ].join("\n");
}
