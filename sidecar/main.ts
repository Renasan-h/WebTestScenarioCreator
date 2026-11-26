import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { scenarioSchema } from "../packages/schema/src/scenario";
import { executeScenario } from "../packages/engine/src/execute";
import { openBrowser, runAction } from "../packages/playwright-adapter/src/browser";
import { attachRecorder } from "../packages/playwright-adapter/src/record";

async function main() {
  const input = process.argv.includes("--stdin") ? createInterface({ input: process.stdin, crlfDelay: Infinity }) : null;
  const lines = input?.[Symbol.asyncIterator]();
  const cancellation = new AbortController();
  const gate: { resume?: () => void } = {};
  const debug = process.argv.includes("--debug");
  const record = process.argv.includes("--record");
  let stepMode = debug;
  let finishing = false;
  let session: Awaited<ReturnType<typeof openBrowser>> | undefined;
  let closing: Promise<void> | undefined;
  const closeBrowser = () => {
    if (session) return closing ??= session.browser.close();
    return Promise.resolve();
  };
  const stop = async () => {
    cancellation.abort();
    const release = gate.resume;
    gate.resume = undefined;
    release?.();
    await closeBrowser();
  };
  const reportControlError = (error: unknown) => { console.error(error); process.exitCode = 1; };
  const emit = (event: unknown) => process.stdout.write(JSON.stringify(event) + "\n");
  try {
    const raw = lines ? (await lines.next()).value ?? "" : await readFile(process.argv[2] ?? "", "utf8");
    const scenario = scenarioSchema.parse(JSON.parse(raw));
    if (lines) {
      void (async () => {
        try {
          for await (const line of { [Symbol.asyncIterator]: () => lines }) {
            if (line === "STOP") break;
            if (!record && (line === "STEP" || line === "CONTINUE")) {
              if (line === "CONTINUE") stepMode = false;
              const release = gate.resume;
              gate.resume = undefined;
              release?.();
            }
          }
        } catch (error) {
          if (!finishing) reportControlError(error);
        }
        if (!finishing) await stop();
      })().catch(reportControlError);
    }
    session = await openBrowser(scenario);
    const { browser, page } = session;
    if (cancellation.signal.aborted) {
      if (!record) await executeScenario(scenario, async () => {}, emit, undefined, undefined, cancellation.signal);
      return;
    }
    if (record) {
      process.on("SIGINT", () => { void stop().catch(reportControlError); });
      process.on("SIGTERM", () => { void stop().catch(reportControlError); });
      let detach: Awaited<ReturnType<typeof attachRecorder>> | undefined;
      try {
        detach = await attachRecorder(page, action => emit({ kind: "recorded-action", action }));
        if (cancellation.signal.aborted) return;
        const firstUrl = scenario.nodes.find(n => n.type === "navigate");
        await page.goto(firstUrl?.type === "navigate" ? firstUrl.config.url : "about:blank");
        if (cancellation.signal.aborted) return;
        emit({ kind: "recorder-ready" });
        await new Promise<void>(resolve => {
          if (!browser.isConnected() || page.isClosed()) { resolve(); return; }
          browser.once("disconnected", () => resolve());
          page.once("close", () => resolve());
          if (!browser.isConnected() || page.isClosed()) resolve();
        });
      } catch (error) {
        if (!cancellation.signal.aborted) throw error;
      } finally {
        if (detach) {
          try { await detach(); } catch (error) { if (!cancellation.signal.aborted) throw error; }
        }
      }
    } else {
      const beforeNode = debug ? async (_node: unknown, notifyPaused: () => void) => {
        if (!stepMode || cancellation.signal.aborted) return;
        notifyPaused();
        await new Promise<void>(resolve => { gate.resume = resolve; });
      } : undefined;
      await executeScenario(scenario, n => runAction(page, n), emit, undefined, beforeNode, cancellation.signal);
    }
  } finally {
    finishing = true;
    input?.close();
    if (closing || session?.browser.isConnected()) await closeBrowser();
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
