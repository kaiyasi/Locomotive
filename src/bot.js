import {
  BOT_COMMANDS,
  BUTTONS,
  DELETE_CANCEL_CALLBACK,
  DELETE_CONFIRM_CALLBACK,
  deleteCancelledText,
  deleteConfirmText,
  deleteKeyboard,
  deletedText,
  formatLocationDetails,
  helpText,
  locationRequestText,
  mainKeyboard,
  mapKeyboard,
  noLocationText,
  notePromptText,
  noteSavedText,
  unauthorizedText,
  unknownText,
  welcomeText,
} from "./messages.js";

export function parseCommand(text) {
  const match = String(text).trim().match(/^\/([a-z][a-z0-9_]*)(?:@[a-z0-9_]+)?(?:\s+([\s\S]*))?$/i);
  if (!match) {
    return null;
  }

  return {
    name: match[1].toLowerCase(),
    args: match[2]?.trim() || "",
  };
}

function isClearNote(value) {
  return ["清除", "清空", "clear", "none", "-"].includes(value.trim().toLowerCase());
}

export class ParkingBot {
  constructor(api, store, { allowedUserIds = new Set(), timeZone = "Asia/Taipei" } = {}) {
    this.api = api;
    this.store = store;
    this.allowedUserIds = allowedUserIds;
    this.timeZone = timeZone;
    this.pendingNotes = new Set();
  }

  async handleUpdate(update) {
    if (update?.callback_query) {
      return this.handleCallbackQuery(update.callback_query);
    }

    const message = update?.message;
    const context = this.messageContext(message);
    if (!context) {
      return;
    }
    if (!this.isAllowed(context.userId)) {
      if (message.text || message.location) {
        await this.api.sendMessage(context.chatId, unauthorizedText());
      }
      return;
    }

    if (message.location) {
      return this.handleLocation(context, message.location);
    }
    if (typeof message.text === "string") {
      return this.handleText(context, message.text);
    }
  }

  messageContext(message) {
    if (message?.chat?.type !== "private" || !message.from) {
      return null;
    }

    return { chatId: message.chat.id, userId: message.from.id };
  }

  callbackContext(callbackQuery) {
    if (callbackQuery?.message?.chat?.type !== "private" || !callbackQuery.from) {
      return null;
    }

    return {
      chatId: callbackQuery.message.chat.id,
      userId: callbackQuery.from.id,
      messageId: callbackQuery.message.message_id,
    };
  }

  isAllowed(userId) {
    return this.allowedUserIds.size === 0 || this.allowedUserIds.has(String(userId));
  }

  async handleText(context, text) {
    const command = parseCommand(text);
    if (command) {
      this.pendingNotes.delete(String(context.userId));
      return this.handleCommand(context, command.name, command.args);
    }

    const button = text.trim();
    if (button === BUTTONS.save) {
      this.pendingNotes.delete(String(context.userId));
      return this.sendMenu(context, locationRequestText());
    }
    if (button === BUTTONS.where) {
      this.pendingNotes.delete(String(context.userId));
      return this.handleWhere(context);
    }
    if (button === BUTTONS.note) {
      return this.handleNote(context);
    }
    if (button === BUTTONS.delete) {
      this.pendingNotes.delete(String(context.userId));
      return this.handleDelete(context);
    }
    if (button === BUTTONS.help) {
      this.pendingNotes.delete(String(context.userId));
      return this.sendMenu(context, helpText());
    }

    if (this.pendingNotes.has(String(context.userId))) {
      return this.saveNote(context, text);
    }

    return this.sendMenu(context, unknownText());
  }

  async handleCommand(context, name, args) {
    switch (name) {
      case "start":
      case "help":
        return this.sendMenu(context, name === "start" ? welcomeText() : helpText());
      case "save":
        return this.sendMenu(context, locationRequestText());
      case "where":
        return this.handleWhere(context);
      case "note":
        return this.handleNote(context, args);
      case "delete":
        return this.handleDelete(context);
      default:
        return this.sendMenu(context, unknownText());
    }
  }

  async handleLocation(context, location) {
    const previous = this.store.get(context.userId);
    this.pendingNotes.delete(String(context.userId));
    const record = await this.store.saveLocation(context.userId, location, { chatId: context.chatId });

    await this.api.sendLocation(
      context.chatId,
      record.latitude,
      record.longitude,
      { reply_markup: mapKeyboard(record) },
    );
    return this.sendMenu(
      context,
      formatLocationDetails(record, {
        timeZone: this.timeZone,
        action: previous ? "updated" : "saved",
      }),
    );
  }

  async handleWhere(context) {
    const record = this.store.get(context.userId);
    if (!record) {
      return this.sendMenu(context, noLocationText());
    }

    return this.sendRecord(context, record);
  }

  async sendRecord(context, record) {
    await this.api.sendLocation(
      context.chatId,
      record.latitude,
      record.longitude,
      { reply_markup: mapKeyboard(record) },
    );
    return this.sendMenu(
      context,
      formatLocationDetails(record, { timeZone: this.timeZone, action: "found" }),
    );
  }

  async handleNote(context, args = "") {
    const record = this.store.get(context.userId);
    if (!record) {
      return this.sendMenu(context, noLocationText());
    }

    if (args.trim()) {
      return this.saveNote(context, args);
    }

    this.pendingNotes.add(String(context.userId));
    return this.sendMenu(context, notePromptText());
  }

  async saveNote(context, value) {
    this.pendingNotes.delete(String(context.userId));
    const note = isClearNote(value) ? "" : value;
    const updated = await this.store.updateNote(context.userId, note);
    if (!updated) {
      return this.sendMenu(context, noLocationText());
    }

    return this.sendMenu(context, noteSavedText(updated.note));
  }

  async handleDelete(context) {
    if (!this.store.get(context.userId)) {
      return this.sendMenu(context, noLocationText());
    }

    return this.api.sendMessage(context.chatId, deleteConfirmText(), {
      reply_markup: deleteKeyboard(),
    });
  }

  async handleCallbackQuery(callbackQuery) {
    const context = this.callbackContext(callbackQuery);
    if (!context) {
      return this.api.answerCallbackQuery(callbackQuery.id);
    }
    if (!this.isAllowed(context.userId)) {
      return this.api.answerCallbackQuery(callbackQuery.id, { text: unauthorizedText(), show_alert: true });
    }

    if (callbackQuery.data === DELETE_CANCEL_CALLBACK) {
      await this.api.answerCallbackQuery(callbackQuery.id, { text: deleteCancelledText() });
      return this.clearInlineKeyboard(context);
    }

    if (callbackQuery.data === DELETE_CONFIRM_CALLBACK) {
      const removed = await this.store.remove(context.userId);
      await this.api.answerCallbackQuery(callbackQuery.id, {
        text: removed ? "刪掉了" : "這筆已經不存在了",
      });
      await this.clearInlineKeyboard(context);
      return this.sendMenu(context, removed ? deletedText() : noLocationText());
    }

    return this.api.answerCallbackQuery(callbackQuery.id);
  }

  async clearInlineKeyboard(context) {
    if (!context.messageId) {
      return;
    }

    return this.api.editMessageReplyMarkup(context.chatId, context.messageId, { inline_keyboard: [] });
  }

  sendMenu(context, text) {
    return this.api.sendMessage(context.chatId, text, {
      parse_mode: "HTML",
      reply_markup: mainKeyboard(),
    });
  }

  static commands() {
    return BOT_COMMANDS;
  }
}
