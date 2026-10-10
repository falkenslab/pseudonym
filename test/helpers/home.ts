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

/**
 * Runs a TypeScript file from the repo root in its own process, with PSEUDONYM_HOME set to `home` and only the
 * other PSEUDONYM_* variables in `env`: the person running the tests may have their own set.
 */
export function runScript(file: string, args: string[], home: string, input?: string | Buffer, env: Record<string, string> = {}): Promise<Result> {
  const inherited = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith("PSEUDONYM_")));
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", file, ...args], {
      env: { ...inherited, ...env, PSEUDONYM_HOME: home },
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
