// engineBridge.js
// Spawns the compiled C++ "Core Analytics Engine" as a short-lived child
// process per request: write one JSON document to its stdin, read one JSON
// document back from its stdout, then let the process exit. This is the
// "Microservice Approach (Standard I/O / Pipes)" described in the project
// brief -- no native addon, no persistent socket, just a clean process
// boundary between Node.js and C++.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENGINE_PATH = process.env.ENGINE_PATH
  ? path.resolve(process.cwd(), process.env.ENGINE_PATH)
  : path.resolve(__dirname, "..", "..", "cpp-engine", "engine");

const ENGINE_TIMEOUT_MS = 5000;

/**
 * Runs the C++ engine with the given action ("optimize" | "analytics") and
 * input payload (a plain JS object that will be sent as JSON).
 * Resolves with the parsed JSON the engine wrote to stdout.
 */
export function runEngine(action, payload) {
  return new Promise((resolve, reject) => {
    const child = spawn(ENGINE_PATH, [action], { stdio: ["pipe", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
      reject(new Error(`Engine timed out after ${ENGINE_TIMEOUT_MS}ms`));
    }, ENGINE_TIMEOUT_MS);

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(
        new Error(
          `Failed to start C++ engine at "${ENGINE_PATH}". ` +
            `Did you build it with "cd cpp-engine && make"? Original error: ${err.message}`
        )
      );
    });

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    child.on("close", (code) => {
      if (timedOut) return; // already rejected
      clearTimeout(timer);

      if (code !== 0 && !stdout.trim()) {
        reject(new Error(`Engine exited with code ${code}. stderr: ${stderr}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(parsed);
      } catch (err) {
        reject(new Error(`Engine returned invalid JSON: ${stdout}\nstderr: ${stderr}`));
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}
