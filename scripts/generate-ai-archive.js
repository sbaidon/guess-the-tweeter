import { Database } from "bun:sqlite";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  AUTHORS,
  CATEGORY_ORDER,
  CATEGORY_META,
  LANGUAGES,
  LANGUAGES_BY_ID,
  getAuthorLanguages,
} from "../src/gameData.js";

const rootDir = path.resolve(import.meta.dir, "..");
const dataDir = path.join(rootDir, "data");

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value = "true"] = arg.replace(/^--/, "").split("=");
    return [key, value];
  }),
);

const years = numberArg("years", "AI_ARCHIVE_YEARS", 10);
const count = numberArg("count", "AI_ARCHIVE_COUNT", 24 * 365 * years);
const startIndex = numberArg("start-index", "AI_ARCHIVE_START_INDEX", 0);
const batchSize = numberArg("batch-size", "AI_BATCH_SIZE", 25);
const retries = numberArg("retries", "AI_RETRIES", 3);
const requestedCategory = stringArg("category", "AI_ARCHIVE_CATEGORY", "all");
const requestedLanguage = stringArg("language", "AI_ARCHIVE_LANGUAGE", "all");
const dbPath = process.env.DATABASE_PATH ?? path.join(dataDir, "guess-the-tweeter.sqlite");
const apiKey = process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY ?? process.env.DEEPSEEK_API_KEY ?? "";
const baseUrl = (process.env.AI_BASE_URL ?? "https://openrouter.ai/api/v1").replace(/\/$/, "");
const defaultModelPool = [
  "openai/gpt-5.4-mini",
  "anthropic/claude-haiku-4.5",
  "google/gemini-3-flash-preview",
  "deepseek/deepseek-v3.2",
  "x-ai/grok-4.1-fast",
  "qwen/qwen3.6-plus",
  "mistralai/mistral-large-2512",
  "meta-llama/llama-4-maverick",
];
const requestedModel = stringArg("model", "AI_MODEL", "");
const modelPool = parseModelPool(
  stringArg("models", "AI_MODEL_POOL", requestedModel || defaultModelPool.join(",")),
);
const modelIdOverride = stringArg("model-id", "AI_MODEL_ID", "");
const promptVersion = stringArg("prompt-version", "AI_PROMPT_VERSION", "ai-archive-v1");
const dryRun = args.has("dry-run");
const estimateOnly = args.has("estimate");
const continueOnModelError = args.has("continue-on-error") || (modelPool.length > 1 && !args.has("fail-fast"));
const inputPricePerMillion = numberArg("input-price", "AI_INPUT_PRICE_PER_1M", 0.2);
const outputPricePerMillion = numberArg("output-price", "AI_OUTPUT_PRICE_PER_1M", 1.25);

if (!CATEGORY_ORDER.includes(requestedCategory)) {
  throw new Error(`Unknown category: ${requestedCategory}`);
}

if (requestedLanguage !== "all" && !LANGUAGES_BY_ID.has(requestedLanguage)) {
  throw new Error(`Unknown language: ${requestedLanguage}`);
}

if (!Number.isInteger(count) || count < 1) {
  throw new Error("--count must be a positive integer.");
}

if (!Number.isInteger(startIndex) || startIndex < 0) {
  throw new Error("--start-index must be a non-negative integer.");
}

if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 50) {
  throw new Error("--batch-size must be an integer between 1 and 50.");
}

const eligibleAuthors = AUTHORS.filter(
  (author) =>
    (requestedCategory === "all" || author.category === requestedCategory) &&
    (requestedLanguage === "all" || getAuthorLanguages(author).includes(requestedLanguage)),
);

if (!eligibleAuthors.length) {
  throw new Error(`No authors found for category: ${requestedCategory}`);
}

const cadences = [
  "Everyone will pretend this is complicated because the simple answer embarrasses the room.",
  "I am once again asking adults with budgets to notice the obvious thing in front of them.",
  "The tell is not what happened; the tell is who immediately called it normal.",
  "This is not analysis anymore, it is a stress test for people who own ring lights.",
  "Some of you are treating a warning label like a brand strategy and it shows.",
  "There is always one spreadsheet, one coward, and one person saying optics in a hallway.",
  "The group chat solved this before the professionals finished naming the meeting.",
  "Nobody wants to admit the boring explanation because it ruins three podcasts by breakfast.",
];

const categoryAngles = {
  tech: [
    "framework purity fight",
    "AI launch moral panic",
    "database outage blame game",
    "terminal maximalism",
    "benchmark theater",
    "calendar productivity cult",
    "startup launch timing",
    "abstraction suspicion",
  ],
  politics: [
    "polling crosstab prophecy",
    "committee procedure drama",
    "debate clip overanalysis",
    "patriotic campaign staging",
    "municipal zoning feud",
    "donor lunch tea leaves",
    "turnout math obsession",
    "statement wording autopsy",
  ],
  sports: [
    "legacy debate",
    "salary cap fake trade",
    "locker room mythology",
    "replay review outrage",
    "regular season panic",
    "coach quote interpretation",
    "shoe-based discourse",
    "fan base grievance math",
  ],
  celebrities: [
    "notes app apology",
    "red carpet coded message",
    "chart performance war",
    "nepo baby defense",
    "publicist crisis triage",
    "soft launch detective work",
    "award show body language",
    "caption punctuation analysis",
  ],
  random: [
    "HOA rule enforcement",
    "airport boarding etiquette",
    "recipe substitution complaint",
    "doorbell camera suspicion",
    "neighborhood group panic",
    "parking spot territoriality",
    "coffee order moral collapse",
    "group text escalation",
  ],
};

const dryRunLines = {
  tech: [
    "The migration was never about performance, it was about discovering which teammate thinks config files are a love language.",
    "Every demo looks inevitable until someone asks who owns the pager when the miracle learns recursion.",
  ],
  politics: [
    "The county map did not change, but three consultants changed adjectives and now everyone is calling it momentum.",
    "If you missed item forty-seven, you missed the exact moment a parking dispute became governing philosophy.",
  ],
  sports: [
    "The box score says efficient, but the fourth quarter said everybody in the building started negotiating with fate.",
    "That trade machine screenshot has more fiction than the injury report and somehow less accountability.",
  ],
  celebrities: [
    "The necklace, the caption spacing, and the sudden fondness for beige are not separate events.",
    "That apology was not written to explain anything; it was written to survive screenshots from four fandoms.",
  ],
  random: [
    "If the casserole failed after seven substitutions, perhaps the recipe was not the weak institution here.",
    "Boarding early is not a personality, but standing sideways in the aisle is definitely a confession.",
  ],
};

const estimated = estimateRun();
if (estimateOnly) {
  printEstimate(estimated);
  process.exit(0);
}

if (!dryRun && !apiKey) {
  throw new Error("Set AI_API_KEY, OPENAI_API_KEY, or DEEPSEEK_API_KEY, or pass --dry-run/--estimate.");
}

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

const insertMany = db.transaction((rows) => {
  let inserted = 0;
  for (const row of rows) {
    inserted += insertPost.run(...row).changes;
  }
  return inserted;
});

let inserted = 0;
let attempted = 0;
const startedAt = Date.now();
const modelStats = new Map(modelPool.map((model) => [model, { attempted: 0, failed: 0, inserted: 0 }]));

const endIndex = startIndex + count;

for (let offset = startIndex; offset < endIndex; offset += batchSize) {
  const size = Math.min(batchSize, endIndex - offset);
  const selectedModel = pickModel(offset);
  const batch = buildBatch(offset, size);
  const stats = modelStats.get(selectedModel) ?? { attempted: 0, failed: 0, inserted: 0 };
  let result;

  try {
    result = await generateBatchWithRetry(batch, selectedModel);
  } catch (error) {
    stats.failed += batch.length;
    modelStats.set(selectedModel, stats);

    if (!continueOnModelError) {
      throw error;
    }

    attempted += batch.length;
    console.warn(
      `batch ${offset + batch.length - startIndex}/${count}: model ${selectedModel} failed, continuing: ${error.message}`,
    );
    continue;
  }

  const now = Date.now();
  const rows = result.posts.map((post, postIndex) => {
    const item = batch[postIndex];
    const text = normalizeText(post.text);
    const id = `ai:${hashText(`${result.sourceModel}:${item.author.id}:${text}`)}`;

    return [
      id,
      item.author.category,
      item.author.id,
      modelIdOverride || result.modelId,
      text,
      item.language.id,
      result.sourceModel,
      promptVersion,
      "approved",
      JSON.stringify({
        slot: item.slot,
        batchStart: offset,
        dryRun,
        requestedModel: selectedModel,
        responseModel: result.responseModel,
        usage: result.usage,
      }),
      now + postIndex,
      now + postIndex,
    ];
  });

  const insertedForBatch = insertMany(rows);
  inserted += insertedForBatch;
  attempted += rows.length;
  stats.attempted += rows.length;
  stats.inserted += insertedForBatch;
  modelStats.set(selectedModel, stats);
  console.log(
    `batch ${offset + rows.length - startIndex}/${count}: model ${selectedModel}, inserted ${inserted}, attempted ${attempted}`,
  );
}

console.log(`AI archive candidates requested: ${count}`);
console.log(`Inserted new rows: ${inserted}`);
console.log(`Model pool: ${modelPool.join(", ")}`);
for (const [model, stats] of modelStats) {
  console.log(`Model ${model}: inserted ${stats.inserted}, attempted ${stats.attempted}, failed ${stats.failed}`);
}
console.log(`Elapsed seconds: ${Math.round((Date.now() - startedAt) / 1000)}`);
console.log(`Database: ${dbPath}`);

function stringArg(name, envName, fallback) {
  return args.get(name) ?? process.env[envName] ?? fallback;
}

function numberArg(name, envName, fallback) {
  const value = stringArg(name, envName, String(fallback));
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid number for --${name}: ${value}`);
  }

  return parsed;
}

function parseModelPool(value) {
  const models = String(value)
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  if (!models.length) {
    throw new Error("Model pool is empty. Set --model, --models, AI_MODEL, or AI_MODEL_POOL.");
  }

  return [...new Set(models)];
}

function pickModel(offset) {
  return modelPool[Math.floor(offset / batchSize) % modelPool.length];
}

function buildBatch(offset, size) {
  return Array.from({ length: size }, (_, index) => {
    const globalIndex = offset + index;
    const language = pickLanguage(globalIndex);
    const languageAuthors = eligibleAuthors.filter((author) => getAuthorLanguages(author).includes(language.id));
    const authorPool = languageAuthors.length ? languageAuthors : eligibleAuthors;
    const author = authorPool[globalIndex % authorPool.length];

    return {
      slot: `post-${globalIndex}`,
      author,
      language,
      angle: pick(categoryAngles[author.category], `${author.id}:${globalIndex}:angle`),
      cadence: pick(cadences, `${author.id}:${globalIndex}:cadence`),
    };
  });
}

function buildMessages(batch) {
  return [
    {
      role: "system",
      content: [
        "You write original fictional parody social posts for a public guessing game.",
        "Return strict JSON only. Do not include markdown fences or commentary.",
        "The posts must be safe satire of internet archetypes, not impersonation of real people.",
      ].join(" "),
    },
    {
      role: "user",
      content: JSON.stringify({
        task: "Write one fake tweet-like post for each item.",
        constraints: [
          "18 to 36 words per post.",
          "Write in the target language. Do not add translation notes.",
          "Use a persona that naturally belongs to the target language; do not write a translated version of an English-language poster.",
          "No hashtags.",
          "No emojis.",
          "No real person names, real handles, real company names, or breaking-news references.",
          "No slurs, harassment, threats, sexual content, or protected-class attacks.",
          "Do not mention the persona name, persona handle, model name, or category label.",
          "Make every post concrete and guessable from voice, priorities, and obsessions.",
          "Vary sentence shape. Avoid repeating openings like 'People keep' or 'The thing is'.",
          "Prefer sharp specificity over generic jokes.",
        ],
        outputShape: {
          posts: [
            {
              slot: "copy the input slot exactly",
              text: "string",
            },
          ],
        },
        items: batch.map((item) => ({
          slot: item.slot,
          targetLanguage: {
            id: item.language.id,
            name: item.language.name,
            nativeName: item.language.nativeName,
            instruction: item.language.instruction,
          },
          category: CATEGORY_META[item.author.category].name,
          angle: item.angle,
          cadence: item.cadence,
          persona: {
            name: item.author.name,
            handle: item.author.handle,
            bio: item.author.bio,
            signature: item.author.signature,
          },
        })),
      }),
    },
  ];
}

async function generateBatchWithRetry(batch, selectedModel) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await generateBatch(batch, selectedModel);
    } catch (error) {
      lastError = error;
      if (attempt === retries) {
        break;
      }

      const delayMs = 750 * attempt ** 2;
      console.warn(`batch retry ${attempt}/${retries - 1}: ${error.message}`);
      await sleep(delayMs);
    }
  }

  throw lastError;
}

async function generateBatch(batch, selectedModel) {
  if (dryRun) {
    return {
      posts: batch.map((item) => ({
        slot: item.slot,
        text: dryRunPost(item),
      })),
      modelId: modelIdOverride || selectedModel,
      sourceModel: selectedModel,
      responseModel: selectedModel,
      usage: {
        dryRun: true,
      },
    };
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      ...(baseUrl.includes("openrouter.ai")
        ? {
            "HTTP-Referer": "https://github.com/sbaidon/guess-the-tweeter",
            "X-Title": "Guess the Tweeter",
          }
        : {}),
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: buildMessages(batch),
      response_format: { type: "json_object" },
      temperature: 0.92,
      max_tokens: Math.max(600, batch.length * 90),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Generation failed (${response.status}): ${body}`);
  }

  const raw = await response.json();
  const content = raw.choices?.[0]?.message?.content ?? "";
  const parsed = parseJsonContent(content);
  const posts = validatePosts(parsed.posts, batch);
  const responseModel = raw.model ?? selectedModel;

  return {
    posts,
    modelId: modelIdOverride || responseModel,
    sourceModel: responseModel,
    responseModel,
    usage: raw.usage ?? null,
  };
}

function parseJsonContent(content) {
  const trimmed = String(content).trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(withoutFence);
}

function validatePosts(posts, batch) {
  if (!Array.isArray(posts)) {
    throw new Error("Model response did not include posts array.");
  }

  if (posts.length !== batch.length) {
    throw new Error(`Expected ${batch.length} posts, received ${posts.length}.`);
  }

  const bySlot = new Map(posts.map((post) => [post.slot, post]));
  const normalized = [];
  const seenText = new Set();

  for (const item of batch) {
    const post = bySlot.get(item.slot);
    if (!post) {
      throw new Error(`Missing generated post for slot ${item.slot}.`);
    }

    const text = normalizeText(post.text);
    const wordCount = countWords(text);
    if (wordCount < 18 || wordCount > 38) {
      throw new Error(`Invalid word count (${wordCount}) for ${item.slot}: ${text}`);
    }

    if (/[#]/.test(text)) {
      throw new Error(`Post contains a hashtag marker for ${item.slot}: ${text}`);
    }

    if (containsEmoji(text)) {
      throw new Error(`Post contains emoji for ${item.slot}: ${text}`);
    }

    if (containsForbiddenText(text, item.author)) {
      throw new Error(`Post leaks forbidden text for ${item.slot}: ${text}`);
    }

    const key = text.toLowerCase();
    if (seenText.has(key)) {
      throw new Error(`Duplicate generated post in batch: ${text}`);
    }

    seenText.add(key);
    normalized.push({ slot: item.slot, text });
  }

  return normalized;
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();
}

function countWords(value) {
  return value.split(/\s+/).filter(Boolean).length;
}

function containsEmoji(value) {
  return /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(value);
}

function containsForbiddenText(value, author) {
  const lower = value.toLowerCase();
  const exactBlocked = [
    author.name,
    author.handle,
    modelIdOverride,
    ...modelPool,
    "x.com",
    "twitter",
  ].filter(Boolean);
  const wordBlocked = ["openai", "deepseek", "anthropic", "google", "meta"];

  return (
    exactBlocked.some((term) => lower.includes(String(term).toLowerCase().replace(/^@/, ""))) ||
    wordBlocked.some((term) => new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").test(value))
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dryRunPost(item) {
  const line = pick(dryRunLines[item.author.category], `${item.slot}:line`);
  return `[${item.language.name}] ${line} ${item.cadence}`;
}

function pickLanguage(index) {
  if (requestedLanguage !== "all") {
    return LANGUAGES_BY_ID.get(requestedLanguage);
  }

  return LANGUAGES[index % LANGUAGES.length];
}

function ensureGeneratedPostsLanguageColumn() {
  const columns = db.prepare("PRAGMA table_info(generated_posts)").all();
  const hasLanguage = columns.some((column) => column.name === "language");

  if (!hasLanguage) {
    db.exec("ALTER TABLE generated_posts ADD COLUMN language TEXT NOT NULL DEFAULT 'en'");
  }
}

function hashText(value) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function pick(items, seed) {
  const hash = crypto.createHash("sha256").update(seed).digest("hex").slice(0, 12);
  return items[Number.parseInt(hash, 16) % items.length];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function estimateRun() {
  const sampleBatch = buildBatch(0, Math.min(batchSize, count));
  const sampleMessages = buildMessages(sampleBatch);
  const sampleInputTokens = Math.ceil(JSON.stringify(sampleMessages).length / 4);
  const batches = Math.ceil(count / batchSize);
  const outputTokens = count * 42;
  const inputTokens = sampleInputTokens * batches;
  const standardCost =
    (inputTokens / 1_000_000) * inputPricePerMillion +
    (outputTokens / 1_000_000) * outputPricePerMillion;

  return {
    count,
    batchSize,
    batches,
    sampleInputTokens,
    inputTokens,
    outputTokens,
    standardCost,
  };
}

function printEstimate(estimate) {
  console.log(`Posts: ${estimate.count}`);
  console.log(`Start index: ${startIndex}`);
  console.log(`Batch size: ${estimate.batchSize}`);
  console.log(`Language: ${requestedLanguage}`);
  console.log(`Model pool: ${modelPool.join(", ")}`);
  console.log(`API calls: ${estimate.batches}`);
  console.log(`Estimated input tokens: ${estimate.inputTokens.toLocaleString()}`);
  console.log(`Estimated output tokens: ${estimate.outputTokens.toLocaleString()}`);
  console.log(`Price basis: $${inputPricePerMillion}/1M input, $${outputPricePerMillion}/1M output`);
  console.log(`Estimated standard API cost: $${estimate.standardCost.toFixed(2)}`);
}
