export const DELETE_CONFIRM_CALLBACK = "parking:delete:confirm";
export const DELETE_CANCEL_CALLBACK = "parking:delete:cancel";

export const BUTTONS = {
  save: "記一下位置",
  where: "我停哪裡？",
  note: "補個備註",
  delete: "刪掉這筆",
  help: "看一下用法",
};

export const BOT_COMMANDS = [
  { command: "start", description: "開始使用" },
  { command: "save", description: "記下目前位置" },
  { command: "where", description: "找回停車位置" },
  { command: "note", description: "新增停車備註" },
  { command: "delete", description: "刪除停車紀錄" },
  { command: "help", description: "查看使用方式" },
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
    input_field_placeholder: "傳位置，或選個功能",
  };
}

export function mapKeyboard(record) {
  return {
    inline_keyboard: [[{ text: "打開地圖", url: googleMapsUrl(record) }]],
  };
}

export function deleteKeyboard() {
  return {
    inline_keyboard: [[
      { text: "刪掉這筆", callback_data: DELETE_CONFIRM_CALLBACK },
      { text: "先留著", callback_data: DELETE_CANCEL_CALLBACK },
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
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone,
    }).format(new Date(value)).replace(/\u2009/g, " ");
  } catch {
    return value;
  }
}

function formatCoordinate(value) {
  return Number(value).toFixed(6);
}

export function formatLocationDetails(record, { timeZone = "Asia/Taipei", action = "saved" } = {}) {
  const title = {
    saved: "位置記好了",
    updated: "位置更新了",
    found: "這是你上次停車的位置",
  }[action] || "位置記好了";
  const lines = [
    `<b>${title}</b>`,
    "",
    `時間：${escapeHtml(formatTimestamp(record.savedAt, timeZone))}`,
    `座標：${formatCoordinate(record.latitude)}, ${formatCoordinate(record.longitude)}`,
  ];

  if (record.accuracy !== null && record.accuracy !== undefined) {
    lines.push(`誤差：約 ${Math.round(Number(record.accuracy))} 公尺`);
  }
  if (record.note) {
    lines.push(`備註：${escapeHtml(record.note)}`);
  }

  lines.push(
    "",
    action === "found"
      ? `要再找一次，按「${BUTTONS.where}」就好。`
      : "下次停好車，直接再傳一次位置就會更新。",
  );
  return lines.join("\n");
}

export function welcomeText() {
  return [
    "<b>車位記一下</b>",
    `停好車，把目前位置傳給我；回來時按「${BUTTONS.where}」，地圖就會回來。`,
    "",
    `先按「${BUTTONS.save}」開始。`,
  ].join("\n");
}

export function helpText() {
  return [
    "<b>怎麼用</b>",
    "",
    `停好車　按「${BUTTONS.save}」，傳目前位置。`,
    `找車　　按「${BUTTONS.where}」。`,
    `備註　　按「${BUTTONS.note}」，記樓層、柱號或地標。`,
    "重停　　再傳一次位置，就會換成新的。",
    `刪除　　按「${BUTTONS.delete}」。`,
    "",
    "位置只存在自己的紀錄裡。",
  ].join("\n");
}

export function noLocationText() {
  return `還沒有位置可找。停好車後按「${BUTTONS.save}」，把目前位置傳過來就好。`;
}

export function locationRequestText() {
  return "把你現在的位置傳過來就好。";
}

export function deletedText() {
  return "刪掉了。下次停好車，再傳一次位置就好。";
}

export function deleteConfirmText() {
  return "要把這筆停車位置刪掉嗎？";
}

export function deleteCancelledText() {
  return "好，先留著。";
}

export function notePromptText() {
  return "想補什麼？例如：B2、17 號柱旁。\n輸入「清除」可以拿掉備註。";
}

export function noteSavedText(note) {
  return note ? `備註記好了：${escapeHtml(note)}` : "備註清掉了。";
}

export function unauthorizedText() {
  return "這個 Bot 目前只開放給指定帳號使用。";
}

export function unknownText() {
  return "我沒看懂。用下面的選單就好，或輸入 /help 看看。";
}
