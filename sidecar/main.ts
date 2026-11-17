import { readFile } from "node:fs/promises";
import { scenarioSchema } from "../packages/schema/src/scenario";
import { executeScenario } from "../packages/engine/src/execute";
import { openBrowser, runAction } from "../packages/playwright-adapter/src/browser";

async function main() {
  const path = process.argv[2];
  if (!path) throw new Error("Usage: pnpm runner <scenario.pflow>");
  const scenario = scenarioSchema.parse(JSON.parse(await readFile(path, "utf8")));
  const { browser, page } = await openBrowser(scenario);
  try {
    await executeScenario(scenario, n => runAction(page, n), e => process.stdout.write(JSON.stringify(e) + "\n"));
  } finally {
    await browser.close();
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
