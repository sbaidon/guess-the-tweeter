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
  CATEGORY_ORDER,
  DEFAULT_LANGUAGE,
  LANGUAGE_ORDER,
  LANGUAGES_BY_ID,
  MODELS,
  MODELS_BY_ID,
  POSTS_BY_ID,
  getAuthorLanguages,
  getAuthorsForMode,
  getPostsForCategory,
} from "../src/gameData.js";

type CategoryKey = "all" | "tech" | "politics" | "sports" | "celebrities";
type LanguageKey = string;
type RoundStatus = "open" | "locked" | "revealed";

type Author = {
  id: string;
  category: CategoryKey;
  languages?: LanguageKey[];
  name: string;
  handle: string;
  bio: string;
  signature: string;
};

type Model = {
  id: string;
  name: string;
  blurb: string;
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
  author_guess_text: string | null;
  model_choice_id: string | null;
  stake: number;
  payout: number;
  settled_at: number | null;
  created_at: number;
  updated_at: number;
};

type PlayerRow = {
  identity: string;
  points: number;
  last_topup_at: number;
  created_at: number;
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
  modelChoices: Model[];
  submission: {
    authorId: string | null;
    authorGuess: string | null;
    modelId: string | null;
    stake: number;
    payout: number;
    settled: boolean;
  } | null;
  totals: {
    submissions: number;
    connected: number;
  };
  player?: {
    points: number;
  };
  contest: {
    startsAt: string;
    endsAt: string;
    roundNumber: number;
    totalRounds: number;
  };
  answer?: {
    author: Author | undefined;
    model: Model;
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
  authorGuess?: unknown;
  modelId?: unknown;
  stake?: unknown;
};

type ChannelSocket = WebSocket & {
  category?: LanguageKey;
};

class RequestError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
  ) {
    super(code);
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const distDir = path.join(rootDir, "dist");
const dbPath = process.env.DATABASE_PATH ?? path.join(dataDir, "guess-the-tweeter.sqlite");
const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "127.0.0.1";
const adminToken = process.env.ADMIN_TOKEN ?? "";
const trustProxy = process.env.TRUST_PROXY === "true";
const submissionRateLimitWindowMs = Number(process.env.SUBMISSION_RATE_LIMIT_WINDOW_MS ?? 60_000);
const submissionRateLimitMax = Number(process.env.SUBMISSION_RATE_LIMIT_MAX ?? 20);
const roomSnapshotIntervalMs = Number(process.env.ROOM_SNAPSHOT_INTERVAL_MS ?? 2_000);
const requestLogSampleRate = Number(
  process.env.REQUEST_LOG_SAMPLE_RATE ?? (process.env.NODE_ENV === "production" ? 0 : 1),
);
const maxJsonBodyBytes = Number(process.env.MAX_JSON_BODY_BYTES ?? 8_192);
const publicCategory: CategoryKey = "all";
const defaultLanguage: LanguageKey = DEFAULT_LANGUAGE;
const playableCategories = new Set(CATEGORY_ORDER.filter((category) => category !== "all"));
const openRouterModelOptions: Model[] = [
  {
    id: "openai/gpt-5.4-mini-20260317",
    name: "GPT-5.4 Mini",
    blurb: "Fast, polished, and usually very obedient about structure.",
  },
  {
    id: "deepseek/deepseek-v3.2-20251201",
    name: "DeepSeek V3.2",
    blurb: "Direct, economical, and fond of crisp argument shapes.",
  },
  {
    id: "x-ai/grok-4.1-fast",
    name: "Grok 4.1 Fast",
    blurb: "Punchy, online, and more willing to swing at the bit.",
  },
  {
    id: "qwen/qwen3.6-plus-04-02",
    name: "Qwen 3.6 Plus",
    blurb: "Steady multilingual output with a practical, slightly formal edge.",
  },
  {
    id: "google/gemini-3-flash-preview-20251217",
    name: "Gemini 3 Flash",
    blurb: "Quick, fluent, and happy to make the framing extra tidy.",
  },
  {
    id: "anthropic/claude-4.5-haiku-20251001",
    name: "Claude 4.5 Haiku",
    blurb: "Careful cadence, clean transitions, and restrained punchlines.",
  },
  {
    id: "mistralai/mistral-large-2512",
    name: "Mistral Large",
    blurb: "European polish with a tendency toward declarative confidence.",
  },
  {
    id: "meta-llama/llama-4-maverick-17b-128e-instruct",
    name: "Llama 4 Maverick",
    blurb: "Open-weight swagger with roomy phrasing and broad confidence.",
  },
];
const modelOptionsById = new Map<string, Model>([
  ...(MODELS as Model[]).map((model) => [model.id, model] as const),
  ...openRouterModelOptions.map((model) => [model.id, model] as const),
]);
const modelChoicePool = [...new Set([...(MODELS as Model[]), ...openRouterModelOptions].map((model) => model.id))];
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
    author_guess_text TEXT,
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

  CREATE TABLE IF NOT EXISTS players (
    identity TEXT PRIMARY KEY,
    points INTEGER NOT NULL DEFAULT 100,
    last_topup_at INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
`);

ensureGeneratedPostsLanguageColumn();
ensureSubmissionAuthorGuessColumn();
ensureSubmissionStakeColumns();
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
    INSERT INTO submissions (round_id, client_id, author_choice_id, author_guess_text, model_choice_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(round_id, client_id) DO NOTHING
  `),
  updateSubmission: db.prepare(`
    UPDATE submissions
    SET author_choice_id = ?, author_guess_text = ?, model_choice_id = ?, updated_at = ?
    WHERE round_id = ? AND client_id = ?
  `),
  getRoundTotal: db.prepare("SELECT author_total AS count FROM round_totals WHERE round_id = ?"),
  getAuthorCounts: db.prepare("SELECT author_id, count FROM round_author_counts WHERE round_id = ?"),
  incrementAuthorCount: db.prepare(`
    INSERT INTO round_author_counts (round_id, author_id, count)
    VALUES (?, ?, 1)
    ON CONFLICT(round_id, author_id) DO UPDATE SET count = count + 1
  `),
  decrementAuthorCount: db.prepare(`
    UPDATE round_author_counts
    SET count = MAX(count - 1, 0)
    WHERE round_id = ? AND author_id = ?
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
  getPlayer: db.prepare("SELECT * FROM players WHERE identity = ?"),
  insertPlayer: db.prepare(`
    INSERT INTO players (identity, points, last_topup_at, created_at)
    VALUES (?, ?, 0, ?)
    ON CONFLICT(identity) DO NOTHING
  `),
  setPlayerPoints: db.prepare(
    "UPDATE players SET points = ?, last_topup_at = ? WHERE identity = ?",
  ),
  setSubmissionStake: db.prepare(
    "UPDATE submissions SET stake = ? WHERE round_id = ? AND client_id = ?",
  ),
  getRoundSubmissions: db.prepare("SELECT * FROM submissions WHERE round_id = ?"),
  setSubmissionPayout: db.prepare(
    "UPDATE submissions SET payout = ?, settled_at = ? WHERE round_id = ? AND client_id = ?",
  ),
  sumOpenStakes: db.prepare(
    "SELECT COALESCE(SUM(stake), 0) AS total FROM submissions WHERE client_id = ? AND settled_at IS NULL",
  ),
};

const recordSubmission = db.transaction(
  (
    roundId: string,
    clientId: string,
    authorId: string | undefined,
    authorGuess: string | undefined,
    modelId: string | undefined,
    stake: number | undefined,
    now: number,
  ): boolean => {
    const existingSubmission = statements.getSubmission.get(roundId, clientId) as SubmissionRow | null;
    const nextAuthorId = authorId ?? existingSubmission?.author_choice_id ?? null;
    const nextAuthorGuess = authorGuess ?? existingSubmission?.author_guess_text ?? null;
    const nextModelId = modelId ?? existingSubmission?.model_choice_id ?? null;
    const authorChanged = Boolean(
      authorGuess !== undefined &&
        (nextAuthorGuess !== existingSubmission?.author_guess_text ||
          nextAuthorId !== existingSubmission?.author_choice_id),
    );
    const modelChanged = Boolean(modelId && modelId !== existingSubmission?.model_choice_id);
    const stakeChanged = stake !== undefined && stake !== (existingSubmission?.stake ?? 0);

    if (!authorChanged && !modelChanged && !stakeChanged) {
      return false;
    }

    if (existingSubmission) {
      if (authorChanged || modelChanged) {
        const result = statements.updateSubmission.run(
          nextAuthorId,
          nextAuthorGuess,
          nextModelId,
          now,
          roundId,
          clientId,
        );

        if (result.changes === 0) {
          return false;
        }
      }

      if (stakeChanged) {
        statements.setSubmissionStake.run(stake as number, roundId, clientId);
      }

      if (authorChanged) {
        if (existingSubmission.author_choice_id && existingSubmission.author_choice_id !== nextAuthorId) {
          statements.decrementAuthorCount.run(roundId, existingSubmission.author_choice_id);
        }

        if (!existingSubmission.author_guess_text) {
          statements.incrementRoundTotal.run(roundId);
        }

        if (nextAuthorId && nextAuthorId !== existingSubmission.author_choice_id) {
          statements.incrementAuthorCount.run(roundId, nextAuthorId);
        }
      }

      return true;
    }

    const result = statements.insertSubmission.run(
      roundId,
      clientId,
      nextAuthorId,
      nextAuthorGuess,
      nextModelId,
      now,
      now,
    );

    if (result.changes === 0) {
      return false;
    }

    if (stake !== undefined && stake > 0) {
      statements.setSubmissionStake.run(stake, roundId, clientId);
    }

    if (nextAuthorGuess) {
      if (nextAuthorId) {
        statements.incrementAuthorCount.run(roundId, nextAuthorId);
      }

      statements.incrementRoundTotal.run(roundId);
    }

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

function postAuthorMatchesLanguage(post: PlayablePost, language: LanguageKey): boolean {
  const author = AUTHORS_BY_ID.get(post.authorId) as Author | undefined;
  return Boolean(author && getAuthorLanguages(author).includes(language));
}

function roundLanguage(round: RoundRow): LanguageKey {
  const [language] = String(round.id).split(":");
  return LANGUAGES_BY_ID.has(language) ? language : defaultLanguage;
}

function getGeneratedPostsForCategory(category: CategoryKey): PlayablePost[] {
  return (statements.getGeneratedPosts.all() as GeneratedPostRow[])
    .filter((post) => playableCategories.has(post.category))
    .filter((post) => category === "all" || post.category === category)
    .map(generatedRowToPost);
}

function getPlayablePostsForCategory(category: CategoryKey): PlayablePost[] {
  return [...getPostsForCategory(category), ...getGeneratedPostsForCategory(category)] as PlayablePost[];
}

function getPlayablePostsForLanguage(category: CategoryKey, language: LanguageKey): PlayablePost[] {
  return getPlayablePostsForCategory(category).filter(
    (post) => postLanguage(post) === language && postAuthorMatchesLanguage(post, language),
  );
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

function getModelOption(modelId: string): Model {
  const knownModel = MODELS_BY_ID.get(modelId) as Model | undefined;

  if (knownModel) {
    return knownModel;
  }

  const knownOpenRouterModel = modelOptionsById.get(modelId);

  if (knownOpenRouterModel) {
    return knownOpenRouterModel;
  }

  return {
    id: modelId,
    name: formatModelName(modelId),
    blurb: "A generated-content model recorded with this post.",
  };
}

function formatModelName(modelId: string): string {
  const [, modelName = modelId] = modelId.split("/");
  return modelName
    .replace(/-\d{8}$/u, "")
    .split("-")
    .filter(Boolean)
    .map((part) => (/^\d/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(" ");
}

function getModelChoiceIds(round: RoundRow, post: PlayablePost): string[] {
  const storedChoiceIds = parseChoices(round.model_choice_ids);

  if (storedChoiceIds.length) {
    return [...new Set([post.modelId, ...storedChoiceIds])];
  }

  const distractors = seededShuffle(
    modelChoicePool.filter((modelId) => modelId !== post.modelId),
    `${round.id}:models`,
  ).slice(0, 3);

  return seededShuffle([post.modelId, ...distractors], `${round.id}:model-order`);
}

function getAllowedAuthorIds(round: RoundRow, post: PlayablePost, language: LanguageKey): string[] {
  const authors = getAuthorsForMode(round.category, post.category, language) as Author[];
  return [...new Set([post.authorId, ...authors.map((author) => author.id)])].filter((authorId) => {
    const author = AUTHORS_BY_ID.get(authorId) as Author | undefined;
    return Boolean(author && getAuthorLanguages(author).includes(language));
  });
}

function normalizeAuthorGuess(value: string): string {
  return value.trim().replace(/^@/u, "").toLowerCase();
}

function resolveAuthorGuess(value: string, authorIds: Set<string>): string | undefined {
  const normalized = normalizeAuthorGuess(value);

  if (!normalized) {
    return undefined;
  }

  for (const authorId of authorIds) {
    const author = AUTHORS_BY_ID.get(authorId) as Author | undefined;

    if (
      author &&
      (normalizeAuthorGuess(author.handle) === normalized || normalizeAuthorGuess(author.name) === normalized)
    ) {
      return author.id;
    }
  }

  return undefined;
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
  const authorPool = (getAuthorsForMode(category, post.category, language) as Author[]).filter(
    (author) => author.id !== post.authorId,
  );
  const authorChoiceIds = seededShuffle(authorPool, `${category}:${language}:${startsAt}:authors`)
    .slice(0, 3)
    .map((author) => author.id);

  return {
    id: `${language}:${category}:${idPrefix}:${startsAt}`,
    category,
    postId: post.id,
    authorChoiceIds: JSON.stringify(
      seededShuffle([post.authorId, ...authorChoiceIds], `${category}:${language}:${startsAt}:author-order`),
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

    if (
      existingPost &&
      playableCategories.has(existingPost.category) &&
      postLanguage(existingPost) === language &&
      postAuthorMatchesLanguage(existingPost, language)
    ) {
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

function getAuthorCounts(roundId: string): Map<string, number> {
  const rows = statements.getAuthorCounts.all(roundId) as AuthorCountRow[];
  return new Map(rows.map((row) => [row.author_id, row.count]));
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

  if (status === "revealed") {
    settleRound(round.id);
  }

  const language = roundLanguage(round);
  const authorChoiceIds = getAllowedAuthorIds(round, post, language);
  const modelChoiceIds = getModelChoiceIds(round, post);
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
    modelChoices: modelChoiceIds.map(getModelOption),
    submission: submission
      ? {
          authorId: submission.author_choice_id,
          authorGuess:
            submission.author_guess_text ??
            (submission.author_choice_id
              ? ((AUTHORS_BY_ID.get(submission.author_choice_id) as Author | undefined)?.handle ?? null)
              : null),
          modelId: submission.model_choice_id,
          stake: submission.stake ?? 0,
          payout: submission.payout ?? 0,
          settled: submission.settled_at !== null && submission.settled_at !== undefined,
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

  if (clientId) {
    const player = ensurePlayer(clientId);
    payload.player = { points: player.points };
  }

  if (status === "revealed") {
    const authorCounts = getAuthorCounts(round.id);
    const resultAuthorIds = [
      ...new Set([
        post.authorId,
        ...[...authorCounts.entries()]
          .filter(([, count]) => count > 0)
          .sort(([, leftCount], [, rightCount]) => rightCount - leftCount)
          .map(([authorId]) => authorId),
      ]),
    ].filter((authorId) => authorChoiceIds.includes(authorId));
    const winnerCount = authorCounts.get(post.authorId) ?? 0;

    payload.answer = {
      author: AUTHORS_BY_ID.get(post.authorId) as Author | undefined,
      model: getModelOption(post.modelId),
    };
    payload.results = {
      authorTotal,
      winnerCount,
      winnerPercentage: authorTotal ? Math.round((winnerCount / authorTotal) * 100) : 0,
      authors: resultAuthorIds.map((authorId) => ({
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

const STARTING_POINTS = 100;
const TOPUP_AMOUNT = 25;

function ensurePlayer(clientId: string): PlayerRow {
  const identity = `uuid:${clientId}`;
  const existing = statements.getPlayer.get(identity) as PlayerRow | null;
  if (existing) {
    if (existing.points <= 0) {
      const now = Date.now();
      statements.setPlayerPoints.run(TOPUP_AMOUNT, now, identity);
      return { ...existing, points: TOPUP_AMOUNT, last_topup_at: now };
    }
    return existing;
  }
  const now = Date.now();
  statements.insertPlayer.run(identity, STARTING_POINTS, now);
  return statements.getPlayer.get(identity) as PlayerRow;
}

function computePayout(stake: number, authorCorrect: boolean, modelCorrect: boolean, freeformBonus: boolean): number {
  if (stake <= 0) {
    return 0;
  }
  if (authorCorrect && modelCorrect) {
    return stake + (freeformBonus ? Math.floor(stake / 2) : 0);
  }
  if (authorCorrect) {
    return Math.floor(stake / 4) + (freeformBonus ? Math.floor(stake / 2) : 0);
  }
  if (modelCorrect) {
    return Math.floor(stake / 4);
  }
  return -stake;
}

function settleRound(roundId: string): void {
  const round = statements.getRound.get(roundId) as RoundRow | null;
  if (!round) return;
  const post = getPlayablePost(round.post_id);
  if (!post) return;
  const language = roundLanguage(round);
  const correctAuthor = AUTHORS_BY_ID.get(post.authorId) as Author | undefined;
  const submissions = statements.getRoundSubmissions.all(roundId) as SubmissionRow[];

  for (const submission of submissions) {
    if (submission.settled_at) continue;
    const authorCorrect = submission.author_choice_id === post.authorId;
    const modelCorrect = submission.model_choice_id === post.modelId;
    const freeformBonus = Boolean(
      authorCorrect &&
        submission.author_guess_text &&
        correctAuthor &&
        submission.author_guess_text.replace(/^@/, "").trim().toLowerCase() ===
          correctAuthor.handle.replace(/^@/, "").trim().toLowerCase(),
    );
    const payout = computePayout(submission.stake ?? 0, authorCorrect, modelCorrect, freeformBonus);
    const player = ensurePlayer(submission.client_id);
    const nextPoints = Math.max(0, player.points + payout);
    statements.setPlayerPoints.run(nextPoints, player.last_topup_at, `uuid:${submission.client_id}`);
    statements.setSubmissionPayout.run(payout, Date.now(), roundId, submission.client_id);
  }
}

function ensureSubmissionStakeColumns(): void {
  const columns = db.prepare("PRAGMA table_info(submissions)").all() as TableInfoRow[];
  const names = new Set(columns.map((column) => column.name));

  if (!names.has("stake")) {
    db.exec("ALTER TABLE submissions ADD COLUMN stake INTEGER NOT NULL DEFAULT 0");
  }
  if (!names.has("settled_at")) {
    db.exec("ALTER TABLE submissions ADD COLUMN settled_at INTEGER");
  }
  if (!names.has("payout")) {
    db.exec("ALTER TABLE submissions ADD COLUMN payout INTEGER NOT NULL DEFAULT 0");
  }
}

function ensureSubmissionAuthorGuessColumn(): void {
  const columns = db.prepare("PRAGMA table_info(submissions)").all() as TableInfoRow[];
  const hasAuthorGuessText = columns.some((column) => column.name === "author_guess_text");

  if (!hasAuthorGuessText) {
    db.exec("ALTER TABLE submissions ADD COLUMN author_guess_text TEXT");
  }

  const rows = db
    .prepare(`
      SELECT round_id, client_id, author_choice_id
      FROM submissions
      WHERE author_guess_text IS NULL AND author_choice_id IS NOT NULL
    `)
    .all() as Array<{ round_id: string; client_id: string; author_choice_id: string }>;
  const updateGuessText = db.prepare("UPDATE submissions SET author_guess_text = ? WHERE round_id = ? AND client_id = ?");

  for (const row of rows) {
    const author = AUTHORS_BY_ID.get(row.author_choice_id) as Author | undefined;

    if (author) {
      updateGuessText.run(author.handle, row.round_id, row.client_id);
    }
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

function logWarn(message: string, meta: Record<string, unknown> = {}): void {
  console.warn(JSON.stringify({ level: "warn", message, time: new Date().toISOString(), ...meta }));
}

function getClientIp(request: IncomingMessage): string {
  const forwardedFor = request.headers["x-forwarded-for"];

  if (trustProxy && typeof forwardedFor === "string") {
    return forwardedFor.split(",")[0]?.trim() || request.socket.remoteAddress || "unknown";
  }

  return request.socket.remoteAddress || "unknown";
}

function safeTokenEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.byteLength === rightBuffer.byteLength && crypto.timingSafeEqual(leftBuffer, rightBuffer);
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

function payloadTooLarge(response: ServerResponse): void {
  json(response, 413, { error: "payload_too_large" });
}

function unsupportedMediaType(response: ServerResponse): void {
  json(response, 415, { error: "unsupported_media_type" });
}

function isJsonRequest(request: IncomingMessage): boolean {
  const contentType = request.headers["content-type"];
  return typeof contentType === "string" && contentType.toLowerCase().includes("application/json");
}

function isBodyTooLarge(request: IncomingMessage): boolean {
  const contentLength = request.headers["content-length"];

  if (typeof contentLength !== "string") {
    return false;
  }

  const bodyBytes = Number(contentLength);
  return Number.isFinite(bodyBytes) && bodyBytes > maxJsonBodyBytes;
}

async function readJson(request: IncomingMessage): Promise<SubmissionBody> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.byteLength;

    if (totalBytes > maxJsonBodyBytes) {
      throw new RequestError(413, "payload_too_large");
    }

    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function requireAdmin(request: IncomingMessage, response: ServerResponse): boolean {
  const providedToken = request.headers["x-admin-token"];

  if (
    adminToken &&
    typeof providedToken === "string" &&
    safeTokenEquals(providedToken, adminToken)
  ) {
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

    if (!isJsonRequest(request)) {
      return unsupportedMediaType(response);
    }

    if (isBodyTooLarge(request)) {
      return payloadTooLarge(response);
    }

    if (computeStatus(round) !== "open") {
      return json(response, 409, { error: "round_closed" });
    }

    const body = await readJson(request);
    const post = getPlayablePost(round.post_id);

    if (!post) {
      return notFound(response);
    }

    const language = roundLanguage(round);
    const authorChoiceIds = new Set(getAllowedAuthorIds(round, post, language));
    const modelChoiceIds = new Set(getModelChoiceIds(round, post));

    if (!body.clientId || typeof body.clientId !== "string") {
      return badRequest(response, "Missing clientId.");
    }

    if (body.clientId.length > 128) {
      return badRequest(response, "clientId is too long.");
    }

    if (!checkSubmissionRateLimit(request, body.clientId)) {
      return json(response, 429, { error: "rate_limited" });
    }

    const rawAuthorGuess = typeof body.authorGuess === "string" ? body.authorGuess.trim() : "";
    const authorGuess = rawAuthorGuess || undefined;
    const authorId = authorGuess
      ? resolveAuthorGuess(authorGuess, authorChoiceIds)
      : typeof body.authorId === "string"
        ? body.authorId
        : undefined;
    const modelId = typeof body.modelId === "string" ? body.modelId : undefined;
    const stakeProvided = typeof body.stake === "number" && Number.isFinite(body.stake);
    const stake = stakeProvided ? Math.max(0, Math.floor(body.stake as number)) : undefined;

    if (!authorGuess && !authorId && !modelId && stake === undefined) {
      return badRequest(response, "Missing pick.");
    }

    if (!authorGuess && authorId && !authorChoiceIds.has(authorId)) {
      return badRequest(response, "Invalid author choice.");
    }

    if (modelId && !modelChoiceIds.has(modelId)) {
      return badRequest(response, "Invalid model choice.");
    }

    if (stake !== undefined) {
      const player = ensurePlayer(body.clientId);
      const existingStake =
        (statements.getSubmission.get(roundId, body.clientId) as SubmissionRow | null)?.stake ?? 0;
      const otherOpenStakes =
        ((statements.sumOpenStakes.get(body.clientId) as { total: number } | undefined)?.total ?? 0) -
        existingStake;
      if (stake + otherOpenStakes > player.points) {
        return badRequest(response, "Stake exceeds balance.");
      }
    }

    const now = Date.now();
    const recorded = recordSubmission(roundId, body.clientId, authorId, authorGuess, modelId, stake, now);

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
    settleRound(roundId);
    markRoomDirty(roundLanguage(round));
    logInfo("admin_action", { action: "reveal", roundId, ip: getClientIp(request) });
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
    logInfo("admin_action", { action: "reset", roundId, ip: getClientIp(request) });
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
    const shouldSample = requestLogSampleRate > 0 && Math.random() < requestLogSampleRate;
    const shouldLog = response.statusCode >= 400 || shouldSample;

    if (shouldLog && (pathname === "/healthz" || pathname.startsWith("/api/"))) {
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
    if (error instanceof RequestError) {
      if (error.statusCode === 413) {
        return payloadTooLarge(response);
      }

      return json(response, error.statusCode, { error: error.code });
    }

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

if (!adminToken) {
  if (process.env.NODE_ENV === "production") {
    logError("startup_missing_admin_token", new Error("ADMIN_TOKEN must be set in production"));
    process.exit(1);
  }
  logWarn("startup_admin_token_unset", {
    note: "ADMIN_TOKEN is empty; admin endpoints will reject all requests",
  });
}

ensureContestSettings();
for (const language of LANGUAGE_ORDER) {
  ensureCurrentRoundForLanguage(publicCategory, language);
}

setInterval(pruneSubmissionRateLimits, submissionRateLimitWindowMs).unref?.();
setInterval(flushRoomUpdates, roomSnapshotIntervalMs).unref?.();

server.listen(port, host, () => {
  logInfo("server_listening", {
    databasePath: dbPath,
    host,
    port,
  });
});
