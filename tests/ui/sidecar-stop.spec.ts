import { createServer } from "node:http";
import { spawn, execFileSync } from "node:child_process";
import { createInterface } from "node:readline";
import { test, expect } from "@playwright/test";

const scenario = {
  schemaVersion: "1.0",
  metadata: { id: "stop", name: "stop", createdAt: "", updatedAt: "" },
  settings: { browser: "chromium", headless: true, timeoutMs: 5000, viewport: { width: 800, height: 600 } },
  variables: {},
  nodes: [
    { id: "start", type: "start", label: "Start", position: { x: 0, y: 0 }, config: {} },
    { id: "end", type: "end", label: "End", position: { x: 0, y: 100 }, config: {} },
  ],
  edges: [{ id: "a", source: "start", target: "end" }],
};

for (const mode of ["STOP", "EOF"] as const) {
  for (const timing of ["startup", "paused"] as const) {
  test("sidecar debug stops on " + mode + " at " + timing, async () => {
    test.setTimeout(45000);
    const child = spawn(process.execPath, ["--import", "tsx", "sidecar/main.ts", "--stdin", "--debug"], {
      stdio: ["pipe", "pipe", "pipe"], windowsHide: true,
    });
    const events: Array<{ type?: string; nodeId?: string; status?: string }> = [];
    let stderr = "";
    let inputError: Error | undefined;
    child.stdin.on("error", error => { inputError = error; });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", chunk => { stderr += chunk; });
    const lines = createInterface({ input: child.stdout });
    lines.on("line", line => {
      try { events.push(JSON.parse(line)); } catch { /* non-event output */ }
    });
    const exited = new Promise<{ code: number | null; signal: string | null; error?: Error }>(resolve => {
      child.once("error", error => resolve({ code: null, signal: null, error }));
      child.once("close", (code, signal) => resolve({ code, signal }));
    });
    try {
      child.stdin.write(JSON.stringify(scenario) + "\n");
      if (timing === "paused") {
        await expect.poll(() => events.some(e => e.type === "node.paused" && e.nodeId === "start"), { timeout: 20000 }).toBe(true);
      }
      if (mode === "STOP") child.stdin.write("STOP\n");
      else child.stdin.end();
      await expect.poll(() => child.exitCode !== null || child.signalCode !== null, { timeout: 20000 }).toBe(true);
      const result = await exited;
      if (timing === "startup") expect(events.filter(e => e.type === "node.paused")).toEqual([]);
      expect(inputError).toBeUndefined();
      expect(result, stderr).toEqual({ code: 0, signal: null });
      expect(events.filter(e => e.type === "run.finished")).toEqual([expect.objectContaining({ status: "cancelled" })]);
      expect(events.filter(e => e.type === "node.started")).toEqual([]);
    } finally {
      if (child.pid && child.exitCode === null && child.signalCode === null) {
        if (process.platform === "win32") {
          try { execFileSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { timeout: 5000, stdio: "ignore", windowsHide: true }); }
          catch { child.kill("SIGKILL"); }
        } else child.kill("SIGKILL");
      }
      lines.close();
      child.stdin.destroy();
      child.stdout.destroy();
      child.stderr.destroy();
    }
  });
}
}

for (const mode of ["STOP", "EOF"] as const) {
  test("recording stops during initial navigation on " + mode, async () => {
    test.setTimeout(60000);
    let requested = false;
    const server = createServer((_req, res) => {
      requested = true;
      res.writeHead(200, { "Content-Type": "text/html" });
      res.write("<html><body>Loading");
      // Deliberately leave the response unfinished until cleanup.
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      server.close();
      throw new Error("Expected TCP server address");
    }
    const recording = {
      ...scenario,
      settings: { ...scenario.settings, timeoutMs: 60000 },
      nodes: [scenario.nodes[0], {
        id: "navigate", type: "navigate", label: "Navigate",
        position: { x: 0, y: 50 }, config: { url: "http://127.0.0.1:" + address.port + "/" },
      }, scenario.nodes[1]],
      edges: [{ id: "a", source: "start", target: "navigate" }, { id: "b", source: "navigate", target: "end" }],
    };
    const child = spawn(process.execPath, ["--import", "tsx", "sidecar/main.ts", "--stdin", "--record"], {
      stdio: ["pipe", "pipe", "pipe"], windowsHide: true,
    });
    let stderr = "";
    let inputError: Error | undefined;
    let result: { code: number | null; signal: string | null; error?: Error } | undefined;
    const events: Array<{ kind?: string }> = [];
    child.stdin.on("error", error => { inputError = error; });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.once("error", error => { result = { code: null, signal: null, error }; });
    child.once("close", (code, signal) => { result = { code, signal }; });
    const lines = createInterface({ input: child.stdout });
    lines.on("line", line => {
      try { events.push(JSON.parse(line)); } catch { /* non-event output */ }
    });
    try {
      child.stdin.write(JSON.stringify(recording) + "\n");
      await expect.poll(() => requested, { timeout: 25000 }).toBe(true);
      expect(events.some(e => e.kind === "recorder-ready")).toBe(false);
      if (mode === "STOP") child.stdin.write("STOP\n");
      else child.stdin.end();
      await expect.poll(() => result, { timeout: 15000 }).toBeDefined();
      expect(result, stderr).toEqual({ code: 0, signal: null });
      expect(inputError).toBeUndefined();
      expect(events.some(e => e.kind === "recorder-ready")).toBe(false);
    } finally {
      if (child.pid && child.exitCode === null && child.signalCode === null) {
        if (process.platform === "win32") {
          try { execFileSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { timeout: 5000, stdio: "ignore", windowsHide: true }); }
          catch { child.kill("SIGKILL"); }
        } else child.kill("SIGKILL");
      }
      lines.close();
      child.stdin.destroy();
      child.stdout.destroy();
      child.stderr.destroy();
      await new Promise<void>(resolve => {
        server.close(() => resolve());
        server.closeAllConnections();
      });
    }
  });
}
