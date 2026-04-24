import { Database } from "bun:sqlite";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  POSTS,
  getAuthorsForMode,
} from "../src/gameData.js";

const rootDir = path.resolve(import.meta.dir, "..");
const dataDir = path.join(rootDir, "data");
const dbPath = process.env.DATABASE_PATH ?? path.join(dataDir, "guess-the-tweeter.sqlite");
const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value = "true"] = arg.replace(/^--/, "").split("=");
    return [key, value];
  }),
);

const publicCategory = "all";
const roundLengthMs = 60 * 60 * 1000;
const lockOffsetMs = 50 * 60 * 1000;
const revealOffsetMs = 55 * 60 * 1000;
const years = Number(args.get("years") ?? process.env.SCHEDULE_YEARS ?? 10);
const roundCount = Number(args.get("rounds") ?? process.env.SCHEDULE_ROUNDS ?? 24 * 365 * years);
const startAt = args.get("start")
  ? Date.parse(args.get("start"))
  : currentHourStart(Date.now());

if (!Number.isFinite(startAt)) {
  throw new Error("Invalid --start. Use an ISO date.");
}

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);
db.exec("PRAGMA journal_mode = WAL");
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
    source_model TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'approved',
    raw_response TEXT,
    created_at INTEGER NOT NULL,
    approved_at INTEGER
  );
`);

const insertRound = db.prepare(`
  INSERT OR IGNORE INTO rounds (
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
`);

const setSetting = db.prepare(`
  INSERT INTO settings (key, value)
  VALUES (?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value
`);

const generatedPosts = db
  .prepare("SELECT id, category, author_id, model_id, text FROM generated_posts WHERE status = 'approved' ORDER BY created_at ASC")
  .all()
  .map((post) => ({
    id: post.id,
    category: post.category,
    authorId: post.author_id,
    modelId: post.model_id,
    text: post.text,
  }));

const playablePosts = [...POSTS, ...generatedPosts];

if (!playablePosts.length) {
  throw new Error("No playable posts found.");
}

function currentHourStart(now = Date.now()) {
  const date = new Date(now);
  date.setUTCMinutes(0, 0, 0);
  return date.getTime();
}

function hashToInt(value) {
  const hash = crypto.createHash("sha256").update(value).digest("hex").slice(0, 12);
  return Number.parseInt(hash, 16);
}

function seededShuffle(items, seed) {
  return [...items].sort((left, right) => {
    const leftHash = hashToInt(`${seed}:${left.id ?? left}`);
    const rightHash = hashToInt(`${seed}:${right.id ?? right}`);
    return leftHash - rightHash;
  });
}

function createRound(post, startsAt, index) {
  const authorPool = getAuthorsForMode(publicCategory, post.category).filter(
    (author) => author.id !== post.authorId,
  );
  const authorChoiceIds = seededShuffle(authorPool, `${startsAt}:authors`)
    .slice(0, 3)
    .map((author) => author.id);
  return [
    `${publicCategory}:hourly:${startsAt}`,
    publicCategory,
    post.id,
    JSON.stringify(seededShuffle([post.authorId, ...authorChoiceIds], `${startsAt}:author-order`)),
    JSON.stringify([]),
    startsAt,
    startsAt + lockOffsetMs,
    startsAt + revealOffsetMs,
    null,
    Date.now() + index,
  ];
}

let inserted = 0;
const insertMany = db.transaction((rows) => {
  for (const row of rows) {
    const result = insertRound.run(...row);
    inserted += result.changes;
  }
});

const batch = [];

for (let index = 0; index < roundCount; index += 1) {
  const startsAt = startAt + index * roundLengthMs;
  const post = playablePosts[index % playablePosts.length];
  batch.push(createRound(post, startsAt, index));

  if (batch.length >= 1000) {
    insertMany(batch.splice(0));
  }
}

if (batch.length) {
  insertMany(batch);
}

const endAt = startAt + roundCount * roundLengthMs;
setSetting.run("contest:start_at", String(startAt));
setSetting.run("contest:end_at", String(endAt));

console.log(`Scheduled rounds requested: ${roundCount}`);
console.log(`Inserted new rounds: ${inserted}`);
console.log(`Contest starts: ${new Date(startAt).toISOString()}`);
console.log(`Contest ends: ${new Date(endAt).toISOString()}`);
console.log(`Playable post pool: ${playablePosts.length}`);
console.log(`Database: ${dbPath}`);
