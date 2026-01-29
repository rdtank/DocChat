import { createApp } from "./app";
import { env } from "./config/env";
import { startIngestionWorker } from "./workers/ingestionWorker";

const app = createApp();
startIngestionWorker();

app.listen(env.PORT, () => {
  console.log(`DocChat backend running at http://localhost:${env.PORT}`);
});
