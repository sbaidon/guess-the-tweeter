import { Database } from "bun:sqlite";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import {
  AUTHORS_BY_ID,
  CATEGORY_ORDER,
  MODELS,
  MODELS_BY_ID,
  POSTS_BY_ID,
  getAuthorsForMode,
  getPostsForCategory,
  isCategoryKey,
} from "../src/gameData.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const distDir = path.join(rootDir, "dist");
const dbPath = process.env.DATABASE_PATH ?? path.join(dataDir, "guess-the-tweeter.sqlite");
const port = Number(process.env.PORT ?? 8787);
const adminToken = process.env.ADMIN_TOKEN ?? "";
const roundLengthMs = 60 * 60 * 1000;
const lockOffsetMs = 50 * 60 * 1000;
const revealOffsetMs = 55 * 60 * 1000;

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS rounds (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    post_id TEXT NOT NULL,
    author_choice_ids TEXT NOT NULL,
    model_choice_ids TEXT NOT NULL,
    starts_at INTEGER NOT NULL,
    locks_at INTEGER NOT NULL,
    reveals_at INTEGER NOT NULL,
    status_override TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS submissions (
    round_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    author_choice_id TEXT,
    model_choice_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (round_id, client_id),
    FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

const statements = {
  getRound: db.prepare("SELECT * FROM rounds WHERE id = ?"),
  insertRound: db.prepare(`
    INSERT INTO rounds (
      id,
      category,
      post_id,
      author_choice_ids,
      model_choice_ids,
      starts_at,
      locks_at,
      reveals_at,
      status_override,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  getSetting: db.prepare("SELECT value FROM settings WHERE key = ?"),
  setSetting: db.prepare(`
    INSERT INTO settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `),
  deleteSetting: db.prepare("DELETE FROM settings WHERE key = ?"),
  getSubmission: db.prepare("SELECT * FROM submissions WHERE round_id = ? AND client_id = ?"),
  upsertSubmission: db.prepare(`
    INSERT INTO submissions (round_id, client_id, author_choice_id, model_choice_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(round_id, client_id) DO UPDATE SET
      author_choice_id = COALESCE(excluded.author_choice_id, submissions.author_choice_id),
      model_choice_id = COALESCE(excluded.model_choice_id, submissions.model_choice_id),
      updated_at = excluded.updated_at
  `),
  getSubmissions: db.prepare("SELECT * FROM submissions WHERE round_id = ?"),
  countSubmissions: db.prepare("SELECT COUNT(*) AS count FROM submissions WHERE round_id = ?"),
  setRoundStatus: db.prepare("UPDATE rounds SET status_override = ? WHERE id = ?"),
  clearSubmissions: db.prepare("DELETE FROM submissions WHERE round_id = ?"),
};

function hashToInt(value) {
  const hash = crypto.createHash("sha256").update(value).digest("hex").slice(0, 12);
  return Number.parseInt(hash, 16);
}

function seededPick(items, seed) {
  return items[hashToInt(seed) % items.length];
}

function seededShuffle(items, seed) {
  return [...items].sort((left, right) => {
    const leftHash = hashToInt(`${seed}:${left.id ?? left}`);
    const rightHash = hashToInt(`${seed}:${right.id ?? right}`);
    return leftHash - rightHash;
  });
}

function createRoundRecord(category, startsAt, idPrefix = "hourly") {
  const post = seededPick(getPostsForCategory(category), `${category}:${startsAt}:post`);
  const authorPool = getAuthorsForMode(category, post.category).filter(
    (author) => author.id !== post.authorId,
  );
  const authorChoiceIds = seededShuffle(authorPool, `${category}:${startsAt}:authors`)
    .slice(0, 3)
    .map((author) => author.id);
  const modelChoiceIds = seededShuffle(
    MODELS.filter((model) => model.id !== post.modelId),
    `${category}:${startsAt}:models`,
  )
    .slice(0, 3)
    .map((model) => model.id);

  return {
    id: `${category}:${idPrefix}:${startsAt}`,
    category,
    postId: post.id,
    authorChoiceIds: JSON.stringify(
      seededShuffle([post.authorId, ...authorChoiceIds], `${category}:${startsAt}:author-order`),
    ),
    modelChoiceIds: JSON.stringify(
      seededShuffle([post.modelId, ...modelChoiceIds], `${category}:${startsAt}:model-order`),
    ),
    startsAt,
    locksAt: startsAt + lockOffsetMs,
    revealsAt: startsAt + revealOffsetMs,
    statusOverride: null,
    createdAt: Date.now(),
  };
}

function insertRound(record) {
  statements.insertRound.run(
    record.id,
    record.category,
    record.postId,
    record.authorChoiceIds,
    record.modelChoiceIds,
    record.startsAt,
    record.locksAt,
    record.revealsAt,
    record.statusOverride,
    record.createdAt,
  );
  return statements.getRound.get(record.id);
}

function currentHourStart(now = Date.now()) {
  const date = new Date(now);
  date.setUTCMinutes(0, 0, 0);
  return date.getTime();
}

function getManualRound(category, now = Date.now()) {
  const setting = statements.getSetting.get(`active_round:${category}`);

  if (!setting) {
    return null;
  }

  const round = statements.getRound.get(setting.value);

  if (!round || now >= round.starts_at + roundLengthMs) {
    statements.deleteSetting.run(`active_round:${category}`);
    return null;
  }

  return round;
}

function ensureCurrentRound(category, now = Date.now()) {
  const manualRound = getManualRound(category, now);

  if (manualRound) {
    return manualRound;
  }

  const startsAt = currentHourStart(now);
  const roundId = `${category}:hourly:${startsAt}`;
  const existingRound = statements.getRound.get(roundId);

  if (existingRound) {
    return existingRound;
  }

  return insertRound(createRoundRecord(category, startsAt));
}

function createManualRound(category) {
  const startsAt = Date.now();
  const round = insertRound(createRoundRecord(category, startsAt, "manual"));
  statements.setSetting.run(`active_round:${category}`, round.id);
  return round;
}

function computeStatus(round, now = Date.now()) {
  if (round.status_override) {
    return round.status_override;
  }

  if (now >= round.reveals_at) {
    return "revealed";
  }

  if (now >= round.locks_at) {
    return "locked";
  }

  return "open";
}

function parseChoices(value) {
  return JSON.parse(value);
}

function buildCounts(submissions, field, choiceIds) {
  const counts = new Map(choiceIds.map((choiceId) => [choiceId, 0]));

  for (const submission of submissions) {
    const value = submission[field];

    if (value && counts.has(value)) {
      counts.set(value, counts.get(value) + 1);
    }
  }

  return counts;
}

function publicRound(round, clientId) {
  const status = computeStatus(round);
  const post = POSTS_BY_ID.get(round.post_id);
  const authorChoiceIds = parseChoices(round.author_choice_ids);
  const modelChoiceIds = parseChoices(round.model_choice_ids);
  const submissions = statements.getSubmissions.all(round.id);
  const submission = clientId ? statements.getSubmission.get(round.id, clientId) : null;
  const payload = {
    id: round.id,
    category: round.category,
    status,
    startsAt: new Date(round.starts_at).toISOString(),
    locksAt: new Date(round.locks_at).toISOString(),
    revealsAt: new Date(round.reveals_at).toISOString(),
    post: {
      id: post.id,
      category: post.category,
      text: post.text,
    },
    authorChoices: authorChoiceIds.map((authorId) => AUTHORS_BY_ID.get(authorId)),
    modelChoices: modelChoiceIds.map((modelId) => MODELS_BY_ID.get(modelId)),
    submission: submission
      ? {
          authorId: submission.author_choice_id,
          modelId: submission.model_choice_id,
        }
      : null,
    totals: {
      submissions: statements.countSubmissions.get(round.id).count,
      connected: countConnections(round.category),
    },
  };

  if (status === "revealed") {
    const authorCounts = buildCounts(submissions, "author_choice_id", authorChoiceIds);
    const modelCounts = buildCounts(submissions, "model_choice_id", modelChoiceIds);
    const authorTotal = submissions.filter((item) => item.author_choice_id).length;
    const modelTotal = submissions.filter((item) => item.model_choice_id).length;

    payload.answer = {
      author: AUTHORS_BY_ID.get(post.authorId),
      model: MODELS_BY_ID.get(post.modelId),
    };
    payload.results = {
      authorTotal,
      modelTotal,
      authors: authorChoiceIds.map((authorId) => ({
        author: AUTHORS_BY_ID.get(authorId),
        count: authorCounts.get(authorId) ?? 0,
        percentage: authorTotal ? Math.round(((authorCounts.get(authorId) ?? 0) / authorTotal) * 100) : 0,
        correct: authorId === post.authorId,
      })),
      models: modelChoiceIds.map((modelId) => ({
        model: MODELS_BY_ID.get(modelId),
        count: modelCounts.get(modelId) ?? 0,
        percentage: modelTotal ? Math.round(((modelCounts.get(modelId) ?? 0) / modelTotal) * 100) : 0,
        correct: modelId === post.modelId,
      })),
    };
  }

  return payload;
}

function json(response, statusCode, body) {
  const payload = JSON.stringify(body);
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
  });
  response.end(payload);
}

function notFound(response) {
  json(response, 404, { error: "not_found" });
}

function badRequest(response, message) {
  json(response, 400, { error: "bad_request", message });
}

async function readJson(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function requireAdmin(request, response) {
  if (!adminToken) {
    return true;
  }

  if (request.headers["x-admin-token"] === adminToken) {
    return true;
  }

  json(response, 401, { error: "unauthorized" });
  return false;
}

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/rounds/current") {
    const category = url.searchParams.get("category") ?? "all";

    if (!isCategoryKey(category)) {
      return badRequest(response, "Unknown category.");
    }

    const round = ensureCurrentRound(category);
    return json(response, 200, publicRound(round, url.searchParams.get("clientId")));
  }

  const submissionMatch = url.pathname.match(/^\/api\/rounds\/([^/]+)\/submissions$/);

  if (request.method === "POST" && submissionMatch) {
    const roundId = decodeURIComponent(submissionMatch[1]);
    const round = statements.getRound.get(roundId);

    if (!round) {
      return notFound(response);
    }

    if (computeStatus(round) !== "open") {
      return json(response, 409, { error: "round_closed" });
    }

    const body = await readJson(request);
    const authorChoiceIds = new Set(parseChoices(round.author_choice_ids));
    const modelChoiceIds = new Set(parseChoices(round.model_choice_ids));

    if (!body.clientId || typeof body.clientId !== "string") {
      return badRequest(response, "Missing clientId.");
    }

    if (body.authorId && !authorChoiceIds.has(body.authorId)) {
      return badRequest(response, "Invalid author choice.");
    }

    if (body.modelId && !modelChoiceIds.has(body.modelId)) {
      return badRequest(response, "Invalid model choice.");
    }

    const now = Date.now();
    statements.upsertSubmission.run(
      roundId,
      body.clientId,
      body.authorId ?? null,
      body.modelId ?? null,
      now,
      now,
    );

    broadcastUpdate(round.category);
    return json(response, 200, publicRound(round, body.clientId));
  }

  const revealMatch = url.pathname.match(/^\/api\/admin\/rounds\/([^/]+)\/reveal$/);

  if (request.method === "POST" && revealMatch) {
    if (!requireAdmin(request, response)) {
      return;
    }

    const roundId = decodeURIComponent(revealMatch[1]);
    const round = statements.getRound.get(roundId);

    if (!round) {
      return notFound(response);
    }

    statements.setRoundStatus.run("revealed", roundId);
    broadcastUpdate(round.category);
    return json(response, 200, publicRound(statements.getRound.get(roundId)));
  }

  const resetMatch = url.pathname.match(/^\/api\/admin\/rounds\/([^/]+)\/reset$/);

  if (request.method === "POST" && resetMatch) {
    if (!requireAdmin(request, response)) {
      return;
    }

    const roundId = decodeURIComponent(resetMatch[1]);
    const round = statements.getRound.get(roundId);

    if (!round) {
      return notFound(response);
    }

    statements.clearSubmissions.run(roundId);
    statements.setRoundStatus.run(null, roundId);
    broadcastUpdate(round.category);
    return json(response, 200, publicRound(statements.getRound.get(roundId)));
  }

  if (request.method === "POST" && url.pathname === "/api/admin/rounds/next") {
    if (!requireAdmin(request, response)) {
      return;
    }

    const body = await readJson(request);
    const category = body.category ?? "all";

    if (!isCategoryKey(category)) {
      return badRequest(response, "Unknown category.");
    }

    const round = createManualRound(category);
    broadcastUpdate(category);
    return json(response, 200, publicRound(round));
  }

  return notFound(response);
}

function serveStatic(request, response, url) {
  let filePath = path.join(distDir, url.pathname === "/" ? "index.html" : url.pathname);

  if (!filePath.startsWith(distDir)) {
    return notFound(response);
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, "index.html");
  }

  if (!fs.existsSync(filePath)) {
    return json(response, 503, { error: "frontend_not_built" });
  }

  const ext = path.extname(filePath);
  const contentTypes = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
  };

  response.writeHead(200, { "content-type": contentTypes[ext] ?? "application/octet-stream" });
  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }

    serveStatic(request, response, url);
  } catch (error) {
    console.error(error);
    json(response, 500, { error: "internal_server_error" });
  }
});

const wss = new WebSocketServer({ server, path: "/ws" });
const sockets = new Set();

function countConnections(category) {
  let count = 0;

  for (const socket of sockets) {
    if (socket.readyState === socket.OPEN && socket.category === category) {
      count += 1;
    }
  }

  return count;
}

function broadcastUpdate(category) {
  for (const socket of sockets) {
    if (socket.readyState === socket.OPEN && socket.category === category) {
      socket.send(JSON.stringify({ type: "round:update", category }));
    }
  }
}

wss.on("connection", (socket, request) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const category = url.searchParams.get("category") ?? "all";

  socket.category = isCategoryKey(category) ? category : "all";
  sockets.add(socket);
  socket.send(JSON.stringify({ type: "round:update", category: socket.category }));
  broadcastUpdate(socket.category);

  socket.on("close", () => {
    sockets.delete(socket);
    broadcastUpdate(socket.category);
  });
});

for (const category of CATEGORY_ORDER) {
  ensureCurrentRound(category);
}

server.listen(port, "0.0.0.0", () => {
  console.log(`Guess the Tweeter server listening on http://127.0.0.1:${port}`);
});
