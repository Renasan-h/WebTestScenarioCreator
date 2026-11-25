import { execFile, execFileSync } from "node:child_process";

type RunOptions = { cwd: string; timeout: number; maxBuffer: number };

// Keep the root alive until taskkill can enumerate its descendants.
export function runExportProcess(file: string, args: string[], options: RunOptions): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    let timeoutError: Error | undefined;
    const child = execFile(file, args, { cwd: options.cwd, maxBuffer: options.maxBuffer, encoding: "utf8", windowsHide: true }, (error, stdout, stderr) => {
      clearTimeout(timer);
      if (timeoutError) reject(timeoutError);
      else if (error) reject(error);
      else resolve({ stdout, stderr });
    });
    const timer = setTimeout(() => {
      timeoutError = new Error("Export process timed out after " + options.timeout + "ms: " + file);
      if (process.platform === "win32" && child.pid && child.exitCode === null && child.signalCode === null) {
        try {
          execFileSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { timeout: 10000, windowsHide: true, stdio: "ignore" });
        } catch (error) {
          timeoutError = new Error(timeoutError.message + "; process tree cleanup failed: " + String(error));
          child.kill("SIGKILL");
        }
      } else {
        child.kill("SIGKILL");
      }
      // Descendants may retain inherited pipes even after the root exits.
      child.stdout?.destroy();
      child.stderr?.destroy();
      reject(timeoutError);
    }, options.timeout);
  });
}
