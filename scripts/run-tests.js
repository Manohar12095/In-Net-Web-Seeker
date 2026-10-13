/**
 * Test runner for In Net Web Seeker backend.
 * Powered by IN NET Creations · Created by S. Manohar
 *
 * Runs pytest using the active venv or system python.
 * Avoids path-with-brackets issues on Windows.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, join, delimiter } from "node:path";
import process from "node:process";

const rootDir = resolve(".");
const backendDir = join(rootDir, "backend");
const backendSrcDir = join(backendDir, "src");

let cmd = "";
const venvPythonWin = join(backendDir, ".venv", "Scripts", "python.exe");
const venvPythonPosix = join(backendDir, ".venv", "bin", "python");

if (process.platform === "win32" && existsSync(venvPythonWin)) {
  cmd = venvPythonWin;
} else if (process.platform !== "win32" && existsSync(venvPythonPosix)) {
  cmd = venvPythonPosix;
} else {
  cmd = "python";
}

const existingPythonPath = process.env.PYTHONPATH ? `${delimiter}${process.env.PYTHONPATH}` : "";
const pythonPath = `${backendSrcDir}${existingPythonPath}`;

const child = spawn(cmd, ["-m", "pytest", "tests/", "-v"], {
  cwd: backendDir,
  stdio: "inherit",
  shell: false,
  env: {
    ...process.env,
    PYTHONPATH: pythonPath,
  },
});

child.on("error", (err) => {
  console.error("[!] Failed to run pytest:", err.message);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
