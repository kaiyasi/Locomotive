import { config } from "./config.js";
import { ParkingBot } from "./bot.js";
import { TelegramApi } from "./telegram.js";
import { ParkingStore } from "./store.js";

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  const store = new ParkingStore(config.dataFile);
  await store.init();

  const api = new TelegramApi(config.botToken);
  const bot = new ParkingBot(api, store, {
    allowedUserIds: config.allowedUserIds,
    timeZone: config.timeZone,
  });

  await api.deleteWebhook();
  await api.setMyCommands(ParkingBot.commands());

  let running = true;
  let offset;
  const stop = () => {
    running = false;
    api.abortAll();
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  console.log("Locomotive parking bot is running.");
  try {
    while (running) {
      try {
        const updates = await api.getUpdates(offset, config.pollingTimeoutSeconds);
        for (const update of updates) {
          try {
            await bot.handleUpdate(update);
          } catch (error) {
            console.error(`Failed to handle update ${update.update_id}:`, error);
          }
          offset = update.update_id + 1;
        }
      } catch (error) {
        if (!running && error.name === "AbortError") {
          break;
        }
        console.error("Telegram polling failed:", error.message);
        await sleep(config.retryDelayMs);
      }
    }
  } finally {
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
    api.abortAll();
  }

  console.log("Locomotive parking bot stopped.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
