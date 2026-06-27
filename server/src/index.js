// index.js -- AuraRoutine API gateway
import express from "express";
import cors from "cors";
import dotenvLoad from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { routineRouter } from "./routes/routine.js";
import { analyticsRouter } from "./routes/analytics.js";

// Minimal .env loader (avoids adding the dotenv dependency just for this).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");
if (dotenvLoad.existsSync(envPath)) {
  const lines = dotenvLoad.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "aura-routine-api" });
});

app.use("/api/routine", routineRouter);
app.use("/api/analytics", analyticsRouter);

app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`AuraRoutine API listening on http://localhost:${PORT}`);
});
