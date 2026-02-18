import { createApp } from "./app";
import { env } from "./config/env";
import { startIngestionWorker } from "./workers/ingestionWorker";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, "../../uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = createApp();
startIngestionWorker();

app.listen(env.PORT, () => {
  console.log(`DocChat backend running at http://localhost:${env.PORT}`);
});
