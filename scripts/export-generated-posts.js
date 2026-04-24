import { Database } from "bun:sqlite";
import fs from "node:fs";
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

const outputPath = args.get("out") ?? process.env.CONTENT_EXPORT_PATH;
const language = args.get("language") ?? process.env.CONTENT_EXPORT_LANGUAGE ?? "all";
const category = args.get("category") ?? process.env.CONTENT_EXPORT_CATEGORY ?? "all";
const source = args.get("source") ?? process.env.CONTENT_EXPORT_SOURCE ?? "ai";
const includeInactive = args.has("include-inactive") || process.env.CONTENT_EXPORT_INCLUDE_INACTIVE === "true";
const playableCategories = new Set(CATEGORY_ORDER.filter((item) => item !== "all"));
const sourceFilters = new Set(["ai", "procedural", "all"]);

if (!outputPath) {
  throw new Error("Usage: bun scripts/export-generated-posts.js --out=/path/generated-posts.jsonl [--source=ai|procedural|all]");
}

if (!sourceFilters.has(source)) {
  throw new Error(`Invalid source filter: ${source}. Expected one of: ${[...sourceFilters].join(", ")}`);
}

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

if (source === "ai") {
  filters.push("source_model != 'codex-procedural'");
}

if (source === "procedural") {
  filters.push("source_model = 'codex-procedural'");
}

const rows = db
  .prepare(`
    SELECT id, category, author_id, model_id, text, language, source_model, prompt_version, status, raw_response, created_at, approved_at
    FROM generated_posts
    WHERE ${filters.join(" AND ")}
    ORDER BY created_at ASC
  `)
  .all(...params)
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
  });

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
await Bun.write(outputPath, rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : ""));

console.log(`Exported generated posts: ${rows.length}`);
console.log(`Source filter: ${source}`);
console.log(`Source database: ${dbPath}`);
console.log(`Output: ${outputPath}`);
