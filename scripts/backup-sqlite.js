import { Database } from "bun:sqlite";
import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dir, "..");
const dataDir = path.join(rootDir, "data");
const defaultDbPath = path.join(dataDir, "guess-the-tweeter.sqlite");
const dbPath = process.env.DATABASE_PATH ?? defaultDbPath;
const backupDir = process.env.BACKUP_DIR ?? path.join(dataDir, "backups");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(backupDir, `guess-the-tweeter-${timestamp}.sqlite`);

fs.mkdirSync(backupDir, { recursive: true });

const db = new Database(dbPath, { readonly: true });
const bytes = db.serialize();
db.close();

await Bun.write(backupPath, bytes);

console.log(`SQLite backup written: ${backupPath}`);
console.log(`Bytes: ${bytes.byteLength}`);
