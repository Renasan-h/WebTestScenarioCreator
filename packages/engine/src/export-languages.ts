import { validateGraph, type Scenario, type LocatorSpec, type ScenarioNode } from "../../schema/src/scenario";

export type ExportLanguage = "python" | "java";
export function exportPlaywrightLanguage(s: Scenario, language: ExportLanguage): string {
  const errors = validateGraph(s);
  if (errors.length) throw new Error(errors.join("; "));
  const py = language === "python";
  const q = JSON.stringify;
  const lines: string[] = [];
  const loc = (l: LocatorSpec): string => {
    if (l.strategy === "role") {
      if (py) return "page.get_by_role(" + q(l.role) + (l.name === undefined ? "" : ", name=" + q(l.name)) + ")";
      return "page.getByRole(AriaRole." + l.role.toUpperCase() + (l.name === undefined ? "" : ", new Page.GetByRoleOptions().setName(" + q(l.name) + ")") + ")";
    }
    const method = l.strategy === "css" ? "locator" : l.strategy === "text" ? (py ? "get_by_text" : "getByText") : (py ? "get_by_test_id" : "getByTestId");
    return "page." + method + "(" + q(l.value) + ")";
  };
  const emit = (indent: string, line: string) => lines.push(indent + line + (py ? "" : ";"));
  function render(id: string, indent: string): void {
    const n = s.nodes.find(node => node.id === id)!;
    const action = (node: ScenarioNode) => {
      switch (node.type) {
        case "navigate": emit(indent, "page." + (py ? "goto" : "navigate") + "(" + q(node.config.url) + ")"); break;
        case "click": case "fill": {
          const args = node.type === "fill" ? [q(node.config.value)] : [];
          if (node.config.timeoutMs !== undefined) args.push(py ? "timeout=" + node.config.timeoutMs : "new Locator." + (node.type === "click" ? "Click" : "Fill") + "Options().setTimeout(" + node.config.timeoutMs + ")");
          emit(indent, loc(node.config.locator) + "." + node.type + "(" + args.join(", ") + ")"); break;
        }
        case "wait": emit(indent, "page." + (py ? "wait_for_timeout" : "waitForTimeout") + "(" + node.config.durationMs + ")"); break;
        case "assertVisible": emit(indent, loc(node.config.locator) + (py ? '.wait_for(state="visible")' : ".waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.VISIBLE))")); break;
        case "assertText": {
          const l = loc(node.config.locator);
          emit(indent, py ? "assert " + q(node.config.expected) + " in " + l + ".inner_text()" : "if (!" + l + ".innerText().contains(" + q(node.config.expected) + ")) throw new AssertionError(\"Text assertion failed\")"); break;
        }
      }
    };
    action(n);
    if (n.screenshot) {
      const path = q("screenshots/" + n.id.replace(/[^a-zA-Z0-9_-]/g, "_") + ".png");
      emit(indent, py ? "page.screenshot(path=" + path + ", full_page=True)" : "page.screenshot(new Page.ScreenshotOptions().setPath(Paths.get(" + path + ")).setFullPage(true))");
    }
    if (n.type === "condition") {
      const l = loc(n.config.locator);
      const expr = n.config.check === "visible" ? l + (py ? ".is_visible()" : ".isVisible()") : "containsText(" + l + ", " + q(n.config.expected ?? "") + ")";
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
  const { browser, headless, viewport, timeoutMs } = s.settings;
  render(s.nodes.find(n => n.type === "start")!.id, "        ");
  if (py) return [
    "from pathlib import Path", "from playwright.sync_api import sync_playwright, Error", "",
    "def containsText(locator, expected):", "    try:", "        return expected in (locator.text_content() or \"\")", "    except Error:", "        return False", "",
    "def test_scenario():", "    with sync_playwright() as p:",
    "        browser = p.chromium.launch(headless=" + (headless ? "True" : "False") + (browser === "edge" ? ', channel="msedge"' : "") + ")",
    "        page = browser.new_page(viewport=" + q(viewport) + ")", "        page.set_default_timeout(" + timeoutMs + ")", '        Path("screenshots").mkdir(exist_ok=True)', ...lines, "", 'if __name__ == "__main__":', "    test_scenario()", "",
  ].join("\n");
  return [
    "import com.microsoft.playwright.*;", "import com.microsoft.playwright.options.*;", "import java.nio.file.*;", "",
    "class ScenarioTest {", "    static boolean containsText(Locator locator, String expected) {", "        try { String text = locator.textContent(); return text != null && text.contains(expected); }", "        catch (PlaywrightException e) { return false; }", "    }",
    "    public static void main(String[] args) throws Exception {", "      try (Playwright p = Playwright.create()) {",
    "        Browser browser = p.chromium().launch(new BrowserType.LaunchOptions().setHeadless(" + headless + ")" + (browser === "edge" ? '.setChannel("msedge")' : "") + ");",
    "        Page page = browser.newPage(new Browser.NewPageOptions().setViewportSize(" + viewport.width + ", " + viewport.height + "));",
    "        page.setDefaultTimeout(" + timeoutMs + ");", '        Files.createDirectories(Paths.get("screenshots"));', ...lines, "        browser.close();", "      }", "    }", "}", "",
  ].join("\n");
}
