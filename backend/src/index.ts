import { createApp } from "./app";
import { env } from "./config/env";
import { db } from "./db";
import { startIngestionWorker } from "./workers/ingestionWorker";
import fs from "fs";
import path from "path";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");
await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
console.log("Database migrations applied");

const app = createApp();
startIngestionWorker();

app.listen(env.PORT, () => {
  console.log(`DocChat backend running at http://localhost:${env.PORT}`);
});
