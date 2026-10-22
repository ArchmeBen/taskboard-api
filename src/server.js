import { createApp } from "./app.js";

const port = Number(process.env.PORT) || 3000;
const latencyMs = Number(process.env.LATENCY_MS) || 0;

createApp({ latencyMs }).listen(port, () => {
  console.log(`taskboard-api listening on http://localhost:${port}`);
  if (latencyMs) console.log(`simulating ${latencyMs}ms latency per request`);
});
