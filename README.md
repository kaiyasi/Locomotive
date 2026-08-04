# Locomotive Parking Bot

一個用 Telegram 私聊記錄機車停車位置的 Bot。停好車後分享目前位置，回程時即可從 Bot 取得 Telegram 地圖位置與 Google 地圖連結。

## 需要的環境

- Node.js 20 或更新版本
- Telegram 帳號
- 從 [@BotFather](https://t.me/BotFather) 建立 Bot 並取得 token

## 本機執行

```bash
cp .env.example .env
```

編輯 `.env`，至少填入 `BOT_TOKEN`：

```dotenv
BOT_TOKEN=123456:replace-with-your-token
ALLOWED_USER_IDS=123456789
```

`ALLOWED_USER_IDS` 建議填入自己的 Telegram user ID，使用逗號分隔；留空則任何人都能在私聊使用自己的位置紀錄。群組訊息永遠不會被處理。

啟動：

```bash
npm start
```

開發期間可使用：

```bash
npm run dev
```

## 使用方式

1. 在 Telegram 開啟 Bot，輸入 `/start`。
2. 停好車後按「📍 記錄停車位置」，分享目前位置。
3. 回來時按「🔎 查詢我的位置」。
4. 需要時按「📝 編輯備註」，記下樓層、柱號或附近地標。

也支援 `/save`、`/where`、`/note`、`/delete` 與 `/help`。輸入 `/note 內容` 可以直接設定備註；輸入 `/note 清除` 可以清除備註。

## 資料與隱私

預設資料會寫入 `data/parking.json`。資料檔不會提交到 Git，並會以暫存檔加重新命名的方式寫入，避免寫入中斷留下半份 JSON。每位 Telegram user ID 只會看到自己的紀錄。

若要部署到伺服器，請將 `.env` 與 `DATA_FILE` 放在持久化磁碟，並讓程序持續執行。這個版本使用 Telegram long polling，不需要公開 HTTP 網址或憑證。

## 測試

```bash
npm test
```
