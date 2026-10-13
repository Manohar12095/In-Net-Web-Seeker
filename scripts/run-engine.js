/**
 * Smart engine launcher for In Net Web Seeker.
 * Powered by IN NET Creations · Created by S. Manohar
 *
 * Detects whether to run via backend/.venv/Scripts/python, uv, or system python.
 * Never uses shell: true to prevent space-in-path parsing bugs on Windows.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, join, delimiter } from "node:path";
import process from "node:process";

const rootDir = resolve(import.meta.dirname, "..");
const backendDir = join(rootDir, "backend");
const backendSrcDir = join(backendDir, "src");
const devDataDir = join(rootDir, ".dev-data");

let cmd = "";
let args = [];

const venvPythonWin = join(backendDir, ".venv", "Scripts", "python.exe");
const venvPythonPosix = join(backendDir, ".venv", "bin", "python");

if (process.platform === "win32" && existsSync(venvPythonWin)) {
  cmd = venvPythonWin;
  args = ["-m", "webseeker", "--dev", "--allow-private", "--port", "8765", "--data-dir", devDataDir];
} else if (process.platform !== "win32" && existsSync(venvPythonPosix)) {
  cmd = venvPythonPosix;
  args = ["-m", "webseeker", "--dev", "--allow-private", "--port", "8765", "--data-dir", devDataDir];
} else {
  cmd = "python";
  args = ["-m", "webseeker", "--dev", "--allow-private", "--port", "8765", "--data-dir", devDataDir];
}

console.log(`[*] Starting In Net Web Seeker Engine: ${cmd}`);

// Ensure backend/src is on PYTHONPATH so python -m webseeker is always found
const existingPythonPath = process.env.PYTHONPATH ? `${delimiter}${process.env.PYTHONPATH}` : "";
const pythonPath = `${backendSrcDir}${existingPythonPath}`;

const child = spawn(cmd, args, {
  cwd: backendDir,
  stdio: "inherit",
  shell: false, // CRITICAL: false prevents Windows cmd.exe space-in-path splitting errors
  env: {
    ...process.env,
    PYTHONPATH: pythonPath,
    WEBSEEKER_DATA: devDataDir,
    WEBSEEKER_TOKEN: "dev-token",
    WEBSEEKER_ALLOW_PRIVATE: "1",
  },
});

child.on("error", (err) => {
  console.error("[!] Failed to start engine:", err.message);
  process.exit(1);
});

child.on("exit", (code) => {
  if (code !== 0 && code !== null) {
    console.error(`[!] Engine exited with code ${code}`);
    process.exit(code);
  }
});
