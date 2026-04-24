import { Database } from "bun:sqlite";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { AUTHORS, CATEGORY_ORDER, LANGUAGES_BY_ID } from "../src/gameData.js";

const rootDir = path.resolve(import.meta.dir, "..");
const dataDir = path.join(rootDir, "data");
const dbPath = process.env.DATABASE_PATH ?? path.join(dataDir, "guess-the-tweeter.sqlite");
const apiKey = process.env.AI_API_KEY ?? process.env.DEEPSEEK_API_KEY ?? "";
const baseUrl = (process.env.AI_BASE_URL ?? "https://api.deepseek.com").replace(/\/$/, "");
const model = process.env.AI_MODEL ?? "deepseek-chat";
const modelId = process.env.AI_MODEL_ID ?? "deepseek-v3-2";
const promptVersion = "deepseek-parody-v1";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value = "true"] = arg.replace(/^--/, "").split("=");
    return [key, value];
  }),
);

const count = Number(args.get("count") ?? process.env.GENERATE_COUNT ?? 8);
const requestedCategory = args.get("category") ?? process.env.GENERATE_CATEGORY ?? "all";
const requestedLanguage = args.get("language") ?? process.env.GENERATE_LANGUAGE ?? "en";
const dryRun = args.has("dry-run");

if (!CATEGORY_ORDER.includes(requestedCategory)) {
  throw new Error(`Unknown category: ${requestedCategory}`);
}

if (!LANGUAGES_BY_ID.has(requestedLanguage)) {
  throw new Error(`Unknown language: ${requestedLanguage}`);
}

if (!dryRun && !apiKey) {
  throw new Error("Set AI_API_KEY or DEEPSEEK_API_KEY, or pass --dry-run.");
}

const language = LANGUAGES_BY_ID.get(requestedLanguage);

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

function hashText(value) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function ensureGeneratedPostsLanguageColumn() {
  const columns = db.prepare("PRAGMA table_info(generated_posts)").all();
  const hasLanguage = columns.some((column) => column.name === "language");

  if (!hasLanguage) {
    db.exec("ALTER TABLE generated_posts ADD COLUMN language TEXT NOT NULL DEFAULT 'en'");
  }
}

function pickAuthor(index) {
  const eligibleAuthors =
    requestedCategory === "all"
      ? AUTHORS
      : AUTHORS.filter((author) => author.category === requestedCategory);

  return eligibleAuthors[index % eligibleAuthors.length];
}

function buildPrompt(author) {
  return [
    {
      role: "system",
      content:
        "You write concise parody social posts for a guessing game. Return strict JSON only.",
    },
    {
      role: "user",
      content: JSON.stringify({
        task: "Write one fake tweet-like post.",
        constraints: [
          `Write in ${language.name} (${language.nativeName}). ${language.instruction}`,
          "18 to 34 words.",
          "No hashtags.",
          "No emojis.",
          "No real person names.",
          "No slurs or protected-class attacks.",
          "No direct mention of the persona name or handle.",
          "Make it sound like a specific internet archetype, not a generic joke.",
        ],
        outputShape: {
          text: "string",
        },
        persona: {
          category: author.category,
          name: author.name,
          handle: author.handle,
          bio: author.bio,
          signature: author.signature,
        },
      }),
    },
  ];
}

async function generateText(author) {
  if (dryRun) {
    return {
      text: `Dry-run ${language.name} post for ${author.name}: ${dryRunText(language.id)}`,
      raw: { dryRun: true },
    };
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: buildPrompt(author),
      response_format: { type: "json_object" },
      temperature: 0.95,
      max_tokens: 140,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Generation failed (${response.status}): ${body}`);
  }

  const raw = await response.json();
  const content = raw.choices?.[0]?.message?.content ?? "";
  const parsed = JSON.parse(content);
  const text = String(parsed.text ?? "").trim();

  if (text.length < 20) {
    throw new Error(`Generated text was too short: ${content}`);
  }

  return { text, raw };
}

function dryRunText(languageId) {
  const samples = {
    de: "der Take ist zu selbstsicher, seltsam spezifisch und absolut überzeugt, dass der Gruppenchat Geschichte schreibt.",
    en: "the take is overconfident, oddly specific, and absolutely convinced the group chat is history.",
    es: "la opinión llega demasiado segura, raramente específica y convencida de que el chat grupal está haciendo historia.",
    fr: "l'avis est trop sûr de lui, étrangement précis, et persuadé que le groupe privé écrit déjà l'histoire.",
    pt: "a opinião chega confiante demais, estranhamente específica e convencida de que o grupo já virou história.",
  };

  return samples[languageId] ?? samples.en;
}

for (let index = 0; index < count; index += 1) {
  const author = pickAuthor(index);
  const { text, raw } = await generateText(author);
  const now = Date.now();
  const id = `gen:${hashText(`${model}:${author.id}:${text}`)}`;

  insertPost.run(
    id,
    author.category,
    author.id,
    modelId,
    text,
    language.id,
    model,
    promptVersion,
    "approved",
    JSON.stringify(raw),
    now,
    now,
  );

  console.log(`${id} ${author.category}/${author.id}: ${text}`);
}
