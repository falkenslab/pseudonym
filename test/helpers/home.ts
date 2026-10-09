import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/** Points PSEUDONYM_HOME to a new temporary folder, so a test never touches the real key or directory. */
export function useTempHome(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "pseudonym-test-"));
  process.env.PSEUDONYM_HOME = dir;
  return dir;
}

export interface Result {
  status: number | null;
  stdout: string;
  stderr: string;
}

/** Runs a TypeScript file from the repo root in its own process, with PSEUDONYM_HOME set to `home`. */
export function runScript(file: string, args: string[], home: string, input?: string): Promise<Result> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", file, ...args], {
      env: { ...process.env, PSEUDONYM_HOME: home },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, stdout, stderr }));
    child.stdin.end(input ?? "");
  });
}
