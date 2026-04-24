import { Database } from "bun:sqlite";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import {
  AUTHORS_BY_ID,
  DEFAULT_LANGUAGE,
  LANGUAGE_ORDER,
  LANGUAGES_BY_ID,
  POSTS_BY_ID,
  getAuthorsForMode,
  getPostsForCategory,
} from "../src/gameData.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const distDir = path.join(rootDir, "dist");
const dbPath = process.env.DATABASE_PATH ?? path.join(dataDir, "guess-the-tweeter.sqlite");
const port = Number(process.env.PORT ?? 8787);
const adminToken = process.env.ADMIN_TOKEN ?? "";
const publicCategory = "all";
const defaultLanguage = DEFAULT_LANGUAGE;
const roundLengthMs = 60 * 60 * 1000;
const lockOffsetMs = 50 * 60 * 1000;
const revealOffsetMs = 55 * 60 * 1000;
const defaultContestYears = Number(process.env.CONTEST_YEARS ?? 10);

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

  CREATE TABLE IF NOT EXISTS generated_posts (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    author_id TEXT NOT NULL,
    model_id TEXT NOT NULL,
    text TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    source_model TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'approved',
    raw_response TEXT,
    created_at INTEGER NOT NULL,
    approved_at INTEGER
  );
`);

ensureGeneratedPostsLanguageColumn();

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
  getPastRounds: db.prepare(`
    SELECT *
    FROM rounds
    WHERE reveals_at <= ? OR status_override = 'revealed'
    ORDER BY starts_at DESC
    LIMIT ?
  `),
  setRoundStatus: db.prepare("UPDATE rounds SET status_override = ? WHERE id = ?"),
  clearSubmissions: db.prepare("DELETE FROM submissions WHERE round_id = ?"),
  deleteRound: db.prepare("DELETE FROM rounds WHERE id = ?"),
  getGeneratedPost: db.prepare("SELECT * FROM generated_posts WHERE id = ? AND status = 'approved'"),
  getGeneratedPosts: db.prepare("SELECT * FROM generated_posts WHERE status = 'approved' ORDER BY created_at ASC"),
};

function addYears(value, years) {
  const date = new Date(value);
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return date.getTime();
}

function ensureContestSettings(now = Date.now()) {
  const startSetting = statements.getSetting.get("contest:start_at");
  const endSetting = statements.getSetting.get("contest:end_at");

  if (startSetting && endSetting) {
    return {
      startsAt: Number(startSetting.value),
      endsAt: Number(endSetting.value),
    };
  }

  const startsAt = currentHourStart(now);
  const endsAt = addYears(startsAt, defaultContestYears);

  statements.setSetting.run("contest:start_at", String(startsAt));
  statements.setSetting.run("contest:end_at", String(endsAt));
  return { startsAt, endsAt };
}

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

function generatedRowToPost(row) {
  return {
    id: row.id,
    category: row.category,
    authorId: row.author_id,
    modelId: row.model_id,
    language: row.language ?? "en",
    text: row.text,
  };
}

function postLanguage(post) {
  return post.language ?? defaultLanguage;
}

function roundLanguage(round) {
  const [language] = String(round.id).split(":");
  return LANGUAGES_BY_ID.has(language) ? language : defaultLanguage;
}

function getGeneratedPostsForCategory(category) {
  return statements.getGeneratedPosts
    .all()
    .filter((post) => category === "all" || post.category === category)
    .map(generatedRowToPost);
}

function getPlayablePostsForCategory(category) {
  return [...getPostsForCategory(category), ...getGeneratedPostsForCategory(category)];
}

function getPlayablePostsForLanguage(category, language) {
  return getPlayablePostsForCategory(category).filter((post) => postLanguage(post) === language);
}

function getPlayablePost(postId) {
  const seededPost = POSTS_BY_ID.get(postId);

  if (seededPost) {
    return seededPost;
  }

  const generatedPost = statements.getGeneratedPost.get(postId);

  if (!generatedPost) {
    return null;
  }

  return generatedRowToPost(generatedPost);
}

function createRoundRecord(category, startsAt, idPrefix = "hourly", language = defaultLanguage) {
  const languagePosts = getPlayablePostsForLanguage(category, language);
  const playablePosts = languagePosts.length ? languagePosts : getPlayablePostsForCategory(category);
  const post = seededPick(playablePosts, `${category}:${language}:${startsAt}:post`);
  const authorPool = getAuthorsForMode(category, post.category).filter(
    (author) => author.id !== post.authorId,
  );
  const authorChoiceIds = seededShuffle(authorPool, `${category}:${startsAt}:authors`)
    .slice(0, 3)
    .map((author) => author.id);

  return {
    id: `${language}:${category}:${idPrefix}:${startsAt}`,
    category,
    postId: post.id,
    authorChoiceIds: JSON.stringify(
      seededShuffle([post.authorId, ...authorChoiceIds], `${category}:${startsAt}:author-order`),
    ),
    modelChoiceIds: JSON.stringify([]),
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

function ensureCurrentRound(category, now = Date.now()) {
  return ensureCurrentRoundForLanguage(category, defaultLanguage, now);
}

function ensureCurrentRoundForLanguage(category, language = defaultLanguage, now = Date.now()) {
  const startsAt = currentHourStart(now);
  const roundId = `${language}:${category}:hourly:${startsAt}`;
  const existingRound = statements.getRound.get(roundId);

  if (existingRound) {
    const existingPost = getPlayablePost(existingRound.post_id);

    if (existingPost && postLanguage(existingPost) === language) {
      return existingRound;
    }

    statements.deleteRound.run(roundId);
  }

  return insertRound(createRoundRecord(category, startsAt, "hourly", language));
}

function getRequestLanguage(url) {
  const language = url.searchParams.get("language") ?? defaultLanguage;
  return LANGUAGES_BY_ID.has(language) ? language : defaultLanguage;
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
  const post = getPlayablePost(round.post_id);
  const contest = ensureContestSettings();

  if (!post) {
    throw new Error(`Post not found for round ${round.id}: ${round.post_id}`);
  }

  const authorChoiceIds = [...new Set([post.authorId, ...parseChoices(round.author_choice_ids)])]
    .filter((authorId) => AUTHORS_BY_ID.has(authorId));
  const language = roundLanguage(round);
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
      language,
      languageName: LANGUAGES_BY_ID.get(language)?.name ?? "English",
      languageNativeName: LANGUAGES_BY_ID.get(language)?.nativeName ?? "English",
      text: post.text,
    },
    authorChoices: authorChoiceIds.map((authorId) => AUTHORS_BY_ID.get(authorId)),
    submission: submission
      ? {
          authorId: submission.author_choice_id,
        }
      : null,
    totals: {
      submissions: statements.countSubmissions.get(round.id).count,
      connected: countConnections(language),
    },
    contest: {
      startsAt: new Date(contest.startsAt).toISOString(),
      endsAt: new Date(contest.endsAt).toISOString(),
      roundNumber: Math.max(1, Math.floor((round.starts_at - contest.startsAt) / roundLengthMs) + 1),
      totalRounds: Math.max(1, Math.ceil((contest.endsAt - contest.startsAt) / roundLengthMs)),
    },
  };

  if (status === "revealed") {
    const authorCounts = buildCounts(submissions, "author_choice_id", authorChoiceIds);
    const authorTotal = submissions.filter((item) => item.author_choice_id).length;
    const winnerCount = authorCounts.get(post.authorId) ?? 0;

    payload.answer = {
      author: AUTHORS_BY_ID.get(post.authorId),
    };
    payload.results = {
      authorTotal,
      winnerCount,
      winnerPercentage: authorTotal ? Math.round((winnerCount / authorTotal) * 100) : 0,
      authors: authorChoiceIds.map((authorId) => ({
        author: AUTHORS_BY_ID.get(authorId),
        count: authorCounts.get(authorId) ?? 0,
        percentage: authorTotal ? Math.round(((authorCounts.get(authorId) ?? 0) / authorTotal) * 100) : 0,
        correct: authorId === post.authorId,
      })),
    };
  }

  return payload;
}

function ensureGeneratedPostsLanguageColumn() {
  const columns = db.prepare("PRAGMA table_info(generated_posts)").all();
  const hasLanguage = columns.some((column) => column.name === "language");

  if (!hasLanguage) {
    db.exec("ALTER TABLE generated_posts ADD COLUMN language TEXT NOT NULL DEFAULT 'en'");
  }
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
    const round = ensureCurrentRoundForLanguage(publicCategory, getRequestLanguage(url));
    return json(response, 200, publicRound(round, url.searchParams.get("clientId")));
  }

  if (request.method === "GET" && url.pathname === "/api/rounds/history") {
    const language = getRequestLanguage(url);
    const requestedLimit = Number(url.searchParams.get("limit") ?? 12);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(50, Math.max(1, requestedLimit))
      : 12;
    const rounds = statements.getPastRounds
      .all(Date.now(), limit * 10)
      .filter((round) => round.id.startsWith(`${language}:`) || (!round.id.includes(":all:") && language === defaultLanguage))
      .slice(0, limit)
      .map((round) => publicRound(round));

    return json(response, 200, { rounds });
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

    if (!body.clientId || typeof body.clientId !== "string") {
      return badRequest(response, "Missing clientId.");
    }

    if (body.authorId && !authorChoiceIds.has(body.authorId)) {
      return badRequest(response, "Invalid author choice.");
    }

    const now = Date.now();
    statements.upsertSubmission.run(
      roundId,
      body.clientId,
      body.authorId ?? null,
      null,
      now,
      now,
    );

    broadcastUpdate(roundLanguage(round));
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
    broadcastUpdate(roundLanguage(round));
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
    broadcastUpdate(roundLanguage(round));
    return json(response, 200, publicRound(statements.getRound.get(roundId)));
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

function countConnections(channel) {
  let count = 0;

  for (const socket of sockets) {
    if (socket.readyState === socket.OPEN && socket.category === channel) {
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
  socket.category = getRequestLanguage(url);
  sockets.add(socket);
  socket.send(JSON.stringify({ type: "round:update", category: socket.category }));
  broadcastUpdate(socket.category);

  socket.on("close", () => {
    sockets.delete(socket);
    broadcastUpdate(socket.category);
  });
});

ensureContestSettings();
for (const language of LANGUAGE_ORDER) {
  ensureCurrentRoundForLanguage(publicCategory, language);
}

server.listen(port, "0.0.0.0", () => {
  console.log(`Guess the Tweeter server listening on http://127.0.0.1:${port}`);
});
