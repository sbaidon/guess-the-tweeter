import { Database } from "bun:sqlite";
import path from "node:path";
import { AUTHORS_BY_ID, CATEGORY_ORDER, getAuthorLanguages } from "../src/gameData.js";

const rootDir = path.resolve(import.meta.dir, "..");
const dataDir = path.join(rootDir, "data");
const dbPath = process.env.DATABASE_PATH ?? path.join(dataDir, "guess-the-tweeter.sqlite");
const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value = "true"] = arg.replace(/^--/, "").split("=");
    return [key, value];
  }),
);

const language = args.get("language") ?? process.env.REVIEW_LANGUAGE ?? "all";
const category = args.get("category") ?? process.env.REVIEW_CATEGORY ?? "all";
const limit = Math.min(500, Math.max(1, Number(args.get("limit") ?? process.env.REVIEW_LIMIT ?? 50)));
const includeInactive = args.has("include-inactive") || process.env.REVIEW_INCLUDE_INACTIVE === "true";
const playableCategories = new Set(CATEGORY_ORDER.filter((item) => item !== "all"));

const db = new Database(dbPath, { readonly: true });
const filters = ["status = 'approved'"];
const params = [];

if (!includeInactive) {
  filters.push("(raw_response IS NULL OR raw_response NOT LIKE '%\"dryRun\":true%')");
}

if (language !== "all") {
  filters.push("language = ?");
  params.push(language);
}

if (category !== "all") {
  filters.push("category = ?");
  params.push(category);
}

const rows = db
  .prepare(`
    SELECT id, language, category, author_id, model_id, source_model, prompt_version, text, created_at
    FROM generated_posts
    WHERE ${filters.join(" AND ")}
    ORDER BY created_at DESC
    LIMIT ?
  `)
  .all(...params, includeInactive ? limit : limit * 20)
  .filter((row) => {
    if (includeInactive) {
      return true;
    }

    const author = AUTHORS_BY_ID.get(row.author_id);
    return (
      playableCategories.has(row.category) &&
      Boolean(author) &&
      getAuthorLanguages(author).includes(row.language)
    );
  })
  .slice(0, limit);

for (const row of rows) {
  const author = AUTHORS_BY_ID.get(row.author_id);
  console.log([
    `id: ${row.id}`,
    `language: ${row.language}`,
    `category: ${row.category}`,
    `author: ${author ? `${author.name} ${author.handle}` : row.author_id}`,
    `model: ${row.model_id}`,
    `source: ${row.source_model}`,
    `prompt: ${row.prompt_version}`,
    `text: ${row.text}`,
  ].join("\n"));
  console.log("");
}

console.log(`Shown ${rows.length} rows from ${dbPath}`);
