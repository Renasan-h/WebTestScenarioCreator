import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runExportProcess } from "./helpers/run-export-process";

const options = { cwd: process.cwd(), timeout: 5000, maxBuffer: 1024 * 1024 };

describe("runExportProcess", () => {
  it("preserves stdout and stderr", async () => {
    const result = await runExportProcess(process.execPath, ["-e", "console.log('ok'); console.error('note')"], options);
    expect(result.stdout.trim()).toBe("ok");
    expect(result.stderr.trim()).toBe("note");
  });
  it("rejects a nonzero exit", async () => {
    await expect(runExportProcess(process.execPath, ["-e", "process.exit(7)"], options)).rejects.toMatchObject({ code: 7 });
  });
  it("rejects a timed out process", async () => {
    await expect(runExportProcess(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { ...options, timeout: 1000 })).rejects.toThrow("timed out");
  }, 15000);
});

it.skipIf(process.platform !== "win32")("terminates Windows child and grandchild processes on timeout", async () => {
  const directory = await mkdtemp(join(tmpdir(), "export-tree-"));
  const root = join(directory, "root.cjs");
  const worker = join(directory, "worker.cjs");
  const leaf = join(directory, "leaf.cjs");
  const childPid = join(directory, "child.pid");
  const leafPid = join(directory, "leaf.pid");
  const pids: number[] = [];
  const alive = (pid: number) => {
    try { process.kill(pid, 0); return true; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ESRCH") return false;
      throw error;
    }
  };
  try {
    await writeFile(leaf, "require('node:fs').writeFileSync(process.argv[2], String(process.pid)); setInterval(() => {}, 1000);");
    await writeFile(worker, "require('node:fs').writeFileSync(process.argv[2], String(process.pid)); require('node:child_process').spawn(process.execPath, [process.argv[3], process.argv[4]], {stdio:'ignore'}); setInterval(() => {}, 1000);");
    await writeFile(root, "require('node:child_process').spawn(process.execPath, process.argv.slice(2), {stdio:'ignore'}); setInterval(() => {}, 1000);");
    await expect(runExportProcess(process.execPath, [root, worker, childPid, leaf, leafPid], { ...options, cwd: directory, timeout: 5000 })).rejects.toThrow("timed out");
    for (const file of [childPid, leafPid]) {
      const pid = Number(await readFile(file, "utf8"));
      expect(Number.isSafeInteger(pid) && pid > 0).toBe(true);
      pids.push(pid);
    }
    const deadline = Date.now() + 3000;
    while (pids.some(alive) && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    expect(pids.map(alive)).toEqual([false, false]);
  } finally {
    // Clean up the test's own processes even when an assertion fails.
    for (const file of [leafPid, childPid]) {
      const value = await readFile(file, "utf8").catch(() => "");
      const pid = Number(value);
      if (Number.isSafeInteger(pid) && pid > 0 && alive(pid)) {
        try { process.kill(pid, "SIGKILL"); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error; }
      }
    }
    await rm(directory, { recursive: true, force: true });
  }
}, 25000);
