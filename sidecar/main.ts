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
  let closing: Promise<void> | undefined;
  const closeBrowser = () => closing ??= browser.close();
  let finishing = false;
  const reportControlError = (error: unknown) => { console.error(error); process.exitCode = 1; };
  try {
    if (process.argv.includes("--record")) {
      const detach = await attachRecorder(page, action => process.stdout.write(JSON.stringify({ kind: "recorded-action", action }) + "\n"));
      process.on("SIGINT", () => { void closeBrowser().catch(reportControlError); });
      process.on("SIGTERM", () => { void closeBrowser().catch(reportControlError); });
      const firstUrl = scenario.nodes.find(n => n.type === "navigate");
      if (firstUrl?.type === "navigate") await page.goto(firstUrl.config.url);
      else await page.goto("about:blank");
      process.stdout.write(JSON.stringify({ kind: "recorder-ready" }) + "\n");
      if (lines) {
        void (async () => {
          for await (const line of { [Symbol.asyncIterator]: () => lines }) {
            if (line === "STOP") break;
          }
          if (!finishing) await closeBrowser();
        })().catch(reportControlError);
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
            if (line === "STOP") break;
            if (line === "STEP" || line === "CONTINUE") {
              if (line === "CONTINUE") stepMode = false;
              const release = gate.resume;
              gate.resume = undefined;
              release?.();
            }
          }
          if (!finishing) {
            cancellation.abort();
            gate.resume?.();
            gate.resume = undefined;
            await closeBrowser();
          }
        })().catch(reportControlError);
      }
      await executeScenario(scenario, n => runAction(page, n), e => process.stdout.write(JSON.stringify(e) + "\n"), undefined, beforeNode, cancellation.signal);
    }
  } finally {
    finishing = true;
    input?.close();
    if (closing || browser.isConnected()) await closeBrowser();
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
