import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    const value = rawValue.replace(/^("|')(.*)\1$/, "$2");
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function integerEnv(name, fallback, { min, max }) {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

loadEnvFile(path.resolve(process.cwd(), ".env"));

const botToken = process.env.BOT_TOKEN?.trim();
if (!botToken) {
  throw new Error("BOT_TOKEN is required. Copy .env.example to .env and add your Telegram bot token.");
}

const allowedUserIds = new Set(
  (process.env.ALLOWED_USER_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);

export const config = {
  botToken,
  allowedUserIds,
  dataFile: path.resolve(process.cwd(), process.env.DATA_FILE || "data/parking.json"),
  pollingTimeoutSeconds: integerEnv("POLLING_TIMEOUT_SECONDS", 30, { min: 1, max: 50 }),
  retryDelayMs: integerEnv("RETRY_DELAY_MS", 2000, { min: 500, max: 30000 }),
  timeZone: process.env.TIME_ZONE?.trim() || "Asia/Taipei",
};
