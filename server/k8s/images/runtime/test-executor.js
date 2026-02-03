import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const WORKSPACE = process.env.WORKSPACE || "/workspace";
const INTERNAL_TEST = process.env.INTERNAL_TEST || "/internal-test";

console.log = () => {};
console.error = () => {};
console.warn = () => {};

const arg = process.argv.find(a => a.startsWith("--checkpoint="));
if (!arg) writeAndExit({
  checkpoint: -1,
  status: "EXECUTOR_ERROR",
  error: { message: "Checkpoint argument missing" }
});

const checkpoint = Number(arg.split("=")[1]);
if (!Number.isInteger(checkpoint) || checkpoint <= 0) {
  writeAndExit({
    checkpoint: -1,
    status: "EXECUTOR_ERROR",
    error: { message: "Invalid checkpoint value" }
  });
}

const testFile = path.resolve(
  INTERNAL_TEST,
  `checkpoint${checkpoint}.test.js`
);

if (!fs.existsSync(testFile)) {
  writeAndExit({
    checkpoint,
    status: "EXECUTOR_ERROR",
    error: { message: `Test file not found for checkpoint ${checkpoint}` }
  });
}

let finished = false;

process.on("uncaughtException", err => {
  if (finished) return;
  finished = true;

  if (err?.__ASSERTION__) {
    writeAndExit({
      checkpoint,
      status: "FAILED_ASSERTION",
      error: err.__ASSERTION__
    });
  }

  writeAndExit({
    checkpoint,
    status: "FAILED_RUNTIME",
    error: {
      message: sanitize(err?.message || "Runtime error"),
      hint: "Check your code for runtime exceptions"
    }
  });
});

process.on("unhandledRejection", err => {
  if (finished) return;
  finished = true;

  writeAndExit({
    checkpoint,
    status: "FAILED_RUNTIME",
    error: {
      message: sanitize(err?.message || "Unhandled promise rejection"),
      hint: "Ensure async code handles errors properly"
    }
  });
});

function jsDomWrapper(testPath) {
  return `
    import { JSDOM } from "jsdom";

    const dom = new JSDOM(
      "<!doctype html><html><body><div id='root'></div></body></html>",
      { url: "http://localhost", pretendToBeVisual: true }
    );

    const w = dom.window;
    global.window = w;
    global.document = w.document;
    global.navigator = w.navigator;
    global.HTMLElement = w.HTMLElement;
    global.Node = w.Node;
    global.Event = w.Event;
    global.requestAnimationFrame = cb => setTimeout(cb, 0);

    Object.getOwnPropertyNames(w).forEach(p => {
      if (global[p] === undefined) global[p] = w[p];
    });

    await import(${JSON.stringify(testPath)});
  `;
}

(async function run() {
  const start = Date.now();
  const harnessPath = path.join(
    os.tmpdir(),
    `devsarena-${process.pid}-${checkpoint}.js`
  );

  try {
    fs.writeFileSync(harnessPath, jsDomWrapper(testFile), "utf8");

    const child = spawn(
      process.execPath,
      ["--test", harnessPath],
      {
        cwd: WORKSPACE,
        env: { ...process.env, NODE_ENV: "test" }
      }
    );

    child.on("close", code => {
      if (finished) return;
      finished = true;
      cleanup(harnessPath);

      const durationMs = Date.now() - start;

      if (code === 0) {
        writeAndExit({
          checkpoint,
          status: "PASSED",
          durationMs
        });
      }

      writeAndExit({
        checkpoint,
        status: "FAILED_ASSERTION",
        error: {
          message: "One or more test assertions failed",
          hint: "Review the failing scenario in this checkpoint"
        }
      });
    });
  } catch {
    cleanup(harnessPath);
    writeAndExit({
      checkpoint,
      status: "EXECUTOR_ERROR",
      error: { message: "Executor crashed unexpectedly" }
    });
  }
})();

export function failAssertion({ scenario, expected, received, hint }) {
  const err = new Error("ASSERTION_FAILED");
  err.__ASSERTION__ = { scenario, expected, received, hint };
  throw err;
}

function writeAndExit(obj) {
  process.stdout.write(JSON.stringify(obj));
  process.exit(0);
}

function cleanup(p) {
  try { fs.unlinkSync(p); } catch {}
}

function sanitize(s) {
  return String(s)
    .replace(/\n/g, " ")
    .replace(INTERNAL_TEST, "<internal>")
    .replace(WORKSPACE, "<workspace>")
    .slice(0, 300);
}
