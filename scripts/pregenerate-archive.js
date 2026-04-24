import { Database } from "bun:sqlite";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { AUTHORS, CATEGORY_META, MODELS } from "../src/gameData.js";

const rootDir = path.resolve(import.meta.dir, "..");
const dataDir = path.join(rootDir, "data");
const dbPath = process.env.DATABASE_PATH ?? path.join(dataDir, "guess-the-tweeter.sqlite");
const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value = "true"] = arg.replace(/^--/, "").split("=");
    return [key, value];
  }),
);

const years = Number(args.get("years") ?? process.env.ARCHIVE_YEARS ?? 10);
const count = Number(args.get("count") ?? process.env.ARCHIVE_COUNT ?? 24 * 365 * years);
const promptVersion = "procedural-archive-v1";
const sourceModel = "codex-procedural";

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);
db.exec("PRAGMA journal_mode = WAL");
db.exec(`
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

const insertPost = db.prepare(`
  INSERT OR IGNORE INTO generated_posts (
    id,
    category,
    author_id,
    model_id,
    text,
    source_model,
    prompt_version,
    status,
    raw_response,
    created_at,
    approved_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const laneParts = {
  tech: {
    subjects: ["the rewrite", "the benchmark", "the deploy", "the model eval", "the framework fight", "the incident review", "the terminal workflow", "the roadmap"],
    pivots: ["is not technical debt", "is not a strategy", "is not a personality", "is not innovation", "is not a platform", "is not a moat"],
    endings: ["it is a group chat with a budget", "it is vibes wearing a pager", "it is a spreadsheet trying to become destiny", "it is two senior engineers disagreeing in public", "it is a demo asking for forgiveness"],
  },
  politics: {
    subjects: ["the poll", "the county map", "the hearing", "the debate clip", "the donor lunch", "the council agenda", "the turnout model", "the statement"],
    pivots: ["is not the story", "is not momentum", "is not a mandate", "is not a gaffe", "is not a coalition", "is not procedure"],
    endings: ["it is three staffers moving commas around", "it is crosstabs begging for adult supervision", "it is access journalism in a blazer", "it is local government becoming theater", "it is a vibes recession with yard signs"],
  },
  sports: {
    subjects: ["the box score", "the trade machine", "the whistle", "the rotation", "the legacy debate", "the cap sheet", "the locker room quote", "the replay angle"],
    pivots: ["is not context", "is not adversity", "is not a dynasty", "is not marginal contact", "is not leadership", "is not efficiency"],
    endings: ["it is a podcast segment with shoes", "it is math pretending not to love drama", "it is a fan base laundering fear", "it is June talking early", "it is grievance in slow motion"],
  },
  celebrities: {
    subjects: ["the outfit", "the apology", "the single", "the paparazzi walk", "the casting rumor", "the unfollow", "the caption", "the afterparty photo"],
    pivots: ["is not random", "is not healing", "is not a soft launch", "is not accountability", "is not a coincidence", "is not merely styling"],
    endings: ["it is a publicist sweating through linen", "it is brand architecture with cheekbones", "it is chart warfare in cursive", "it is a notes app hostage situation", "it is a feud wearing jewelry"],
  },
  random: {
    subjects: ["the van", "the recipe", "the boarding group", "the mulch", "the group text", "the doorbell footage", "the coffee order", "the parking spot"],
    pivots: ["is not normal", "is not neighborly", "is not a substitution", "is not a system", "is not etiquette", "is not a misunderstanding"],
    endings: ["it is civilization fraying at the cul-de-sac", "it is one star with a backstory", "it is a small claims court prequel", "it is airport sociology with luggage", "it is a community alert written by adrenaline"],
  },
};

const intensifiers = [
  "and everybody pretending otherwise has a podcast problem",
  "which is why the minutes matter more than the headline",
  "and I refuse to be gaslit by clean typography",
  "because the spreadsheet has already chosen a villain",
  "and somehow this will become a thread by lunch",
  "which tells you everything about the institution",
  "and no amount of nuance can save the vibes now",
  "because the group chat was right before the experts were",
];

function hashText(value) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function pick(items, seed) {
  const hash = crypto.createHash("sha256").update(seed).digest("hex").slice(0, 12);
  return items[Number.parseInt(hash, 16) % items.length];
}

function makePost(author, index) {
  const parts = laneParts[author.category];
  const subject = pick(parts.subjects, `${author.id}:${index}:subject`);
  const pivot = pick(parts.pivots, `${author.id}:${index}:pivot`);
  const ending = pick(parts.endings, `${author.id}:${index}:ending`);
  const kicker = pick(intensifiers, `${author.id}:${index}:kicker`);
  const genre = CATEGORY_META[author.category].name.toLowerCase();
  const variants = [
    `${subject} ${pivot}. ${ending}, ${kicker}.`,
    `Every ${genre} person knows ${subject} ${pivot}; ${ending}, ${kicker}.`,
    `Once you understand ${subject}, you realize it ${pivot}. Really, ${ending}, ${kicker}.`,
    `People keep calling it ${subject}. Wrong. It ${pivot}; ${ending}, ${kicker}.`,
  ];

  return pick(variants, `${author.id}:${index}:variant`);
}

let inserted = 0;
const now = Date.now();
const insertMany = db.transaction((rows) => {
  for (const row of rows) {
    const result = insertPost.run(...row);
    inserted += result.changes;
  }
});

const batch = [];

for (let index = 0; index < count; index += 1) {
  const author = AUTHORS[index % AUTHORS.length];
  const model = MODELS[index % MODELS.length];
  const text = makePost(author, index);
  const id = `archive:${hashText(`${author.id}:${model.id}:${index}:${text}`)}`;
  batch.push([
    id,
    author.category,
    author.id,
    model.id,
    text,
    sourceModel,
    promptVersion,
    "approved",
    JSON.stringify({ index, procedural: true }),
    now + index,
    now + index,
  ]);

  if (batch.length >= 1000) {
    insertMany(batch.splice(0));
  }
}

if (batch.length) {
  insertMany(batch);
}

console.log(`Generated archive candidates: ${count}`);
console.log(`Inserted new rows: ${inserted}`);
console.log(`Database: ${dbPath}`);
