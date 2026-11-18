import { readFile } from "node:fs/promises";
import { scenarioSchema } from "../packages/schema/src/scenario";
import { executeScenario } from "../packages/engine/src/execute";
import { openBrowser, runAction } from "../packages/playwright-adapter/src/browser";
import { attachRecorder } from "../packages/playwright-adapter/src/record";

async function main() {
  const raw = process.argv.includes("--stdin")
    ? await new Promise<string>((resolve, reject) => {
        let data = "";
        process.stdin.setEncoding("utf8");
        process.stdin.on("data", chunk => data += chunk);
        process.stdin.on("end", () => resolve(data));
        process.stdin.on("error", reject);
      })
    : await readFile(process.argv[2] ?? "", "utf8");
  const scenario = scenarioSchema.parse(JSON.parse(raw));
  const { browser, page } = await openBrowser(scenario);
  try {
    if (process.argv.includes("--record")) {
      const detach = await attachRecorder(page, action => process.stdout.write(JSON.stringify({ kind: "recorded-action", action }) + "\n"));
      const firstUrl = scenario.nodes.find(n => n.type === "navigate");
      if (firstUrl?.type === "navigate") await page.goto(firstUrl.config.url);
      else await page.goto("about:blank");
      await new Promise<void>(resolve => { browser.on("disconnected", () => resolve()); page.on("close", () => resolve()); });
      await detach();
    } else {
      await executeScenario(scenario, n => runAction(page, n), e => process.stdout.write(JSON.stringify(e) + "\n"));
    }
  } finally {
    await browser.close();
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
