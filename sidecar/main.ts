import { readFile } from "node:fs/promises";
import { scenarioSchema } from "../packages/schema/src/scenario";
import { executeScenario } from "../packages/engine/src/execute";
import { openBrowser, runAction } from "../packages/playwright-adapter/src/browser";

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
    await executeScenario(scenario, n => runAction(page, n), e => process.stdout.write(JSON.stringify(e) + "\n"));
  } finally {
    await browser.close();
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
