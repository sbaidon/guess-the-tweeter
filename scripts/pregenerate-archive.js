import { Database } from "bun:sqlite";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { AUTHORS, CATEGORY_META, LANGUAGE_ORDER, LANGUAGES_BY_ID, MODELS } from "../src/gameData.js";

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
const requestedLanguage = args.get("language") ?? process.env.ARCHIVE_LANGUAGE ?? "en";
const promptVersion = "procedural-archive-v1";
const sourceModel = "codex-procedural";

if (requestedLanguage !== "all" && !LANGUAGES_BY_ID.has(requestedLanguage)) {
  throw new Error(`Unknown --language: ${requestedLanguage}`);
}

const archiveLanguages = requestedLanguage === "all" ? LANGUAGE_ORDER : [requestedLanguage];

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

function ensureGeneratedPostsLanguageColumn() {
  const columns = db.prepare("PRAGMA table_info(generated_posts)").all();
  const hasLanguage = columns.some((column) => column.name === "language");

  if (!hasLanguage) {
    db.exec("ALTER TABLE generated_posts ADD COLUMN language TEXT NOT NULL DEFAULT 'en'");
  }
}

function pick(items, seed) {
  const hash = crypto.createHash("sha256").update(seed).digest("hex").slice(0, 12);
  return items[Number.parseInt(hash, 16) % items.length];
}

function makePost(author, index) {
  const language = archiveLanguages[index % archiveLanguages.length];

  if (language !== "en") {
    return makeLocalizedPost(author, index, language);
  }

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

const localizedParts = {
  es: {
    tech: ["el despliegue", "la abstracción", "el benchmark"],
    politics: ["la encuesta", "la agenda", "el mapa"],
    sports: ["la jugada", "el contrato", "la repetición"],
    celebrities: ["el comunicado", "el look", "la foto"],
    random: ["el grupo vecinal", "la receta", "el embarque"],
    endings: ["y todos fingen que no era obvio", "porque la señal estaba delante de todos", "y el chat lo vio primero"],
  },
  fr: {
    tech: ["le déploiement", "l'abstraction", "le benchmark"],
    politics: ["le sondage", "l'ordre du jour", "la carte"],
    sports: ["l'action", "le contrat", "le ralenti"],
    celebrities: ["le communiqué", "la tenue", "la photo"],
    random: ["le groupe de quartier", "la recette", "l'embarquement"],
    endings: ["et tout le monde prétend que ce n'était pas évident", "parce que le signal était déjà là", "et le chat l'avait vu avant"],
  },
  pt: {
    tech: ["o deploy", "a abstração", "o benchmark"],
    politics: ["a pesquisa", "a pauta", "o mapa"],
    sports: ["a jogada", "o contrato", "o replay"],
    celebrities: ["o comunicado", "o look", "a foto"],
    random: ["o grupo do bairro", "a receita", "o embarque"],
    endings: ["e todo mundo finge que não era óbvio", "porque o sinal estava na frente de todos", "e o chat percebeu primeiro"],
  },
  de: {
    tech: ["das Deployment", "die Abstraktion", "der Benchmark"],
    politics: ["die Umfrage", "die Tagesordnung", "die Karte"],
    sports: ["der Spielzug", "der Vertrag", "die Wiederholung"],
    celebrities: ["die Erklärung", "der Look", "das Foto"],
    random: ["die Nachbarschaftsgruppe", "das Rezept", "das Boarding"],
    endings: ["und alle tun so, als wäre es nicht offensichtlich gewesen", "weil das Signal längst da war", "und der Gruppenchat es zuerst gesehen hat"],
  },
};

function makeLocalizedPost(author, index, language) {
  const parts = localizedParts[language];
  const subject = pick(parts[author.category], `${language}:${author.id}:${index}:subject`);
  const ending = pick(parts.endings, `${language}:${author.id}:${index}:ending`);
  const variants = {
    es: [
      `La clave no es ${subject}; es quién necesita llamarlo normal, ${ending}.`,
      `Cada persona de internet sabe que ${subject} no es el punto. Es el recibo, ${ending}.`,
    ],
    fr: [
      `Le sujet n'est pas ${subject}; c'est qui doit absolument appeler ça normal, ${ending}.`,
      `Tout le monde en ligne sait que ${subject} n'est pas le point. C'est le reçu, ${ending}.`,
    ],
    pt: [
      `O ponto não é ${subject}; é quem precisa chamar isso de normal, ${ending}.`,
      `Toda pessoa da internet sabe que ${subject} não é o assunto. É o recibo, ${ending}.`,
    ],
    de: [
      `Nicht ${subject} ist der Punkt; der Punkt ist, wer es unbedingt normal nennen muss, ${ending}.`,
      `Jeder im Internet weiß: ${subject} ist nicht der Punkt. Es ist der Beleg, ${ending}.`,
    ],
  };

  return pick(variants[language], `${language}:${author.id}:${index}:variant`);
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
  const language = archiveLanguages[index % archiveLanguages.length];
  const text = makePost(author, index);
  const id = `archive:${hashText(`${language}:${author.id}:${model.id}:${index}:${text}`)}`;
  batch.push([
    id,
    author.category,
    author.id,
    model.id,
    text,
    language,
    sourceModel,
    promptVersion,
    "approved",
    JSON.stringify({ index, language, procedural: true }),
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
console.log(`Languages: ${archiveLanguages.join(", ")}`);
console.log(`Database: ${dbPath}`);
