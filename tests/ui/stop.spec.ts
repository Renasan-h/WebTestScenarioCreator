import { test, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { Scenario } from "../../packages/schema/src/scenario";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

for (const mode of ["ready", "early", "duplicate"] as const) {
test(`STOP closes the recording browser (${mode})`, async () => {
  const scenario: Scenario = {
    schemaVersion: "1.0",
    metadata: { id: "stop-test", name: "Stop test", createdAt: "", updatedAt: "" },
    settings: { browser: "chromium", headless: true, timeoutMs: 5000, viewport: { width: 800, height: 600 } },
    variables: {},
    nodes: [
      { id: "start", type: "start", label: "Start", position: { x: 0, y: 0 }, config: {} },
      { id: "end", type: "end", label: "End", position: { x: 0, y: 100 }, config: {} },
    ],
    edges: [],
  };
  const child = spawn(process.execPath, ["--import", "tsx", "sidecar/main.ts", "--stdin", "--record"], {
    cwd: root,
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, SCENARIO_CHROMIUM_PATH: process.env.SCENARIO_CHROMIUM_PATH },
  });
  let stderr = "";
  child.stderr.on("data", chunk => { stderr += String(chunk); });
  const exit = once(child, "exit");
  try {
    child.stdin.write(JSON.stringify(scenario) + "\n");
    if (mode === "early") child.stdin.write("STOP\n");
    // Wait for the recorder to finish browser initialization before stopping it.
    const output = createInterface({ input: child.stdout });
    await Promise.race([
      (async () => {
        for await (const line of output) {
          if (JSON.parse(line).kind === "recorder-ready") return;
        }
        throw new Error("Recorder exited before ready: " + stderr);
      })(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Recorder not ready: " + stderr)), 15000)),
    ]);
    if (mode !== "early") child.stdin.write("STOP\n");
    if (mode === "duplicate") child.stdin.write("STOP\n");
    const [code, signal] = await Promise.race([
      exit,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Runner did not exit after STOP: " + stderr)), 15000)),
    ]);
    expect(signal).toBeNull();
    expect(code, stderr).toBe(0);
  } finally {
    if (child.exitCode === null) child.kill();
  }
});
}
