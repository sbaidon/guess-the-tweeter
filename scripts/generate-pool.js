import { spawn } from "node:child_process";
import path from "node:path";

const rootDir = path.resolve(import.meta.dir, "..");

const MODELS = [
  "anthropic/claude-sonnet-4.6",
  "anthropic/claude-opus-4.7",
  "openai/gpt-5.4",
  "google/gemini-3.1-pro-preview",
  "x-ai/grok-4.20",
  "qwen/qwen3.6-plus",
  "deepseek/deepseek-v3.1-terminus",
  "meta-llama/llama-4-maverick",
];

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value = "true"] = arg.replace(/^--/, "").split("=");
    return [key, value];
  }),
);

const categories = (args.get("categories") ?? "tech,politics,sports,celebrities").split(",");
const languages = (args.get("languages") ?? "en,es,fr,pt,de").split(",");
const perCombo = Number(args.get("per") ?? 2);
const dryRun = args.has("dry-run");

const baseEnv = {
  ...process.env,
  AI_BASE_URL: "https://openrouter.ai/api/v1",
};

if (!process.env.AI_API_KEY) {
  throw new Error("Set AI_API_KEY before running.");
}

function runOnce(model, category, language) {
  return new Promise((resolve, reject) => {
    const env = { ...baseEnv, AI_MODEL: model, AI_MODEL_ID: model };
    const cmdArgs = [
      "scripts/generate-posts.js",
      `--count=${perCombo}`,
      `--category=${category}`,
      `--language=${language}`,
    ];
    if (dryRun) cmdArgs.push("--dry-run");
    const child = spawn("bun", cmdArgs, { cwd: rootDir, env, stdio: "inherit" });
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))));
    child.on("error", reject);
  });
}

let totalCalls = 0;
const totalCombos = MODELS.length * categories.length * languages.length;
console.log(
  `Pool generation: ${MODELS.length} models × ${categories.length} cats × ${languages.length} langs × ${perCombo}/combo = ${totalCombos * perCombo} posts target`,
);

for (let i = 0; i < MODELS.length; i += 1) {
  const model = MODELS[i];
  for (const category of categories) {
    for (const language of languages) {
      totalCalls += 1;
      console.log(`\n[${totalCalls}/${totalCombos}] ${model} · ${category} · ${language}`);
      try {
        await runOnce(model, category, language);
      } catch (error) {
        console.error(`  failed ${model} ${category} ${language}: ${error.message}`);
      }
    }
  }
}

console.log("\ndone");
