import { Database } from "bun:sqlite";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import type { WebSocket } from "ws";
import {
  AUTHORS_BY_ID,
  DEFAULT_LANGUAGE,
  LANGUAGE_ORDER,
  LANGUAGES_BY_ID,
  POSTS_BY_ID,
  getAuthorsForMode,
  getPostsForCategory,
} from "../src/gameData.js";

type CategoryKey = "all" | "tech" | "politics" | "sports" | "celebrities" | "random";
type LanguageKey = string;
type RoundStatus = "open" | "locked" | "revealed";

type Author = {
  id: string;
  category: CategoryKey;
  name: string;
  handle: string;
  bio: string;
  signature: string;
};

type PlayablePost = {
  id: string;
  category: CategoryKey;
  authorId: string;
  modelId: string;
  language?: LanguageKey;
  text: string;
};

type RoundRow = {
  id: string;
  category: CategoryKey;
  post_id: string;
  author_choice_ids: string;
  model_choice_ids: string;
  starts_at: number;
  locks_at: number;
  reveals_at: number;
  status_override: RoundStatus | null;
  created_at: number;
};

type RoundRecord = {
  id: string;
  category: CategoryKey;
  postId: string;
  authorChoiceIds: string;
  modelChoiceIds: string;
  startsAt: number;
  locksAt: number;
  revealsAt: number;
  statusOverride: RoundStatus | null;
  createdAt: number;
};

type SubmissionRow = {
  round_id: string;
  client_id: string;
  author_choice_id: string | null;
  model_choice_id: string | null;
  created_at: number;
  updated_at: number;
};

type GeneratedPostRow = {
  id: string;
  category: CategoryKey;
  author_id: string;
  model_id: string;
  text: string;
  language: LanguageKey;
};

type SettingRow = {
  value: string;
};

type CountRow = {
  count: number;
};

type AuthorCountRow = {
  author_id: string;
  count: number;
};

type HealthRow = {
  ok: number;
};

type TableInfoRow = {
  name: string;
};

type ContestSettings = {
  startsAt: number;
  endsAt: number;
};

type PublicRoundPayload = {
  id: string;
  category: CategoryKey;
  status: RoundStatus;
  startsAt: string;
  locksAt: string;
  revealsAt: string;
  post: {
    id: string;
    category: CategoryKey;
    language: LanguageKey;
    languageName: string;
    languageNativeName: string;
    text: string;
  };
  authorChoices: Array<Author | undefined>;
  submission: { authorId: string | null } | null;
  totals: {
    submissions: number;
    connected: number;
  };
  contest: {
    startsAt: string;
    endsAt: string;
    roundNumber: number;
    totalRounds: number;
  };
  answer?: {
    author: Author | undefined;
  };
  results?: {
    authorTotal: number;
    winnerCount: number;
    winnerPercentage: number;
    authors: Array<{
      author: Author | undefined;
      count: number;
      percentage: number;
      correct: boolean;
    }>;
  };
};

type SubmissionBody = {
  clientId?: unknown;
  authorId?: unknown;
};

type ChannelSocket = WebSocket & {
  category?: LanguageKey;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const distDir = path.join(rootDir, "dist");
const dbPath = process.env.DATABASE_PATH ?? path.join(dataDir, "guess-the-tweeter.sqlite");
const port = Number(process.env.PORT ?? 8787);
const adminToken = process.env.ADMIN_TOKEN ?? "";
const trustProxy = process.env.TRUST_PROXY === "true";
const submissionRateLimitWindowMs = Number(process.env.SUBMISSION_RATE_LIMIT_WINDOW_MS ?? 60_000);
const submissionRateLimitMax = Number(process.env.SUBMISSION_RATE_LIMIT_MAX ?? 20);
const roomSnapshotIntervalMs = Number(process.env.ROOM_SNAPSHOT_INTERVAL_MS ?? 2_000);
const publicCategory: CategoryKey = "all";
const defaultLanguage: LanguageKey = DEFAULT_LANGUAGE;
const roundLengthMs = 60 * 60 * 1000;
const lockOffsetMs = 50 * 60 * 1000;
const revealOffsetMs = 55 * 60 * 1000;
const defaultContestYears = Number(process.env.CONTEST_YEARS ?? 10);
const processStartedAt = Date.now();

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

  CREATE TABLE IF NOT EXISTS round_author_counts (
    round_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (round_id, author_id),
    FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS round_totals (
    round_id TEXT PRIMARY KEY,
    author_total INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE
  );
`);

ensureGeneratedPostsLanguageColumn();
ensureSubmissionCounters();

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
  insertSubmission: db.prepare(`
    INSERT INTO submissions (round_id, client_id, author_choice_id, model_choice_id, created_at, updated_at)
    VALUES (?, ?, ?, NULL, ?, ?)
    ON CONFLICT(round_id, client_id) DO NOTHING
  `),
  getRoundTotal: db.prepare("SELECT author_total AS count FROM round_totals WHERE round_id = ?"),
  getAuthorCounts: db.prepare("SELECT author_id, count FROM round_author_counts WHERE round_id = ?"),
  incrementAuthorCount: db.prepare(`
    INSERT INTO round_author_counts (round_id, author_id, count)
    VALUES (?, ?, 1)
    ON CONFLICT(round_id, author_id) DO UPDATE SET count = count + 1
  `),
  incrementRoundTotal: db.prepare(`
    INSERT INTO round_totals (round_id, author_total)
    VALUES (?, 1)
    ON CONFLICT(round_id) DO UPDATE SET author_total = author_total + 1
  `),
  clearAuthorCounts: db.prepare("DELETE FROM round_author_counts WHERE round_id = ?"),
  clearRoundTotal: db.prepare("DELETE FROM round_totals WHERE round_id = ?"),
  healthCheck: db.prepare("SELECT 1 AS ok"),
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

const recordSubmission = db.transaction(
  (roundId: string, clientId: string, authorId: string | null, now: number): boolean => {
    const existingSubmission = statements.getSubmission.get(roundId, clientId) as SubmissionRow | null;

    if (existingSubmission?.author_choice_id || !authorId) {
      return false;
    }

    const result = statements.insertSubmission.run(roundId, clientId, authorId, now, now);

    if (result.changes === 0) {
      return false;
    }

    statements.incrementAuthorCount.run(roundId, authorId);
    statements.incrementRoundTotal.run(roundId);
    return true;
  },
);

function addYears(value: number, years: number): number {
  const date = new Date(value);
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return date.getTime();
}

function ensureContestSettings(now = Date.now()): ContestSettings {
  const startSetting = statements.getSetting.get("contest:start_at") as SettingRow | null;
  const endSetting = statements.getSetting.get("contest:end_at") as SettingRow | null;

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

function hashToInt(value: string): number {
  const hash = crypto.createHash("sha256").update(value).digest("hex").slice(0, 12);
  return Number.parseInt(hash, 16);
}

function seededPick<T>(items: T[], seed: string): T {
  return items[hashToInt(seed) % items.length];
}

function seededShuffle<T extends string | { id: string }>(items: T[], seed: string): T[] {
  return [...items].sort((left, right) => {
    const leftValue = typeof left === "string" ? left : left.id;
    const rightValue = typeof right === "string" ? right : right.id;
    const leftHash = hashToInt(`${seed}:${leftValue}`);
    const rightHash = hashToInt(`${seed}:${rightValue}`);
    return leftHash - rightHash;
  });
}

function generatedRowToPost(row: GeneratedPostRow): PlayablePost {
  return {
    id: row.id,
    category: row.category,
    authorId: row.author_id,
    modelId: row.model_id,
    language: row.language ?? "en",
    text: row.text,
  };
}

function postLanguage(post: PlayablePost): LanguageKey {
  return post.language ?? defaultLanguage;
}

function roundLanguage(round: RoundRow): LanguageKey {
  const [language] = String(round.id).split(":");
  return LANGUAGES_BY_ID.has(language) ? language : defaultLanguage;
}

function getGeneratedPostsForCategory(category: CategoryKey): PlayablePost[] {
  return (statements.getGeneratedPosts.all() as GeneratedPostRow[])
    .filter((post) => category === "all" || post.category === category)
    .map(generatedRowToPost);
}

function getPlayablePostsForCategory(category: CategoryKey): PlayablePost[] {
  return [...getPostsForCategory(category), ...getGeneratedPostsForCategory(category)] as PlayablePost[];
}

function getPlayablePostsForLanguage(category: CategoryKey, language: LanguageKey): PlayablePost[] {
  return getPlayablePostsForCategory(category).filter((post) => postLanguage(post) === language);
}

function getPlayablePost(postId: string): PlayablePost | null {
  const seededPost = POSTS_BY_ID.get(postId) as PlayablePost | undefined;

  if (seededPost) {
    return seededPost;
  }

  const generatedPost = statements.getGeneratedPost.get(postId) as GeneratedPostRow | null;

  if (!generatedPost) {
    return null;
  }

  return generatedRowToPost(generatedPost);
}

function createRoundRecord(
  category: CategoryKey,
  startsAt: number,
  idPrefix = "hourly",
  language: LanguageKey = defaultLanguage,
): RoundRecord {
  const languagePosts = getPlayablePostsForLanguage(category, language);
  const playablePosts = languagePosts.length ? languagePosts : getPlayablePostsForCategory(category);
  const post = seededPick(playablePosts, `${category}:${language}:${startsAt}:post`);
  const authorPool = (getAuthorsForMode(category, post.category) as Author[]).filter(
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

function insertRound(record: RoundRecord): RoundRow {
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
  return statements.getRound.get(record.id) as RoundRow;
}

function currentHourStart(now = Date.now()): number {
  const date = new Date(now);
  date.setUTCMinutes(0, 0, 0);
  return date.getTime();
}

function ensureCurrentRound(category: CategoryKey, now = Date.now()): RoundRow {
  return ensureCurrentRoundForLanguage(category, defaultLanguage, now);
}

function ensureCurrentRoundForLanguage(
  category: CategoryKey,
  language: LanguageKey = defaultLanguage,
  now = Date.now(),
): RoundRow {
  const startsAt = currentHourStart(now);
  const roundId = `${language}:${category}:hourly:${startsAt}`;
  const existingRound = statements.getRound.get(roundId) as RoundRow | null;

  if (existingRound) {
    const existingPost = getPlayablePost(existingRound.post_id);

    if (existingPost && postLanguage(existingPost) === language) {
      return existingRound;
    }

    statements.deleteRound.run(roundId);
  }

  return insertRound(createRoundRecord(category, startsAt, "hourly", language));
}

function getRequestLanguage(url: URL): LanguageKey {
  const language = url.searchParams.get("language") ?? defaultLanguage;
  return LANGUAGES_BY_ID.has(language) ? language : defaultLanguage;
}

function computeStatus(round: RoundRow, now = Date.now()): RoundStatus {
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

function parseChoices(value: string): string[] {
  return JSON.parse(value) as string[];
}

function getStoredAuthorCounts(roundId: string, choiceIds: string[]): Map<string, number> {
  const counts = new Map(choiceIds.map((choiceId) => [choiceId, 0]));
  const rows = statements.getAuthorCounts.all(roundId) as AuthorCountRow[];

  for (const row of rows) {
    if (counts.has(row.author_id)) {
      counts.set(row.author_id, row.count);
    }
  }

  return counts;
}

function getStoredAuthorTotal(roundId: string): number {
  return (statements.getRoundTotal.get(roundId) as CountRow | null)?.count ?? 0;
}

function publicRound(round: RoundRow, clientId?: string | null): PublicRoundPayload {
  const status = computeStatus(round);
  const post = getPlayablePost(round.post_id);
  const contest = ensureContestSettings();

  if (!post) {
    throw new Error(`Post not found for round ${round.id}: ${round.post_id}`);
  }

  const authorChoiceIds = [...new Set([post.authorId, ...parseChoices(round.author_choice_ids)])]
    .filter((authorId) => AUTHORS_BY_ID.has(authorId));
  const language = roundLanguage(round);
  const submission = clientId
    ? (statements.getSubmission.get(round.id, clientId) as SubmissionRow | null)
    : null;
  const authorTotal = getStoredAuthorTotal(round.id);
  const payload: PublicRoundPayload = {
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
    authorChoices: authorChoiceIds.map((authorId) => AUTHORS_BY_ID.get(authorId) as Author | undefined),
    submission: submission
      ? {
          authorId: submission.author_choice_id,
        }
      : null,
    totals: {
      submissions: authorTotal,
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
    const authorCounts = getStoredAuthorCounts(round.id, authorChoiceIds);
    const winnerCount = authorCounts.get(post.authorId) ?? 0;

    payload.answer = {
      author: AUTHORS_BY_ID.get(post.authorId) as Author | undefined,
    };
    payload.results = {
      authorTotal,
      winnerCount,
      winnerPercentage: authorTotal ? Math.round((winnerCount / authorTotal) * 100) : 0,
      authors: authorChoiceIds.map((authorId) => ({
        author: AUTHORS_BY_ID.get(authorId) as Author | undefined,
        count: authorCounts.get(authorId) ?? 0,
        percentage: authorTotal ? Math.round(((authorCounts.get(authorId) ?? 0) / authorTotal) * 100) : 0,
        correct: authorId === post.authorId,
      })),
    };
  }

  return payload;
}

function ensureGeneratedPostsLanguageColumn(): void {
  const columns = db.prepare("PRAGMA table_info(generated_posts)").all() as TableInfoRow[];
  const hasLanguage = columns.some((column) => column.name === "language");

  if (!hasLanguage) {
    db.exec("ALTER TABLE generated_posts ADD COLUMN language TEXT NOT NULL DEFAULT 'en'");
  }
}

function ensureSubmissionCounters(): void {
  db.exec(`
    INSERT OR IGNORE INTO round_author_counts (round_id, author_id, count)
    SELECT round_id, author_choice_id, COUNT(*)
    FROM submissions
    WHERE author_choice_id IS NOT NULL
    GROUP BY round_id, author_choice_id;

    INSERT OR IGNORE INTO round_totals (round_id, author_total)
    SELECT round_id, COUNT(*)
    FROM submissions
    WHERE author_choice_id IS NOT NULL
    GROUP BY round_id;
  `);
}

function logInfo(message: string, meta: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ level: "info", message, time: new Date().toISOString(), ...meta }));
}

function logError(message: string, error: unknown, meta: Record<string, unknown> = {}): void {
  console.error(
    JSON.stringify({
      level: "error",
      message,
      time: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      ...meta,
    }),
  );
}

function getClientIp(request: IncomingMessage): string {
  const forwardedFor = request.headers["x-forwarded-for"];

  if (trustProxy && typeof forwardedFor === "string") {
    return forwardedFor.split(",")[0]?.trim() || request.socket.remoteAddress || "unknown";
  }

  return request.socket.remoteAddress || "unknown";
}

const submissionAttempts = new Map<string, { count: number; resetsAt: number }>();

function checkSubmissionRateLimit(request: IncomingMessage, clientId: string): boolean {
  const now = Date.now();
  const key = `${getClientIp(request)}:${clientId}`;
  const existing = submissionAttempts.get(key);

  if (!existing || now >= existing.resetsAt) {
    submissionAttempts.set(key, {
      count: 1,
      resetsAt: now + submissionRateLimitWindowMs,
    });
    return true;
  }

  if (existing.count >= submissionRateLimitMax) {
    return false;
  }

  existing.count += 1;
  return true;
}

function pruneSubmissionRateLimits(): void {
  const now = Date.now();

  for (const [key, value] of submissionAttempts) {
    if (now >= value.resetsAt) {
      submissionAttempts.delete(key);
    }
  }
}

function healthPayload(): Record<string, unknown> {
  const dbHealth = statements.healthCheck.get() as HealthRow;

  return {
    ok: dbHealth.ok === 1,
    uptimeSeconds: Math.round((Date.now() - processStartedAt) / 1000),
    languages: LANGUAGE_ORDER,
    sockets: sockets.size,
    rateLimitBuckets: submissionAttempts.size,
  };
}

function json(response: ServerResponse, statusCode: number, body: unknown): void {
  const payload = JSON.stringify(body);
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
  });
  response.end(payload);
}

function notFound(response: ServerResponse): void {
  json(response, 404, { error: "not_found" });
}

function badRequest(response: ServerResponse, message: string): void {
  json(response, 400, { error: "bad_request", message });
}

async function readJson(request: IncomingMessage): Promise<SubmissionBody> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function requireAdmin(request: IncomingMessage, response: ServerResponse): boolean {
  if (!adminToken) {
    return true;
  }

  if (request.headers["x-admin-token"] === adminToken) {
    return true;
  }

  json(response, 401, { error: "unauthorized" });
  return false;
}

async function handleApi(request: IncomingMessage, response: ServerResponse, url: URL): Promise<void> {
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
      .all(Date.now(), limit * 10) as RoundRow[];
    const publicRounds = rounds
      .filter((round) => round.id.startsWith(`${language}:`) || (!round.id.includes(":all:") && language === defaultLanguage))
      .slice(0, limit)
      .map((round) => publicRound(round));

    return json(response, 200, { rounds: publicRounds });
  }

  const submissionMatch = url.pathname.match(/^\/api\/rounds\/([^/]+)\/submissions$/);

  if (request.method === "POST" && submissionMatch) {
    const roundId = decodeURIComponent(submissionMatch[1]);
    const round = statements.getRound.get(roundId) as RoundRow | null;

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

    if (!checkSubmissionRateLimit(request, body.clientId)) {
      return json(response, 429, { error: "rate_limited" });
    }

    const authorId = typeof body.authorId === "string" ? body.authorId : null;

    if (authorId && !authorChoiceIds.has(authorId)) {
      return badRequest(response, "Invalid author choice.");
    }

    const now = Date.now();
    const recorded = recordSubmission(roundId, body.clientId, authorId, now);

    if (recorded) {
      markRoomDirty(roundLanguage(round));
    }

    return json(response, 200, publicRound(round, body.clientId));
  }

  const revealMatch = url.pathname.match(/^\/api\/admin\/rounds\/([^/]+)\/reveal$/);

  if (request.method === "POST" && revealMatch) {
    if (!requireAdmin(request, response)) {
      return;
    }

    const roundId = decodeURIComponent(revealMatch[1]);
    const round = statements.getRound.get(roundId) as RoundRow | null;

    if (!round) {
      return notFound(response);
    }

    statements.setRoundStatus.run("revealed", roundId);
    markRoomDirty(roundLanguage(round));
    return json(response, 200, publicRound(statements.getRound.get(roundId) as RoundRow));
  }

  const resetMatch = url.pathname.match(/^\/api\/admin\/rounds\/([^/]+)\/reset$/);

  if (request.method === "POST" && resetMatch) {
    if (!requireAdmin(request, response)) {
      return;
    }

    const roundId = decodeURIComponent(resetMatch[1]);
    const round = statements.getRound.get(roundId) as RoundRow | null;

    if (!round) {
      return notFound(response);
    }

    statements.clearSubmissions.run(roundId);
    statements.clearAuthorCounts.run(roundId);
    statements.clearRoundTotal.run(roundId);
    statements.setRoundStatus.run(null, roundId);
    markRoomDirty(roundLanguage(round));
    return json(response, 200, publicRound(statements.getRound.get(roundId) as RoundRow));
  }

  return notFound(response);
}

function serveStatic(request: IncomingMessage, response: ServerResponse, url: URL): void {
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
  const startedAt = Date.now();

  response.on("finish", () => {
    const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : "";

    if (pathname === "/healthz" || pathname.startsWith("/api/")) {
      logInfo("request", {
        durationMs: Date.now() - startedAt,
        method: request.method,
        path: pathname,
        statusCode: response.statusCode,
      });
    }
  });

  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "GET" && url.pathname === "/healthz") {
      return json(response, 200, healthPayload());
    }

    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }

    serveStatic(request, response, url);
  } catch (error) {
    logError("request_failed", error);
    json(response, 500, { error: "internal_server_error" });
  }
});

const wss = new WebSocketServer({ server, path: "/ws" });
const sockets = new Set<ChannelSocket>();
const dirtyRooms = new Set<LanguageKey>();

function countConnections(channel: LanguageKey): number {
  let count = 0;

  for (const socket of sockets) {
    if (socket.readyState === socket.OPEN && socket.category === channel) {
      count += 1;
    }
  }

  return count;
}

function mergeSocketRound(category: LanguageKey): string {
  const round = ensureCurrentRoundForLanguage(publicCategory, category);
  return JSON.stringify({
    type: "round:snapshot",
    round: publicRound(round),
  });
}

function sendRoomUpdate(category: LanguageKey): void {
  const payload = mergeSocketRound(category);

  for (const socket of sockets) {
    if (socket.readyState === socket.OPEN && socket.category === category) {
      socket.send(payload);
    }
  }
}

function markRoomDirty(category: LanguageKey): void {
  dirtyRooms.add(category);
}

function flushRoomUpdates(): void {
  if (dirtyRooms.size === 0) {
    return;
  }

  const rooms = [...dirtyRooms];
  dirtyRooms.clear();

  for (const room of rooms) {
    sendRoomUpdate(room);
  }
}

wss.on("connection", (socket: ChannelSocket, request: IncomingMessage) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  socket.category = getRequestLanguage(url);
  sockets.add(socket);
  socket.send(mergeSocketRound(socket.category));
  markRoomDirty(socket.category);

  socket.on("close", () => {
    const category = socket.category;
    sockets.delete(socket);

    if (category) {
      markRoomDirty(category);
    }
  });
});

ensureContestSettings();
for (const language of LANGUAGE_ORDER) {
  ensureCurrentRoundForLanguage(publicCategory, language);
}

setInterval(pruneSubmissionRateLimits, submissionRateLimitWindowMs).unref?.();
setInterval(flushRoomUpdates, roomSnapshotIntervalMs).unref?.();

server.listen(port, "0.0.0.0", () => {
  logInfo("server_listening", {
    databasePath: dbPath,
    port,
  });
});
