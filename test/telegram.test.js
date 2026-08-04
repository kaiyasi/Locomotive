import test from "node:test";
import assert from "node:assert/strict";
import { TelegramApi, TelegramApiError } from "../src/telegram.js";

test("TelegramApi sends long-polling parameters to Telegram", async () => {
  const requests = [];
  const api = new TelegramApi("test-token", {
    baseUrl: "https://telegram.example/",
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ok: true, result: [] }),
      };
    },
  });

  assert.deepEqual(await api.getUpdates(8, 30), []);
  assert.equal(requests[0].url, "https://telegram.example/bottest-token/getUpdates");
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    timeout: 30,
    offset: 8,
    allowed_updates: ["message", "callback_query"],
  });
});

test("TelegramApi exposes Telegram errors", async () => {
  const api = new TelegramApi("test-token", {
    fetchImpl: async () => ({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ ok: false, error_code: 401, description: "Unauthorized" }),
    }),
  });

  await assert.rejects(api.call("getMe"), (error) => {
    assert.ok(error instanceof TelegramApiError);
    assert.equal(error.code, 401);
    assert.equal(error.method, "getMe");
    return true;
  });
});
