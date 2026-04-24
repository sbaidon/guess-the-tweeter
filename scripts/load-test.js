import { WebSocket } from "ws";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value = "true"] = arg.replace(/^--/, "").split("=");
    return [key, value];
  }),
);

const baseUrl = stringArg("url", "LOAD_TEST_URL", "http://127.0.0.1:8787").replace(/\/$/, "");
const wsClients = numberArg("ws-clients", "LOAD_TEST_WS_CLIENTS", 100);
const votes = numberArg("votes", "LOAD_TEST_VOTES", 500);
const durationSeconds = numberArg("duration", "LOAD_TEST_DURATION", 30);
const concurrency = numberArg("concurrency", "LOAD_TEST_CONCURRENCY", 50);
const snapshotWaitSeconds = numberArg("snapshot-wait", "LOAD_TEST_SNAPSHOT_WAIT", 5);
const languages = stringArg("languages", "LOAD_TEST_LANGUAGES", "en,es,fr,pt,de")
  .split(",")
  .map((language) => language.trim())
  .filter(Boolean);

if (!languages.length) {
  throw new Error("At least one language is required.");
}

if (votes < 0 || wsClients < 0 || durationSeconds < 1 || concurrency < 1) {
  throw new Error("Invalid load test parameters.");
}

const wsUrl = baseUrl.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
const runId = `load-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const startedAt = Date.now();
const rounds = new Map();
const sockets = [];
const pendingSnapshots = new Map();
const latestTotals = new Map(languages.map((language) => [language, 0]));
const httpLatencies = [];
const snapshotLags = [];
const statusCounts = new Map();
const errors = [];
let snapshotMessages = 0;
let connectedSockets = 0;

console.log(`Load test: ${baseUrl}`);
console.log(
  `Config: ${JSON.stringify({ concurrency, durationSeconds, languages, votes, wsClients })}`,
);

for (const language of languages) {
  const currentRound = await fetchJson(
    `/api/rounds/current?language=${encodeURIComponent(language)}&clientId=${runId}-round-${language}`,
  );
  rounds.set(language, currentRound);
  latestTotals.set(language, currentRound.totals.submissions);
  pendingSnapshots.set(language, []);

  if (currentRound.status !== "open") {
    console.warn(`Round ${currentRound.id} is ${currentRound.status}; submissions may be rejected.`);
  }
}

await openSockets();
await runVotes();
await sleep(snapshotWaitSeconds * 1000);

for (const socket of sockets) {
  socket.close();
}

const elapsedSeconds = (Date.now() - startedAt) / 1000;
const pendingCount = [...pendingSnapshots.values()].reduce((sum, pending) => sum + pending.length, 0);

console.log("");
console.log("Summary");
console.log(`Elapsed: ${elapsedSeconds.toFixed(1)}s`);
console.log(`HTTP votes attempted: ${votes}`);
console.log(`HTTP status counts: ${formatCounts(statusCounts)}`);
console.log(`HTTP latency p50/p95/p99: ${formatLatency(httpLatencies)}`);
console.log(`WebSocket connected: ${connectedSockets}/${wsClients}`);
console.log(`WebSocket snapshot messages: ${snapshotMessages}`);
console.log(`Snapshot lag p50/p95/p99: ${formatLatency(snapshotLags)}`);
console.log(`Pending snapshot acknowledgements: ${pendingCount}`);
console.log(`Errors: ${errors.length}`);

if (errors.length) {
  for (const error of errors.slice(0, 10)) {
    console.log(`- ${error}`);
  }
}

function stringArg(name, envName, fallback) {
  return args.get(name) ?? process.env[envName] ?? fallback;
}

function numberArg(name, envName, fallback) {
  const value = Number(stringArg(name, envName, String(fallback)));

  if (!Number.isFinite(value)) {
    throw new Error(`Invalid number for --${name}`);
  }

  return Math.floor(value);
}

async function fetchJson(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);

  if (!response.ok) {
    throw new Error(`GET ${pathname} failed with ${response.status}`);
  }

  return response.json();
}

async function openSockets() {
  const openers = Array.from({ length: wsClients }, (_, index) => {
    const language = languages[index % languages.length];
    return openSocket(language, index);
  });

  await Promise.all(openers);
}

function openSocket(language, index) {
  return new Promise((resolve) => {
    const socket = new WebSocket(`${wsUrl}/ws?language=${encodeURIComponent(language)}`);
    sockets.push(socket);

    socket.on("open", () => {
      connectedSockets += 1;
      resolve();
    });

    socket.on("message", (data) => {
      snapshotMessages += 1;
      handleSocketMessage(language, data);
    });

    socket.on("error", (error) => {
      errors.push(`ws ${index} ${language}: ${error.message}`);
      resolve();
    });

    setTimeout(resolve, 5_000);
  });
}

function handleSocketMessage(language, data) {
  let message;

  try {
    message = JSON.parse(String(data));
  } catch (error) {
    errors.push(`invalid ws json: ${error.message}`);
    return;
  }

  if (message.type !== "round:snapshot" || !message.round) {
    return;
  }

  const total = message.round.totals?.submissions ?? 0;
  latestTotals.set(language, Math.max(latestTotals.get(language) ?? 0, total));
  acknowledgeSnapshots(language, total);
}

async function runVotes() {
  const tasks = Array.from({ length: votes }, (_, index) => () => submitVote(index));
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, async (_, workerIndex) => {
    for (let index = workerIndex; index < tasks.length; index += concurrency) {
      await waitForSchedule(index);
      await tasks[index]();
    }
  });

  await Promise.all(workers);
}

async function waitForSchedule(index) {
  if (votes <= 1) {
    return;
  }

  const targetOffsetMs = (index / Math.max(1, votes - 1)) * durationSeconds * 1000;
  const delayMs = startedAt + targetOffsetMs - Date.now();

  if (delayMs > 0) {
    await sleep(delayMs);
  }
}

async function submitVote(index) {
  const language = languages[index % languages.length];
  const round = rounds.get(language);
  const author = round.authorChoices[index % round.authorChoices.length];
  const clientId = `${runId}-vote-${index}`;
  const before = performance.now();

  try {
    const response = await fetch(
      `${baseUrl}/api/rounds/${encodeURIComponent(round.id)}/submissions`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          clientId,
          authorId: author.id,
        }),
      },
    );
    const latencyMs = performance.now() - before;
    httpLatencies.push(latencyMs);
    increment(statusCounts, String(response.status));

    if (response.ok) {
      const body = await response.json();
      const targetTotal = body.totals.submissions;
      pendingSnapshots.get(language).push({
        submittedAt: Date.now(),
        targetTotal,
      });
      acknowledgeSnapshots(language, latestTotals.get(language) ?? 0);
    } else {
      await response.text();
    }
  } catch (error) {
    errors.push(`vote ${index}: ${error.message}`);
  }
}

function acknowledgeSnapshots(language, total) {
  const pending = pendingSnapshots.get(language);

  while (pending.length && pending[0].targetTotal <= total) {
    const item = pending.shift();
    snapshotLags.push(Date.now() - item.submittedAt);
  }
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function percentile(values, pct) {
  if (!values.length) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.floor((pct / 100) * sorted.length));
  return sorted[index];
}

function formatLatency(values) {
  const p50 = percentile(values, 50);
  const p95 = percentile(values, 95);
  const p99 = percentile(values, 99);

  if (p50 === null) {
    return "n/a";
  }

  return `${p50.toFixed(1)}ms / ${p95.toFixed(1)}ms / ${p99.toFixed(1)}ms`;
}

function formatCounts(map) {
  return [...map.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
