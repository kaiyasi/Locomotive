export const DELETE_CONFIRM_CALLBACK = "parking:delete:confirm";
export const DELETE_CANCEL_CALLBACK = "parking:delete:cancel";

export const BUTTONS = {
  save: "📍 記錄停車位置",
  where: "🔎 查詢我的位置",
  note: "📝 編輯備註",
  delete: "🗑 清除停車位置",
  help: "ℹ️ 使用說明",
};

export const BOT_COMMANDS = [
  { command: "start", description: "開啟停車定位選單" },
  { command: "save", description: "記錄目前停車位置" },
  { command: "where", description: "查詢已記錄的位置" },
  { command: "note", description: "新增或修改停車備註" },
  { command: "delete", description: "清除已記錄的位置" },
  { command: "help", description: "查看使用說明" },
];

export function mainKeyboard() {
  return {
    keyboard: [
      [{ text: BUTTONS.save, request_location: true }],
      [{ text: BUTTONS.where }, { text: BUTTONS.note }],
      [{ text: BUTTONS.delete }, { text: BUTTONS.help }],
    ],
    resize_keyboard: true,
    is_persistent: true,
    input_field_placeholder: "選擇功能或分享位置",
  };
}

export function mapKeyboard(record) {
  return {
    inline_keyboard: [[{ text: "在 Google 地圖開啟", url: googleMapsUrl(record) }]],
  };
}

export function deleteKeyboard() {
  return {
    inline_keyboard: [[
      { text: "確認清除", callback_data: DELETE_CONFIRM_CALLBACK },
      { text: "取消", callback_data: DELETE_CANCEL_CALLBACK },
    ]],
  };
}

export function googleMapsUrl(record) {
  const query = encodeURIComponent(`${record.latitude},${record.longitude}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatTimestamp(value, timeZone) {
  try {
    return new Intl.DateTimeFormat("zh-TW", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone,
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatCoordinate(value) {
  return Number(value).toFixed(6);
}

export function formatLocationDetails(record, { timeZone = "Asia/Taipei", action = "已記錄" } = {}) {
  const lines = [
    `<b>${action}機車停車位置</b>`,
    `時間：${escapeHtml(formatTimestamp(record.savedAt, timeZone))}`,
    `座標：${formatCoordinate(record.latitude)}, ${formatCoordinate(record.longitude)}`,
  ];

  if (record.accuracy !== null && record.accuracy !== undefined) {
    lines.push(`定位誤差：約 ${Math.round(Number(record.accuracy))} 公尺`);
  }
  if (record.note) {
    lines.push(`備註：${escapeHtml(record.note)}`);
  }

  lines.push("請點下方按鈕開啟地圖。", "", "下次停車時直接分享新的位置，就會更新紀錄。");
  return lines.join("\n");
}

export function welcomeText() {
  return [
    "<b>機車停車定位</b>",
    "把停車位置分享給我，下次回來就能快速找回。",
    "",
    "使用方式：按「📍 記錄停車位置」，再從 Telegram 分享目前位置。",
  ].join("\n");
}

export function helpText() {
  return [
    "<b>使用說明</b>",
    "",
    "1. 停好車後，按「📍 記錄停車位置」並分享位置。",
    "2. 回來時按「🔎 查詢我的位置」取得地圖與座標。",
    "3. 可按「📝 編輯備註」記下樓層、柱號或附近地標。",
    "4. 要重新停車時，直接分享新位置即可覆蓋舊紀錄。",
    "",
    "所有紀錄只依你的 Telegram 帳號保存，不會顯示給其他使用者。",
  ].join("\n");
}

export function noLocationText() {
  return "目前還沒有停車位置。停好車後按「📍 記錄停車位置」並分享位置即可。";
}

export function locationRequestText() {
  return "請按下方「📍 記錄停車位置」分享目前位置。";
}

export function deletedText() {
  return "已清除停車位置紀錄。";
}

export function deleteConfirmText() {
  return "確定要清除目前的停車位置嗎？";
}

export function deleteCancelledText() {
  return "已取消清除。";
}

export function notePromptText() {
  return "請直接輸入備註，例如「B2-17 柱旁」。輸入「清除」可以移除備註。";
}

export function noteSavedText(note) {
  return note ? `已更新備註：${escapeHtml(note)}` : "已清除備註。";
}

export function unauthorizedText() {
  return "這個 Bot 目前不開放你的帳號使用。";
}

export function unknownText() {
  return "請使用下方選單，或輸入 /help 查看可用功能。";
}
