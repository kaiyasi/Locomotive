export class TelegramApiError extends Error {
  constructor(message, { code, description, method } = {}) {
    super(message);
    this.name = "TelegramApiError";
    this.code = code;
    this.description = description;
    this.method = method;
  }
}

export class TelegramApi {
  constructor(token, { fetchImpl = globalThis.fetch, baseUrl = "https://api.telegram.org" } = {}) {
    if (typeof fetchImpl !== "function") {
      throw new Error("A fetch implementation is required.");
    }

    this.fetchImpl = fetchImpl;
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.token = token;
    this.controllers = new Set();
  }

  async call(method, payload = {}, { timeoutMs = 15000 } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    this.controllers.add(controller);

    try {
      const response = await this.fetchImpl(`${this.baseUrl}/bot${this.token}/${method}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const raw = await response.text();
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        throw new TelegramApiError(`Telegram returned invalid JSON for ${method}.`, { method });
      }

      if (!response.ok || !body.ok) {
        throw new TelegramApiError(body.description || `Telegram request ${method} failed.`, {
          code: body.error_code ?? response.status,
          description: body.description,
          method,
        });
      }

      return body.result;
    } finally {
      clearTimeout(timer);
      this.controllers.delete(controller);
    }
  }

  getUpdates(offset, timeoutSeconds) {
    const payload = {
      timeout: timeoutSeconds,
      allowed_updates: ["message", "callback_query"],
    };
    if (offset !== undefined) {
      payload.offset = offset;
    }

    return this.call("getUpdates", payload, { timeoutMs: (timeoutSeconds + 10) * 1000 });
  }

  sendMessage(chatId, text, extra = {}) {
    return this.call("sendMessage", { chat_id: chatId, text, ...extra });
  }

  sendLocation(chatId, latitude, longitude, extra = {}) {
    return this.call("sendLocation", {
      chat_id: chatId,
      latitude,
      longitude,
      ...extra,
    });
  }

  answerCallbackQuery(callbackQueryId, extra = {}) {
    return this.call("answerCallbackQuery", { callback_query_id: callbackQueryId, ...extra });
  }

  editMessageReplyMarkup(chatId, messageId, replyMarkup) {
    return this.call("editMessageReplyMarkup", {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: replyMarkup,
    });
  }

  deleteWebhook() {
    return this.call("deleteWebhook", { drop_pending_updates: false });
  }

  setMyCommands(commands) {
    return this.call("setMyCommands", { commands });
  }

  abortAll() {
    for (const controller of this.controllers) {
      controller.abort();
    }
  }
}
