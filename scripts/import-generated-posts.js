import { Database } from "bun:sqlite";
import fs from "node:fs";
import path from "node:path";
import { AUTHORS_BY_ID, CATEGORY_ORDER, LANGUAGES_BY_ID, getAuthorLanguages } from "../src/gameData.js";

const rootDir = path.resolve(import.meta.dir, "..");
const dataDir = path.join(rootDir, "data");
const dbPath = process.env.DATABASE_PATH ?? path.join(dataDir, "guess-the-tweeter.sqlite");
const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value = "true"] = arg.replace(/^--/, "").split("=");
    return [key, value];
  }),
);

const inputPath = args.get("file") ?? process.env.CONTENT_IMPORT_PATH;
const source = args.get("source") ?? process.env.CONTENT_IMPORT_SOURCE ?? "ai";
const includeInactive = args.has("include-inactive") || process.env.CONTENT_IMPORT_INCLUDE_INACTIVE === "true";
const playableCategories = new Set(CATEGORY_ORDER.filter((item) => item !== "all"));
const sourceFilters = new Set(["ai", "procedural", "all"]);

if (!inputPath) {
  throw new Error("Usage: bun scripts/import-generated-posts.js --file=/path/generated-posts.jsonl [--source=ai|procedural|all]");
}

if (!sourceFilters.has(source)) {
  throw new Error(`Invalid source filter: ${source}. Expected one of: ${[...sourceFilters].join(", ")}`);
}

if (!fs.existsSync(inputPath)) {
  throw new Error(`Import file does not exist: ${inputPath}`);
}

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.exec("PRAGMA journal_mode = WAL");
db.exec(`
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

const insertPost = db.prepare(`
  INSERT OR IGNORE INTO generated_posts (
    id,
    category,
    author_id,
    model_id,
    text,
    language,
    source_model,
    prompt_version,
    status,
    raw_response,
    created_at,
    approved_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let read = 0;
let accepted = 0;
let skipped = 0;
let inserted = 0;

const importRows = db.transaction((rows) => {
  let changes = 0;

  for (const row of rows) {
    changes += insertPost.run(
      row.id,
      row.category,
      row.author_id,
      row.model_id,
      row.text,
      row.language,
      row.source_model,
      row.prompt_version,
      row.status,
      row.raw_response ?? null,
      row.created_at,
      row.approved_at ?? null,
    ).changes;
  }

  return changes;
});

const rows = [];
for (const line of fs.readFileSync(inputPath, "utf8").split("\n")) {
  const trimmed = line.trim();

  if (!trimmed) {
    continue;
  }

  read += 1;
  const row = JSON.parse(trimmed);

  if (!matchesSource(row) || (!includeInactive && !isPlayableRow(row))) {
    skipped += 1;
    continue;
  }

  accepted += 1;
  rows.push(row);
}

if (rows.length) {
  inserted = importRows(rows);
}

console.log(`Read rows: ${read}`);
console.log(`Accepted rows: ${accepted}`);
console.log(`Skipped rows: ${skipped}`);
console.log(`Inserted new rows: ${inserted}`);
console.log(`Source filter: ${source}`);
console.log(`Database: ${dbPath}`);

function matchesSource(row) {
  if (source === "all") {
    return true;
  }

  if (source === "procedural") {
    return row.source_model === "codex-procedural";
  }

  return row.source_model !== "codex-procedural";
}

function isPlayableRow(row) {
  const author = AUTHORS_BY_ID.get(row.author_id);
  const rawResponse = String(row.raw_response ?? "");

  return (
    row.status === "approved" &&
    playableCategories.has(row.category) &&
    LANGUAGES_BY_ID.has(row.language) &&
    Boolean(author) &&
    getAuthorLanguages(author).includes(row.language) &&
    !rawResponse.includes('"dryRun":true')
  );
}
