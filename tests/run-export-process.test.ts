import { describe, expect, it } from "vitest";
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
