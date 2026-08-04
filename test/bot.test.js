import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { ParkingBot } from "../src/bot.js";
import { ParkingStore } from "../src/store.js";

class FakeTelegramApi {
  constructor() {
    this.calls = [];
  }

  async sendLocation(...args) {
    this.calls.push({ method: "sendLocation", args });
  }

  async sendMessage(...args) {
    this.calls.push({ method: "sendMessage", args });
  }

  async answerCallbackQuery(...args) {
    this.calls.push({ method: "answerCallbackQuery", args });
  }

  async editMessageReplyMarkup(...args) {
    this.calls.push({ method: "editMessageReplyMarkup", args });
  }
}

function privateLocationUpdate(latitude = 25.033964, longitude = 121.564468) {
  return {
    update_id: 1,
    message: {
      message_id: 10,
      chat: { id: 42, type: "private" },
      from: { id: 42 },
      location: { latitude, longitude },
    },
  };
}

test("ParkingBot records a private-chat location and returns it later", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "locomotive-bot-"));
  t.after(() => rm(directory, { recursive: true, force: true }));

  const store = new ParkingStore(path.join(directory, "parking.json"));
  await store.init();
  const api = new FakeTelegramApi();
  const bot = new ParkingBot(api, store);

  await bot.handleUpdate(privateLocationUpdate());
  await bot.handleUpdate({
    message: {
      chat: { id: 42, type: "private" },
      from: { id: 42 },
      text: "🔎 查詢我的位置",
    },
  });

  assert.equal(api.calls.filter((call) => call.method === "sendLocation").length, 2);
  assert.equal(store.get(42).latitude, 25.033964);
});

test("ParkingBot ignores group messages", async () => {
  const store = new ParkingStore(path.join(os.tmpdir(), `locomotive-group-${Date.now()}.json`));
  await store.init();
  const api = new FakeTelegramApi();
  const bot = new ParkingBot(api, store);

  await bot.handleUpdate({
    message: {
      chat: { id: -100, type: "group" },
      from: { id: 42 },
      location: { latitude: 25, longitude: 121 },
    },
  });

  assert.equal(api.calls.length, 0);
});
