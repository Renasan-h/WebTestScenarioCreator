import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { scenarioSchema } from "../packages/schema/src/scenario";
import { executeScenario } from "../packages/engine/src/execute";
import { openBrowser, runAction } from "../packages/playwright-adapter/src/browser";
import { attachRecorder } from "../packages/playwright-adapter/src/record";

async function main() {
  const input = process.argv.includes("--stdin") ? createInterface({ input: process.stdin, crlfDelay: Infinity }) : null;
  const lines = input?.[Symbol.asyncIterator]();
  const raw = lines
    ? (await lines.next()).value ?? ""
    : await readFile(process.argv[2] ?? "", "utf8");
  const scenario = scenarioSchema.parse(JSON.parse(raw));
  const { browser, page } = await openBrowser(scenario);
  try {
    if (process.argv.includes("--record")) {
      const detach = await attachRecorder(page, action => process.stdout.write(JSON.stringify({ kind: "recorded-action", action }) + "\n"));
      process.on("SIGINT", () => { void browser.close(); });
      process.on("SIGTERM", () => { void browser.close(); });
      const firstUrl = scenario.nodes.find(n => n.type === "navigate");
      if (firstUrl?.type === "navigate") await page.goto(firstUrl.config.url);
      else await page.goto("about:blank");
      process.stdout.write(JSON.stringify({ kind: "recorder-ready" }) + "\n");
      if (lines) {
        void (async () => {
          for await (const line of { [Symbol.asyncIterator]: () => lines }) {
            if (line === "STOP") { await browser.close(); break; }
          }
        })();
      }
      try {
        await new Promise<void>(resolve => {
          if (!browser.isConnected() || page.isClosed()) { resolve(); return; }
          browser.once("disconnected", () => resolve());
          page.once("close", () => resolve());
          if (!browser.isConnected() || page.isClosed()) resolve();
        });
      } finally {
        await detach();
      }
    } else {
      const debug = process.argv.includes("--debug");
      const gate: { resume?: () => void } = {};
      const cancellation = new AbortController();
      let stepMode = debug;
      const beforeNode = debug ? async (_node: unknown, notifyPaused: () => void) => {
        if (!stepMode) return;
        notifyPaused();
        await new Promise<void>(resolve => { gate.resume = resolve; });
      } : undefined;
      if (lines) {
        void (async () => {
          for await (const line of { [Symbol.asyncIterator]: () => lines }) {
            if (line === "STOP") { cancellation.abort(); gate.resume?.(); gate.resume = undefined; await browser.close(); break; }
            if (line === "STEP" || line === "CONTINUE") {
              if (line === "CONTINUE") stepMode = false;
              const release = gate.resume;
              gate.resume = undefined;
              release?.();
            }
          }
        })();
      }
      await executeScenario(scenario, n => runAction(page, n), e => process.stdout.write(JSON.stringify(e) + "\n"), undefined, beforeNode, cancellation.signal);
    }
  } finally {
    input?.close();
    if (browser.isConnected()) await browser.close();
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
