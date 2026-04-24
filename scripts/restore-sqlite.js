import fs from "node:fs";
import path from "node:path";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value = "true"] = arg.replace(/^--/, "").split("=");
    return [key, value];
  }),
);

const rootDir = path.resolve(import.meta.dir, "..");
const dataDir = path.join(rootDir, "data");
const dbPath = process.env.DATABASE_PATH ?? path.join(dataDir, "guess-the-tweeter.sqlite");
const backupPath = args.get("file");
const force = args.has("force");

if (!backupPath) {
  throw new Error("Usage: bun run db:restore -- --file=/path/to/backup.sqlite [--force]");
}

if (!fs.existsSync(backupPath)) {
  throw new Error(`Backup file does not exist: ${backupPath}`);
}

if (fs.existsSync(dbPath) && !force) {
  throw new Error(`Refusing to overwrite ${dbPath}. Stop the server and pass --force to restore.`);
}

fs.mkdirSync(path.dirname(dbPath), { recursive: true });
fs.copyFileSync(backupPath, dbPath);

for (const suffix of ["-wal", "-shm"]) {
  const sidecarPath = `${dbPath}${suffix}`;

  if (fs.existsSync(sidecarPath)) {
    fs.rmSync(sidecarPath);
  }
}

console.log(`SQLite database restored from: ${backupPath}`);
console.log(`Destination: ${dbPath}`);
