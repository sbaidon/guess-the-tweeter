import { spawn } from "node:child_process";

const processes = [
  spawn("bun", ["server/index.ts"], {
    env: { ...process.env, NODE_ENV: "development" },
    stdio: "inherit",
  }),
  spawn("bunx", ["--bun", "vite"], {
    env: { ...process.env },
    stdio: "inherit",
  }),
];

function shutdown(signal) {
  for (const child of processes) {
    child.kill(signal);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

for (const child of processes) {
  child.on("exit", (code, signal) => {
    if (signal) {
      return;
    }

    for (const sibling of processes) {
      if (sibling !== child) {
        sibling.kill("SIGTERM");
      }
    }

    process.exit(code ?? 0);
  });
}
